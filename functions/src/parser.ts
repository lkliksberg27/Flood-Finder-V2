import { TTSUplinkMessage, SensorPayload } from "./types";
import * as crypto from "crypto";

// ─── Constants ──────────────────────────────────────────────────────────
const VALID_STATUS = new Set(["OK", "WARN", "ALERT"]);

// ─── HMAC Webhook Verification ──────────────────────────────────────────
/**
 * Verify The Things Stack webhook HMAC signature.
 * TTS sends the HMAC in the `X-Downlink-Apikey` header or a custom header.
 * We use a shared secret configured in both TTS and our env vars.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

// ─── Parse TTS uplink into our SensorPayload ───────────────────────────
export interface ParseResult {
  ok: true;
  payload: SensorPayload;
  rssi: number | null;
  snr: number | null;
  raw: Record<string, unknown>;
}

export interface ParseError {
  ok: false;
  error: string;
}

export function parseTTSUplink(
  body: unknown
): ParseResult | ParseError {
  // 1. Top-level shape check
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body is not an object" };
  }

  const msg = body as TTSUplinkMessage;

  if (!msg.end_device_ids?.device_id) {
    return { ok: false, error: "Missing end_device_ids.device_id" };
  }

  if (!msg.uplink_message) {
    return { ok: false, error: "Missing uplink_message (not an uplink?)" };
  }

  const decoded = msg.uplink_message.decoded_payload;
  if (!decoded || typeof decoded !== "object") {
    return { ok: false, error: "Missing or invalid decoded_payload" };
  }

  // 2. Extract and validate sensor fields from decoded_payload
  const deviceId = msg.end_device_ids.device_id;

  const distanceCm = toFiniteNumber(decoded.distanceCm ?? decoded.distance_cm);
  if (distanceCm === null) {
    return { ok: false, error: "Invalid or missing distanceCm" };
  }

  const batteryV = toFiniteNumber(decoded.batteryV ?? decoded.battery_v ?? decoded.battery);
  if (batteryV === null) {
    return { ok: false, error: "Invalid or missing batteryV" };
  }

  // waterLevelCm can be computed server-side from mountHeight - distanceCm,
  // but if the device sends it, we use it as-is
  const waterLevelCm = toFiniteNumber(decoded.waterLevelCm ?? decoded.water_level_cm) ?? 0;

  // Status: use device-reported if valid, else "OK" (we recompute server-side anyway)
  const rawStatus = String(decoded.status ?? "OK").toUpperCase();
  const status = VALID_STATUS.has(rawStatus) ? (rawStatus as "OK" | "WARN" | "ALERT") : "OK";

  // Timestamp: device epoch or TTS received_at
  const deviceTimestamp =
    toFiniteNumber(decoded.timestamp) ??
    Math.floor(new Date(msg.received_at || Date.now()).getTime() / 1000);

  // 3. Extract radio metadata (best RSSI/SNR from all gateways)
  let rssi: number | null = null;
  let snr: number | null = null;
  const rxMeta = msg.uplink_message.rx_metadata;
  if (Array.isArray(rxMeta) && rxMeta.length > 0) {
    // Pick the gateway with strongest signal
    const best = rxMeta.reduce((a, b) => ((a.rssi ?? -999) > (b.rssi ?? -999) ? a : b));
    rssi = toFiniteNumber(best.rssi);
    snr = toFiniteNumber(best.snr);
  }

  return {
    ok: true,
    payload: {
      deviceId,
      timestamp: deviceTimestamp,
      distanceCm,
      waterLevelCm,
      batteryV,
      status,
      notes: typeof decoded.notes === "string" ? decoded.notes : undefined,
    },
    rssi,
    snr,
    raw: decoded,
  };
}

// ─── Compute flood status based on thresholds ──────────────────────────
export function computeStatus(
  waterLevelCm: number,
  thresholds: { warnCm: number; alertCm: number }
): "OK" | "WARN" | "ALERT" {
  if (waterLevelCm >= thresholds.alertCm) return "ALERT";
  if (waterLevelCm >= thresholds.warnCm) return "WARN";
  return "OK";
}

// ─── Compute water level from mount height and distance ────────────────
export function computeWaterLevel(mountHeightCm: number, distanceCm: number): number {
  const level = mountHeightCm - distanceCm;
  return Math.max(0, Math.round(level * 10) / 10); // clamp to 0, 1 decimal
}

// ─── Helpers ────────────────────────────────────────────────────────────
function toFiniteNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}
