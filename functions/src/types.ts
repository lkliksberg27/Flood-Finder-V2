// ─── Decoded sensor payload (after your CayenneLPP / custom decoder) ────
export interface SensorPayload {
  deviceId: string;
  timestamp: number; // Unix epoch seconds
  distanceCm: number;
  waterLevelCm: number;
  batteryV: number;
  status: "OK" | "WARN" | "ALERT";
  notes?: string;
}

// ─── The Things Stack (TTS) v3 uplink webhook body ─────────────────────
// Subset of fields we actually use. Full spec:
// https://www.thethingsindustries.com/docs/integrations/webhooks/
export interface TTSUplinkMessage {
  end_device_ids: {
    device_id: string;
    application_ids: { application_id: string };
    dev_eui?: string;
  };
  received_at: string; // ISO 8601
  uplink_message: {
    decoded_payload?: Record<string, unknown>;
    rx_metadata?: Array<{
      gateway_ids: { gateway_id: string };
      rssi?: number;
      snr?: number;
      timestamp?: number;
    }>;
    settings?: {
      data_rate?: {
        lora?: { spreading_factor?: number; bandwidth?: number };
      };
      frequency?: string;
    };
    f_cnt?: number;
    f_port?: number;
  };
}

// ─── Firestore document types ──────────────────────────────────────────
export interface DeviceDoc {
  deviceId: string;
  name: string;
  lat: number;
  lng: number;
  distanceCm: number;
  waterLevelCm: number;
  batteryV: number;
  status: "OK" | "WARN" | "ALERT";
  prevStatus: "OK" | "WARN" | "ALERT";
  lastSeen: FirebaseFirestore.Timestamp;
  rssi: number | null;
  snr: number | null;
  mountHeightCm: number;
  thresholds: {
    warnCm: number;
    alertCm: number;
  };
  notes: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface ReadingDoc {
  deviceId: string;
  distanceCm: number;
  waterLevelCm: number;
  batteryV: number;
  status: "OK" | "WARN" | "ALERT";
  rssi: number | null;
  snr: number | null;
  raw: Record<string, unknown>;
  receivedAt: FirebaseFirestore.Timestamp;
  deviceTimestamp: number;
  _ttl: FirebaseFirestore.Timestamp;
}

export interface AlertDoc {
  deviceId: string;
  deviceName: string;
  fromStatus: string;
  toStatus: string;
  waterLevelCm: number;
  triggeredAt: FirebaseFirestore.Timestamp;
  acknowledged: boolean;
}
