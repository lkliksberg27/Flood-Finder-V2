# Testing Plan

## 1. Unit Tests (Cloud Functions)

Run with:
```bash
cd functions
npm test
```

### What's tested (`parser.test.ts`):

| Test | Description |
|------|-------------|
| `parseTTSUplink` — valid payload | Parses all fields correctly from TTS format |
| `parseTTSUplink` — snake_case | Handles `distance_cm` / `battery_v` variants |
| `parseTTSUplink` — null body | Rejects with clear error |
| `parseTTSUplink` — missing device_id | Rejects malformed TTS envelope |
| `parseTTSUplink` — missing uplink_message | Rejects non-uplink events (join, etc.) |
| `parseTTSUplink` — missing decoded_payload | Rejects raw (un-decoded) payloads |
| `parseTTSUplink` — non-numeric distanceCm | Rejects corrupt sensor values |
| `parseTTSUplink` — missing batteryV | Rejects incomplete sensor payloads |
| `parseTTSUplink` — invalid status | Defaults to "OK" (server recomputes anyway) |
| `parseTTSUplink` — no rx_metadata | Handles gracefully (rssi/snr = null) |
| `computeStatus` — thresholds | OK/WARN/ALERT at correct boundaries |
| `computeWaterLevel` — math | Correct mount height subtraction, clamping |
| `verifyWebhookSignature` — valid | Accepts correct HMAC-SHA256 |
| `verifyWebhookSignature` — invalid | Rejects bad signatures (timing-safe) |

### Adding more tests:
```bash
# Recommended additional test files:
# functions/src/ingest.integration.test.ts  — test with Firebase Emulator
# functions/src/cleanup.test.ts             — test TTL purge logic
```

---

## 2. Integration Testing (Emulator Suite)

### Setup
```bash
# Start emulators (from project root)
firebase emulators:start

# In another terminal, start frontend
cd frontend
NEXT_PUBLIC_USE_EMULATORS=true npm run dev
```

### Manual test scenarios

#### A. Happy path — single device
```bash
cd scripts
chmod +x simulate.sh
./simulate.sh --url http://localhost:5001/YOUR-PROJECT/us-central1/ingest \
              --device test-001 --water 15 --battery 3.85
```
**Verify:**
- [ ] HTTP 200 response
- [ ] `devices/test-001` doc created in Firestore emulator
- [ ] `readings` collection has new document
- [ ] Dashboard shows device with status "OK"
- [ ] Map shows green pin (after setting lat/lng)

#### B. Status escalation — flood simulation
```bash
./simulate.sh --url http://localhost:5001/YOUR-PROJECT/us-central1/ingest \
              --flood --loop 20 --interval 3
```
**Verify:**
- [ ] Status changes from OK → WARN → ALERT as water rises
- [ ] `alerts` collection gets entries on each transition
- [ ] Dashboard badge updates in realtime
- [ ] Map pin changes color (green → amber → red)

#### C. Multi-device load test
```bash
./simulate.sh --url http://localhost:5001/YOUR-PROJECT/us-central1/ingest \
              --multi 30 --loop 50 --interval 6
```
**Verify:**
- [ ] All 30 devices appear in Firestore
- [ ] No Cloud Function errors in emulator logs
- [ ] Dashboard renders 30 rows without lag
- [ ] Map renders 30 pins

#### D. Malformed payload rejection
```bash
# Missing required field
curl -X POST http://localhost:5001/YOUR-PROJECT/us-central1/ingest \
  -H "Content-Type: application/json" \
  -d '{"end_device_ids":{"device_id":"bad"},"uplink_message":{"decoded_payload":{}}}'
```
**Verify:**
- [ ] HTTP 400 with descriptive error
- [ ] No document written to Firestore

#### E. Throttle test
```bash
# Send 5 readings in rapid succession (< 4s apart)
for i in {1..5}; do
  ./simulate.sh --url http://localhost:5001/YOUR-PROJECT/us-central1/ingest \
                --device throttle-test --water 20 &
done
wait
```
**Verify:**
- [ ] Only 1-2 actually write (rest return `{"status":"throttled"}`)

---

## 3. Frontend Testing

### Visual checklist

| Page | Test | Expected |
|------|------|----------|
| `/map` | Load with 0 devices | Shows empty map centered on default location |
| `/map` | Load with devices | Pins appear with correct colors |
| `/map` | Tap pin | Popup shows device name, water level, battery |
| `/map` | Bottom panel | Toggle open/close, filter by status |
| `/login` | Wrong password | "Invalid email or password" error |
| `/login` | Correct credentials | Redirect to `/dashboard` |
| `/dashboard` | No auth | Redirect to `/login` |
| `/dashboard` | With auth | Stats cards + device table visible |
| `/dashboard` | Search | Filters by device name or ID |
| `/dashboard` | Status filter | ALERT/WARN/OK/ALL buttons work |
| `/dashboard` | Column sort | Click headers to sort |
| `/device/[id]` | Load | Shows water level + battery charts |
| `/device/[id]` | Time range | 1h/6h/24h toggles update chart |
| `/device/[id]` | Recent packets | Table shows last 20 readings |

### Mobile testing
- [ ] All pages work at 375px width (iPhone SE)
- [ ] Navigation hamburger menu works
- [ ] Map popup is scrollable on small screens
- [ ] Bottom panel doesn't block map controls

---

## 4. Load Testing Guidance

### Firestore Write Limits
- **Single document**: Max 1 write/sec sustained
- **Collection**: No hard limit, but distribute writes

Our approach avoids hotspots:
- Each device writes to its own `devices/{deviceId}` doc (distributed)
- Readings go to auto-ID docs (distributed by design)
- No counters or aggregate documents updated on every write

### Stress test: 50 devices × 6-second interval
```
Writes/second: 50 devices / 6 sec = ~8.3 writes/sec for readings
                                   + ~8.3 writes/sec for device updates
                                   = ~17 writes/sec total

Cloud Function invocations: ~8.3/sec = ~500/min = ~720K/day
```

This is well within Firestore's limits (10K writes/sec per database).

### Cost projection at scale

| Metric | 30 devices | 100 devices | 500 devices |
|--------|-----------|-------------|-------------|
| Writes/day | 864K | 2.88M | 14.4M |
| Firestore cost/day | $1.55 | $5.18 | $25.92 |
| Function invocations/day | 432K | 1.44M | 7.2M |
| Function cost/day (free tier absorbs most) | ~$0 | ~$0.50 | ~$3.00 |

**Cost optimization levers:**
1. Increase send interval (30s instead of 6s → 5× cheaper)
2. Skip writing to `readings` collection if status hasn't changed (only write on change)
3. Use Firestore TTL (native, no cleanup function needed) when GA
4. Batch multiple devices into single Cloud Function invocation using TTS batch webhooks

---

## 5. Security Testing

- [ ] Unauthenticated user CANNOT read `readings` collection
- [ ] Unauthenticated user CANNOT read `alerts` collection
- [ ] Unauthenticated user CANNOT read `config` collection
- [ ] Unauthenticated user CAN read `devices` collection (public flood status)
- [ ] Unauthenticated user CANNOT write to any collection
- [ ] Non-admin authenticated user CANNOT read `readings` or `alerts`
- [ ] Admin user CAN read all collections
- [ ] Webhook endpoint rejects non-POST methods (405)
- [ ] Webhook endpoint rejects malformed JSON (400)
- [ ] Webhook endpoint rejects invalid HMAC signature (401)

Test with Firebase Emulator rules testing:
```bash
firebase emulators:exec --only firestore "npx jest firestore-rules.test.ts"
```
