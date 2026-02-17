import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  parseTTSUplink,
  computeStatus,
  computeWaterLevel,
  verifyWebhookSignature,
} from "./parser";

admin.initializeApp();
const db = admin.firestore();

// ─── Config ─────────────────────────────────────────────────────────────
const RETENTION_DAYS = 7;
const ALERT_RETENTION_DAYS = 90;
const MIN_INTERVAL_MS = 4000; // Throttle: ignore readings < 4s apart per device
const DEFAULT_THRESHOLDS = { warnCm: 30, alertCm: 60 };
const DEFAULT_MOUNT_HEIGHT_CM = 200;

// ─── In-memory last-seen cache (per Cloud Function instance) ────────────
// This avoids a Firestore read on every request to check the last timestamp.
// Trade-off: after a cold start, the first duplicate may slip through.
const lastSeenCache = new Map<string, number>();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTTPS ENDPOINT: Ingest webhook from The Things Stack
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ingest = functions
  .runWith({
    memory: "256MB",
    maxInstances: 10, // Cap to control costs
    timeoutSeconds: 30,
  })
  .https.onRequest(async (req, res) => {
    // 1. Only accept POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // 2. Verify webhook signature (optional but recommended)
    const webhookSecret = process.env.WEBHOOK_SECRET || "";
    if (webhookSecret) {
      const signature = req.headers["x-webhook-signature"] as string | undefined;
      const rawBody = JSON.stringify(req.body);
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.warn("Webhook signature verification failed");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
    }

    // 3. Parse the TTS payload
    const result = parseTTSUplink(req.body);
    if (!result.ok) {
      console.warn(`Parse error: ${result.error}`);
      res.status(400).json({ error: result.error });
      return;
    }

    const { payload, rssi, snr, raw } = result;
    const now = Date.now();

    // 4. Throttle: skip if we received a reading from this device very recently
    const lastSeen = lastSeenCache.get(payload.deviceId);
    if (lastSeen && now - lastSeen < MIN_INTERVAL_MS) {
      res.status(200).json({ status: "throttled" });
      return;
    }
    lastSeenCache.set(payload.deviceId, now);

    try {
      // 5. Get or create the device document
      const deviceRef = db.collection("devices").doc(payload.deviceId);
      const deviceSnap = await deviceRef.get();
      const deviceData = deviceSnap.data();

      const mountHeight = deviceData?.mountHeightCm ?? DEFAULT_MOUNT_HEIGHT_CM;
      const thresholds = deviceData?.thresholds ?? DEFAULT_THRESHOLDS;

      // 6. Compute water level and status server-side
      const waterLevelCm = computeWaterLevel(mountHeight, payload.distanceCm);
      const computedStatus = computeStatus(waterLevelCm, thresholds);
      const prevStatus = deviceData?.status ?? "OK";

      // 7. Build the TTL timestamp for retention
      const ttlDate = new Date(now + RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const serverTs = admin.firestore.FieldValue.serverTimestamp();

      // 8. Batch write: update device + insert reading (+ optional alert)
      const batch = db.batch();

      // 8a. Upsert device latest state
      if (deviceSnap.exists) {
        batch.update(deviceRef, {
          distanceCm: payload.distanceCm,
          waterLevelCm,
          batteryV: payload.batteryV,
          status: computedStatus,
          prevStatus,
          lastSeen: serverTs,
          rssi,
          snr,
          notes: payload.notes ?? "",
          updatedAt: serverTs,
        });
      } else {
        // First time seeing this device → create with defaults
        batch.set(deviceRef, {
          deviceId: payload.deviceId,
          name: payload.deviceId, // admin can rename later
          lat: 0,
          lng: 0,
          distanceCm: payload.distanceCm,
          waterLevelCm,
          batteryV: payload.batteryV,
          status: computedStatus,
          prevStatus: "OK",
          lastSeen: serverTs,
          rssi,
          snr,
          mountHeightCm: DEFAULT_MOUNT_HEIGHT_CM,
          thresholds: DEFAULT_THRESHOLDS,
          notes: "",
          createdAt: serverTs,
          updatedAt: serverTs,
        });
      }

      // 8b. Insert raw reading
      const readingRef = db.collection("readings").doc();
      batch.set(readingRef, {
        deviceId: payload.deviceId,
        distanceCm: payload.distanceCm,
        waterLevelCm,
        batteryV: payload.batteryV,
        status: computedStatus,
        rssi,
        snr,
        raw,
        receivedAt: serverTs,
        deviceTimestamp: payload.timestamp,
        _ttl: admin.firestore.Timestamp.fromDate(ttlDate),
      });

      // 8c. If status changed, log an alert
      if (computedStatus !== prevStatus) {
        const alertRef = db.collection("alerts").doc();
        const alertTtl = new Date(now + ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        batch.set(alertRef, {
          deviceId: payload.deviceId,
          deviceName: deviceData?.name ?? payload.deviceId,
          fromStatus: prevStatus,
          toStatus: computedStatus,
          waterLevelCm,
          triggeredAt: serverTs,
          acknowledged: false,
          _ttl: admin.firestore.Timestamp.fromDate(alertTtl),
        });

        // Optional: send FCM push notification
        if (computedStatus === "ALERT") {
          await sendAlertNotification(
            payload.deviceId,
            deviceData?.name ?? payload.deviceId,
            waterLevelCm
          );
        }
      }

      await batch.commit();

      res.status(200).json({
        status: "ok",
        deviceId: payload.deviceId,
        computedStatus,
        waterLevelCm,
      });
    } catch (err) {
      console.error("Ingest error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCHEDULED: Cleanup expired readings and alerts (daily at 3 AM UTC)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const cleanupExpired = functions
  .runWith({ memory: "256MB", timeoutSeconds: 300 })
  .pubsub.schedule("0 3 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    let totalDeleted = 0;

    for (const collection of ["readings", "alerts"]) {
      let hasMore = true;
      while (hasMore) {
        const expired = await db
          .collection(collection)
          .where("_ttl", "<", now)
          .limit(500)
          .get();

        if (expired.empty) {
          hasMore = false;
          break;
        }

        const batch = db.batch();
        expired.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += expired.size;
      }
    }

    console.log(`Cleanup complete: deleted ${totalDeleted} expired documents`);
  });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FCM Push Notification (optional)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendAlertNotification(
  deviceId: string,
  deviceName: string,
  waterLevelCm: number
): Promise<void> {
  try {
    // Send to "alerts" topic — admin users subscribe to this topic
    await admin.messaging().send({
      topic: "flood-alerts",
      notification: {
        title: `⚠️ FLOOD ALERT: ${deviceName}`,
        body: `Water level at ${waterLevelCm} cm. Immediate attention needed.`,
      },
      data: {
        deviceId,
        waterLevelCm: String(waterLevelCm),
        type: "FLOOD_ALERT",
      },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
    console.log(`Push notification sent for ${deviceId}`);
  } catch (err) {
    // Don't fail the ingest if push fails
    console.warn("FCM send failed:", err);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTTPS: Simulate device packet (for testing only — protect in production)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const simulateDevice = functions
  .runWith({ memory: "128MB" })
  .https.onRequest(async (req, res) => {
    // Only allow in emulator or with admin auth
    if (process.env.FUNCTIONS_EMULATOR !== "true") {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      try {
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        if (!decoded.admin) {
          res.status(403).json({ error: "Admin only" });
          return;
        }
      } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
    }

    const deviceId = req.query.deviceId as string || "test-001";
    const waterLevel = Number(req.query.waterLevel) || Math.random() * 80;
    const distanceCm = 200 - waterLevel;

    // Build a TTS-shaped payload
    const ttsPayload = {
      end_device_ids: {
        device_id: deviceId,
        application_ids: { application_id: "flood-finder" },
      },
      received_at: new Date().toISOString(),
      uplink_message: {
        decoded_payload: {
          distanceCm,
          waterLevelCm: waterLevel,
          batteryV: 3.2 + Math.random() * 0.8,
          status: "OK",
          timestamp: Math.floor(Date.now() / 1000),
        },
        rx_metadata: [
          {
            gateway_ids: { gateway_id: "sim-gw" },
            rssi: -80 - Math.floor(Math.random() * 30),
            snr: 5 + Math.random() * 5,
          },
        ],
      },
    };

    // Forward to our own ingest function logic
    const result = parseTTSUplink(ttsPayload);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({ status: "simulated", payload: ttsPayload });
  });
