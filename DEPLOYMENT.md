# Deployment Guide

## Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Vercel CLI: `npm install -g vercel`
- A Firebase project (Blaze plan for Cloud Functions)
- A Mapbox account (free tier: 50K map loads/month)
- A The Things Stack (TTS) application with your LoRa devices registered

---

## Step 1: Firebase Project Setup

```bash
# Login to Firebase
firebase login

# Initialize in project root (select Firestore, Functions, Emulators)
# When prompted, select your existing Firebase project
firebase init

# Note: firebase.json, firestore.rules, and firestore.indexes.json
# are already provided in this repo — do NOT overwrite them.
```

### Enable Authentication
1. Go to **Firebase Console** → **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Create your admin user: **Authentication** → **Users** → **Add user**

### Set Admin Custom Claim
Run this one-time script to grant admin access:

```bash
# From project root, create a temporary script:
cat > set-admin.js << 'EOF'
const admin = require("firebase-admin");
admin.initializeApp();

async function setAdmin(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`✓ Admin claim set for ${email} (uid: ${user.uid})`);
}

setAdmin(process.argv[2]).catch(console.error);
EOF

# Run it:
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json \
  node set-admin.js admin@yourdomain.com
```

---

## Step 2: Deploy Cloud Functions

```bash
cd functions

# Install dependencies
npm install

# Set the webhook HMAC secret (must match TTS configuration)
firebase functions:config:set webhook.secret="generate-a-strong-secret-here"
# For 2nd-gen functions, create functions/.env instead:
# WEBHOOK_SECRET=generate-a-strong-secret-here

# Build and deploy
npm run build
firebase deploy --only functions

# Note the HTTPS endpoint URL printed:
# ✔ Function URL (ingest): https://us-central1-YOUR-PROJECT.cloudfunctions.net/ingest
# Save this — you'll need it for TTS webhook config.
```

### Deploy Firestore Rules and Indexes

```bash
cd ..  # back to project root
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Step 3: Configure The Things Stack Webhook

1. Log in to your TTS Console (e.g., https://eu1.cloud.thethings.network/console)
2. Go to **Applications** → your app → **Integrations** → **Webhooks**
3. Click **+ Add webhook** → **Custom webhook**
4. Configure:

| Field | Value |
|-------|-------|
| Webhook ID | `flood-finder` |
| Webhook format | `JSON` |
| Base URL | `https://us-central1-YOUR-PROJECT.cloudfunctions.net/ingest` |
| Downlink API key | (leave empty) |
| Uplink message | ✅ Enabled (path: leave empty) |

5. If using HMAC verification, add a custom header:
   - Header name: `X-Webhook-Signature`
   - Header value: (TTS can compute HMAC — or use the API key approach)

6. **Payload formatter** (in your TTS device/application):
   Make sure your uplink payload decoder outputs the expected fields:

```javascript
// TTS Payload Formatter (JavaScript)
function decodeUplink(input) {
  var bytes = input.bytes;
  // Example: 4 bytes distance (float16), 2 bytes battery (uint16)
  // Adjust this to match YOUR sensor's actual byte encoding
  var distanceCm = (bytes[0] << 8 | bytes[1]) / 10.0;
  var batteryRaw = (bytes[2] << 8 | bytes[3]);
  var batteryV = batteryRaw / 1000.0;

  return {
    data: {
      distanceCm: distanceCm,
      batteryV: batteryV,
      // waterLevelCm is computed server-side from mountHeight - distanceCm
      // status is computed server-side from thresholds
      timestamp: Math.floor(Date.now() / 1000)
    }
  };
}
```

---

## Step 4: Deploy Frontend to Vercel

```bash
cd frontend

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase config + Mapbox token

# Test locally
npm run dev
# Open http://localhost:3000

# Deploy to Vercel
vercel

# Set environment variables in Vercel dashboard:
# (or use `vercel env add` CLI)
# - NEXT_PUBLIC_FIREBASE_API_KEY
# - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# - NEXT_PUBLIC_FIREBASE_PROJECT_ID
# - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
# - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
# - NEXT_PUBLIC_FIREBASE_APP_ID
# - NEXT_PUBLIC_MAPBOX_TOKEN

# Production deploy:
vercel --prod
```

---

## Step 5: Configure Device Locations

After the first reading arrives, each device will appear in Firestore's `devices`
collection with `lat: 0, lng: 0`. Update these via the Firebase Console or a
script:

```javascript
// set-device-location.js
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

async function configure(deviceId, name, lat, lng, mountHeightCm) {
  await db.collection("devices").doc(deviceId).update({
    name,
    lat,
    lng,
    mountHeightCm,
  });
  console.log(`✓ Configured ${deviceId}`);
}

// Example:
configure("ff-012", "Elm Street Bridge", 29.7604, -95.3698, 200);
configure("ff-013", "Oak Park Drain", 29.7612, -95.3710, 150);
```

---

## Step 6: Verify End-to-End

1. Power on a LoRa sensor node
2. Watch TTS Console → **Live data** tab for uplink messages
3. Check Firebase Console → **Firestore** for new documents in `devices` and `readings`
4. Open your Vercel deployment → `/map` to see the pin appear
5. Login at `/login` → check `/dashboard` for the device table

---

## Local Development with Emulators

```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start

# Terminal 2: Start Next.js dev server
cd frontend
NEXT_PUBLIC_USE_EMULATORS=true npm run dev

# Terminal 3: Simulate a device (see scripts/simulate.sh)
```

---

## Environment Variables Summary

| Variable | Where | Purpose |
|----------|-------|---------|
| `WEBHOOK_SECRET` | Cloud Functions .env | HMAC webhook verification |
| `NEXT_PUBLIC_FIREBASE_*` | Vercel / .env.local | Firebase client SDK config |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Vercel / .env.local | Mapbox GL JS access token |
| `NEXT_PUBLIC_USE_EMULATORS` | .env.local only | Connect to local emulators |
