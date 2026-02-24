import { parseTTSUplink, computeStatus, computeWaterLevel, verifyWebhookSignature } from "./parser";
import * as crypto from "crypto";

// ─── Test fixtures ──────────────────────────────────────────────────────
const validTTSBody = {
  end_device_ids: {
    device_id: "ff-012",
    application_ids: { application_id: "flood-finder" },
    dev_eui: "0004A30B001C1234",
  },
  received_at: "2024-11-14T12:00:00Z",
  uplink_message: {
    decoded_payload: {
      distanceCm: 123.4,
      waterLevelCm: 56.7,
      batteryV: 3.92,
      status: "OK",
      timestamp: 1700000000,
      notes: "test reading",
    },
    rx_metadata: [
      { gateway_ids: { gateway_id: "gw-01" }, rssi: -97, snr: 7.5 },
      { gateway_ids: { gateway_id: "gw-02" }, rssi: -105, snr: 3.2 },
    ],
    f_cnt: 42,
    f_port: 1,
  },
};

// ─── parseTTSUplink ─────────────────────────────────────────────────────
describe("parseTTSUplink", () => {
  test("parses valid TTS uplink correctly", () => {
    const result = parseTTSUplink(validTTSBody);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload.deviceId).toBe("ff-012");
    expect(result.payload.distanceCm).toBe(123.4);
    expect(result.payload.waterLevelCm).toBe(56.7);
    expect(result.payload.batteryV).toBe(3.92);
    expect(result.payload.status).toBe("OK");
    expect(result.payload.timestamp).toBe(1700000000);
    expect(result.payload.notes).toBe("test reading");
    expect(result.rssi).toBe(-97); // best gateway
    expect(result.snr).toBe(7.5);
  });

  test("accepts snake_case field names", () => {
    const body = {
      ...validTTSBody,
      uplink_message: {
        ...validTTSBody.uplink_message,
        decoded_payload: {
          distance_cm: 100,
          water_level_cm: 80,
          battery_v: 3.5,
          status: "WARN",
        },
      },
    };
    const result = parseTTSUplink(body);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.distanceCm).toBe(100);
    expect(result.payload.batteryV).toBe(3.5);
  });

  test("rejects null body", () => {
    const result = parseTTSUplink(null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("not an object");
  });

  test("rejects missing device_id", () => {
    const body = { ...validTTSBody, end_device_ids: {} };
    const result = parseTTSUplink(body as any);
    expect(result.ok).toBe(false);
  });

  test("rejects missing uplink_message", () => {
    const body = { end_device_ids: { device_id: "x" } };
    const result = parseTTSUplink(body as any);
    expect(result.ok).toBe(false);
  });

  test("rejects missing decoded_payload", () => {
    const body = {
      end_device_ids: { device_id: "x" },
      uplink_message: {},
    };
    const result = parseTTSUplink(body as any);
    expect(result.ok).toBe(false);
  });

  test("rejects non-numeric distanceCm", () => {
    const body = {
      ...validTTSBody,
      uplink_message: {
        decoded_payload: { distanceCm: "not a number", batteryV: 3.9 },
      },
    };
    const result = parseTTSUplink(body);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("distanceCm");
  });

  test("rejects missing batteryV", () => {
    const body = {
      ...validTTSBody,
      uplink_message: {
        decoded_payload: { distanceCm: 100 },
      },
    };
    const result = parseTTSUplink(body);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("batteryV");
  });

  test("defaults invalid status to OK", () => {
    const body = {
      ...validTTSBody,
      uplink_message: {
        ...validTTSBody.uplink_message,
        decoded_payload: {
          ...validTTSBody.uplink_message.decoded_payload,
          status: "INVALID",
        },
      },
    };
    const result = parseTTSUplink(body);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("OK");
  });

  test("handles missing rx_metadata gracefully", () => {
    const body = {
      ...validTTSBody,
      uplink_message: {
        decoded_payload: validTTSBody.uplink_message.decoded_payload,
      },
    };
    const result = parseTTSUplink(body);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rssi).toBeNull();
    expect(result.snr).toBeNull();
  });
});

// ─── computeStatus ──────────────────────────────────────────────────────
describe("computeStatus", () => {
  const thresholds = { warnCm: 30, alertCm: 60 };

  test("returns OK below warn threshold", () => {
    expect(computeStatus(0, thresholds)).toBe("OK");
    expect(computeStatus(29.9, thresholds)).toBe("OK");
  });

  test("returns WARN at warn threshold", () => {
    expect(computeStatus(30, thresholds)).toBe("WARN");
    expect(computeStatus(59.9, thresholds)).toBe("WARN");
  });

  test("returns ALERT at alert threshold", () => {
    expect(computeStatus(60, thresholds)).toBe("ALERT");
    expect(computeStatus(200, thresholds)).toBe("ALERT");
  });
});

// ─── computeWaterLevel ──────────────────────────────────────────────────
describe("computeWaterLevel", () => {
  test("computes correctly", () => {
    expect(computeWaterLevel(200, 140)).toBe(60);
    expect(computeWaterLevel(200, 200)).toBe(0);
  });

  test("clamps negative to zero", () => {
    expect(computeWaterLevel(100, 150)).toBe(0);
  });

  test("rounds to 1 decimal", () => {
    expect(computeWaterLevel(200, 123.456)).toBe(76.5);
  });
});

// ─── verifyWebhookSignature ─────────────────────────────────────────────
describe("verifyWebhookSignature", () => {
  const secret = "test-secret-key";
  const body = JSON.stringify({ test: true });
  const validSig = crypto.createHmac("sha256", secret).update(body).digest("hex");

  test("accepts valid signature", () => {
    expect(verifyWebhookSignature(body, validSig, secret)).toBe(true);
  });

  test("rejects invalid signature", () => {
    const badSig = "a".repeat(64);
    expect(verifyWebhookSignature(body, badSig, secret)).toBe(false);
  });

  test("rejects missing signature", () => {
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false);
  });

  test("rejects empty secret", () => {
    expect(verifyWebhookSignature(body, validSig, "")).toBe(false);
  });
});
