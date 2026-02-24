# Flood Finder — Neighborhood IoT Flood Monitoring System

## Architecture

```
┌─────────────┐    LoRa     ┌──────────────┐   LoRaWAN    ┌─────────────────────┐
│  LoRa Sensor │───────────▸│   Gateway    │────────────▸│  The Things Stack   │
│  Node (×30+) │  RF 868/915│  (RAK/Mikro) │   MQTT/gRPC  │  (Network Server)   │
└─────────────┘            └──────────────┘              └─────────┬───────────┘
                                                                   │ Webhook (HTTPS POST)
                                                                   ▼
                                                        ┌─────────────────────┐
                                                        │  Firebase Cloud Fn  │
                                                        │  /api/ingest        │
                                                        │  ─ validate payload │
                                                        │  ─ parse TTS format │
                                                        │  ─ compute status   │
                                                        └────┬───────────┬────┘
                                                             │           │
                                              Batch Write    │           │  Conditional
                                                             ▼           ▼
                                                   ┌──────────────┐  ┌──────────────┐
                                                   │  Firestore   │  │  FCM Push    │
                                                   │              │  │  (on ALERT)  │
                                                   │ ┌──────────┐ │  └──────────────┘
                                                   │ │ devices/  │ │
                                                   │ │ (latest)  │ │◀──── Public reads
                                                   │ ├──────────┤ │
                                                   │ │ readings/ │ │◀──── Admin reads
                                                   │ │ (raw ts)  │ │
                                                   │ ├──────────┤ │
                                                   │ │ alerts/   │ │◀──── Admin reads
                                                   │ └──────────┘ │
                                                   └──────┬───────┘
                                                          │ Realtime snapshots
                                                          ▼
                                            ┌──────────────────────────┐
                                            │   Next.js Frontend       │
                                            │                          │
                                            │  /map ────── Public      │
                                            │  /login ──── Auth gate   │
                                            │  /dashboard─ Admin table │
                                            │  /device/id─ Detail view │
                                            └──────────────────────────┘
```

## Tech Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Maps | **Mapbox GL JS** | Free tier (50k loads/mo), dark/satellite styles built-in, better custom markers, vector tiles = fast on mobile |
| Charts | **Recharts** | Required by spec; lightweight, composable |
| Hosting | **Vercel** | Zero-config Next.js deploys, edge functions, preview deploys; Firebase Hosting lacks App Router SSR support |
| Auth | **Firebase Auth** | Email/password for admin; simple, free |
| Realtime | **Firestore onSnapshot** | Native realtime; no extra infra |

## Quick Start

```bash
# 1. Clone & install
cd flood-finder
cd frontend && npm install
cd ../functions && npm install

# 2. Set environment variables (see .env.example files)

# 3. Deploy functions
cd functions && npx firebase deploy --only functions

# 4. Deploy frontend
cd frontend && npx vercel

# 5. Configure TTS webhook → your Cloud Function URL
```

See detailed setup in each section below.
