# Firestore Data Model

## Collections

### 1. `devices` (latest summary — PUBLIC readable)

One document per sensor. Updated on every ingest. This is the **hot path** for the
dashboard and map — clients subscribe here with `onSnapshot`.

```
devices/{deviceId}
├── deviceId: string          "FF-012"
├── name: string              "Elm Street Bridge"       (admin-set friendly name)
├── lat: number               29.7604
├── lng: number               -95.3698
├── distanceCm: number        123.4                     (latest ultrasonic reading)
├── waterLevelCm: number      56.7                      (computed: mountHeight - distanceCm)
├── batteryV: number          3.92
├── status: string            "OK" | "WARN" | "ALERT"
├── prevStatus: string        "OK"                      (for change detection)
├── lastSeen: Timestamp       (server timestamp)
├── rssi: number | null       -97                       (from TTS metadata if available)
├── snr: number | null        7.5
├── mountHeightCm: number     200                       (admin-configured: sensor mount height above ground)
├── thresholds: map
│   ├── warnCm: number        30                        (water level >= this → WARN)
│   └── alertCm: number       60                        (water level >= this → ALERT)
├── notes: string             ""
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

**Why a separate `devices` collection?** Avoids deep-nested reads. Public users only
subscribe to this collection (≤ 30 docs). Each doc is ~500 bytes → well under 1 MiB limit.

### 2. `readings` (raw time-series — ADMIN only)

Sub-collection under each device for time-series data. This is the write-heavy path.

```
readings/{autoId}
├── deviceId: string          "FF-012"
├── distanceCm: number        123.4
├── waterLevelCm: number      56.7
├── batteryV: number          3.92
├── status: string            "OK"
├── rssi: number | null
├── snr: number | null
├── raw: map                  (original TTS decoded payload for debugging)
├── receivedAt: Timestamp     (server timestamp — when Cloud Function processed it)
├── deviceTimestamp: number    1700000000                (epoch from device)
└── _ttl: Timestamp           (receivedAt + 7 days — for TTL policy)
```

**Top-level collection (not sub-collection).** Why? Sub-collections under `devices/{id}/readings`
would make cross-device queries impossible. A top-level `readings` collection with a
`deviceId` field allows both per-device and cross-device queries.

**Indexes required:**
- `deviceId` ASC, `receivedAt` DESC  →  per-device time-series (sparklines, detail page)
- `_ttl` ASC                          →  scheduled cleanup function
- `status` ASC, `receivedAt` DESC     →  filter alerts across all devices

### 3. `alerts` (status change log — ADMIN only)

Written only when status transitions (e.g., OK→WARN, WARN→ALERT).

```
alerts/{autoId}
├── deviceId: string
├── deviceName: string
├── fromStatus: string        "OK"
├── toStatus: string          "ALERT"
├── waterLevelCm: number      62.3
├── triggeredAt: Timestamp
└── acknowledged: boolean     false
```

### 4. `config` (system config — ADMIN only)

```
config/global
├── webhookSecret: string     (HMAC secret for TTS webhook validation)
├── defaultThresholds: map
│   ├── warnCm: number        30
│   └── alertCm: number       60
├── retentionDays: number     7
└── pushEnabled: boolean      true
```

## Retention Strategy

| Collection | Retention | Method |
|------------|-----------|--------|
| `devices`  | Forever   | Latest state only; overwritten on each reading |
| `readings` | 7 days    | `_ttl` field + scheduled Cloud Function daily purge |
| `alerts`   | 90 days   | Same `_ttl` approach |
| `config`   | Forever   | Manual admin updates |

The scheduled cleanup function runs daily via Cloud Scheduler and deletes documents
where `_ttl < now()` in batches of 500 (Firestore batch delete limit).

## Cost Analysis (30 devices × every 6 sec)

- Writes: 30 devices × 10 reads/min × 60 min = 18,000 writes/hour
  - `readings`: 18,000/hr (raw)
  - `devices`: 18,000/hr (latest update)
  - Total: ~36,000 writes/hr = ~864K writes/day
  - Firestore free tier: 20K writes/day → **will exceed free tier**
  - At $0.18/100K writes → ~$1.55/day = ~$47/month

- Reads: Dashboard subscribers (onSnapshot on `devices` = 1 read per change per listener)
  - With 5 concurrent admin users: negligible vs writes

**Cost optimization:** Consider batching readings or reducing frequency to every 30s
for non-critical scenarios. The ingest function includes a `MIN_INTERVAL_MS` throttle.
