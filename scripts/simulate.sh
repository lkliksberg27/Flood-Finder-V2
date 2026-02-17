#!/usr/bin/env bash
#
# simulate.sh — Send fake TTS-formatted uplink packets to the ingest endpoint.
#
# Usage:
#   ./simulate.sh                          # single OK reading to emulator
#   ./simulate.sh --url https://...        # send to production/deployed URL
#   ./simulate.sh --flood                  # simulate rising water (WARN → ALERT)
#   ./simulate.sh --multi 5               # simulate 5 devices
#   ./simulate.sh --loop 10 --interval 6  # send 10 readings every 6 seconds
#
# Requires: curl, jq (optional for pretty output)

set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────────────────
URL="${URL:-http://localhost:5001/YOUR-PROJECT/us-central1/ingest}"
DEVICE_ID="sim-001"
WATER_LEVEL=15       # cm
BATTERY=3.85         # V
NUM_DEVICES=1
LOOP_COUNT=1
INTERVAL=6
FLOOD_MODE=false

# ─── Parse arguments ────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --url) URL="$2"; shift 2 ;;
    --device) DEVICE_ID="$2"; shift 2 ;;
    --water) WATER_LEVEL="$2"; shift 2 ;;
    --battery) BATTERY="$2"; shift 2 ;;
    --flood) FLOOD_MODE=true; shift ;;
    --multi) NUM_DEVICES="$2"; shift 2 ;;
    --loop) LOOP_COUNT="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ─── Build and send a TTS-shaped payload ────────────────────────────────
send_reading() {
  local dev_id="$1"
  local water="$2"
  local batt="$3"
  local distance=$(echo "200 - $water" | bc -l)
  local ts=$(date +%s)

  local payload=$(cat <<EOF
{
  "end_device_ids": {
    "device_id": "${dev_id}",
    "application_ids": { "application_id": "flood-finder" }
  },
  "received_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "uplink_message": {
    "decoded_payload": {
      "distanceCm": ${distance},
      "waterLevelCm": ${water},
      "batteryV": ${batt},
      "status": "OK",
      "timestamp": ${ts}
    },
    "rx_metadata": [
      {
        "gateway_ids": { "gateway_id": "sim-gateway" },
        "rssi": -$(( RANDOM % 30 + 70 )),
        "snr": $(echo "scale=1; $(( RANDOM % 100 )) / 10" | bc)
      }
    ],
    "f_cnt": $(( RANDOM % 1000 )),
    "f_port": 1
  }
}
EOF
)

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "${URL}" \
    -H "Content-Type: application/json" \
    -d "${payload}")

  local http_code=$(echo "${response}" | tail -1)
  local body=$(echo "${response}" | head -n -1)

  echo "[$(date +%H:%M:%S)] ${dev_id} → water=${water}cm batt=${batt}V → HTTP ${http_code}"

  if [ "${http_code}" != "200" ]; then
    echo "  Response: ${body}"
  fi
}

# ─── Main loop ───────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════╗"
echo "║  Flood Finder — Device Simulator             ║"
echo "║  URL: ${URL}"
echo "║  Devices: ${NUM_DEVICES}, Loop: ${LOOP_COUNT}×, Interval: ${INTERVAL}s"
echo "║  Flood mode: ${FLOOD_MODE}"
echo "╚══════════════════════════════════════════════╝"
echo ""

for (( iteration=1; iteration<=LOOP_COUNT; iteration++ )); do
  for (( d=1; d<=NUM_DEVICES; d++ )); do
    dev="sim-$(printf '%03d' $d)"

    if [ "${FLOOD_MODE}" = true ]; then
      # Gradually increase water level: 10cm → 80cm over iterations
      water=$(echo "scale=1; 10 + ($iteration * 70 / $LOOP_COUNT)" | bc)
      # Battery slowly drains
      batt=$(echo "scale=2; 3.90 - ($iteration * 0.5 / $LOOP_COUNT)" | bc)
    else
      # Add small random jitter
      water=$(echo "scale=1; ${WATER_LEVEL} + $(( RANDOM % 10 - 5 ))" | bc)
      batt=$(echo "scale=2; ${BATTERY} - 0.0$(( RANDOM % 5 ))" | bc)
    fi

    send_reading "${dev}" "${water}" "${batt}"
  done

  if [ "${iteration}" -lt "${LOOP_COUNT}" ]; then
    echo "  ⏳ Waiting ${INTERVAL}s..."
    sleep "${INTERVAL}"
  fi
done

echo ""
echo "✓ Simulation complete."
