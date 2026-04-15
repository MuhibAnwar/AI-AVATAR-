# AvaAI — AI Avatar Video Call

A real-time AI video call app. Speak to **Ava**, an animated avatar powered by:
- 🎙 **OpenAI Whisper** — speech-to-text
- 🤖 **Anthropic Claude** — conversational AI
- 🔊 **ElevenLabs** — natural text-to-speech
- 🎬 **D-ID Streaming** — live lip-synced avatar via WebRTC

---

## Project Structure

```
AI-AVATAR-/
├── client/                     # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.jsx      Landing screen with Start Call button
│   │   │   ├── CallScreen.jsx       Main call UI orchestrator
│   │   │   ├── AvatarWindow.jsx     D-ID WebRTC avatar display
│   │   │   ├── ControlBar.jsx       Mute / End call / Chat buttons
│   │   │   ├── ChatPanel.jsx        Collapsible chat transcript
│   │   │   ├── MicVisualizer.jsx    Live mic input level bars
│   │   │   └── StatusIndicator.jsx  Listening / Thinking / Speaking text
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.js  Push-to-talk MediaRecorder hook
│   │   │   └── useConversation.js   Full pipeline orchestration hook
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── server/                     # Node.js + Express backend
│   ├── routes/
│   │   ├── transcribe.js       POST /api/transcribe  (Whisper)
│   │   ├── chat.js             POST /api/chat        (Claude)
│   │   ├── speak.js            POST /api/speak       (ElevenLabs)
│   │   └── animate.js          POST /api/animate/*   (D-ID)
│   ├── server.js
│   └── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js** ≥ 18
- Four API keys (instructions below)
- For local development with D-ID: an HTTPS tunnel (see note below)

---

## Getting Your API Keys

### 1. Anthropic (Claude AI)
1. Go to [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Click **Create Key** → copy the key
3. Paste as `ANTHROPIC_API_KEY` in `.env`

### 2. OpenAI (Whisper STT)
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key** → copy
3. Paste as `OPENAI_API_KEY` in `.env`

### 3. ElevenLabs (Text-to-Speech)
1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to **Profile → API Keys** → copy your key
3. Paste as `ELEVENLABS_API_KEY` in `.env`
4. For the voice: go to **Voice Library**, pick a voice, click the ID icon to copy the Voice ID
   - Recommended: **Rachel** = `21m00Tcm4TlvDq8ikWAM` (already set as default)
5. Paste as `ELEVENLABS_VOICE_ID` in `.env`

### 4. D-ID (Avatar Animation)
1. Sign up at [studio.d-id.com](https://studio.d-id.com)
2. Go to **Account Settings → API** → copy your key
3. Paste as `DID_API_KEY` in `.env`
4. Optionally set `DID_PRESENTER_URL` to any public HTTPS image URL to customize the avatar face

---

## Installation

```bash
# 1. Install server dependencies
cd server
npm install

# 2. Install client dependencies
cd ../client
npm install
```

---

## Configuration

```bash
cd server
cp .env.example .env
# Fill in all four API keys in .env
```

### ⚠️ D-ID Audio URL Note

D-ID needs a **publicly reachable HTTPS URL** to fetch the ElevenLabs audio.  
In production this works automatically with your deployed server URL.

**For local development**, use a tunnel:

```bash
# Option A: ngrok (https://ngrok.com)
ngrok http 3001
# Copy the https URL (e.g. https://abc123.ngrok.io)
# Set PUBLIC_URL=https://abc123.ngrok.io in .env

# Option B: Cloudflare Tunnel (free)
npx cloudflared tunnel --url http://localhost:3001
# Copy the provided https URL and set PUBLIC_URL in .env
```

Without a tunnel, the app still works in **fallback mode**: ElevenLabs audio plays
directly in the browser with a static animated avatar (no D-ID lip sync).

---

## Running the App

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd server
npm run dev        # uses nodemon for auto-reload
# Server starts on http://localhost:3001

# Terminal 2 — Frontend
cd client
npm run dev        # Vite dev server
# App opens at http://localhost:5173
```

---

## Voice Call Flow

Once in a call:

| Action | Result |
|--------|--------|
| **Hold Spacebar** | Records your voice (push-to-talk) |
| **Release Spacebar** | Sends audio → Whisper → Claude → ElevenLabs → D-ID |
| **Mic button** | Toggle mute on/off |
| **Chat bubble button** | Open/close transcript panel |
| **Mobile** | Hold the on-screen "Hold to speak" button |

**Pipeline:**
```
Your voice
  → POST /api/transcribe   (Whisper STT)
  → POST /api/chat         (Claude AI)
  → POST /api/speak        (ElevenLabs TTS → audio served at /api/audio/:id)
  → POST /api/animate/talk (D-ID lip-sync via WebRTC)
  → Avatar speaks back
```

---

## Customizing Ava's Personality

Edit the `SYSTEM_PROMPT` constant in `server/routes/chat.js` to change Ava's personality,
name, or speaking style.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Microphone permission denied" | Allow mic in browser settings, then refresh |
| Avatar doesn't animate (D-ID) | Check `DID_API_KEY` + set `PUBLIC_URL` to a tunnel URL in dev |
| No audio from Ava | Check `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `.env` |
| "No speech detected" | Speak clearly and hold Space for at least 1–2 seconds |
| CORS error | Ensure frontend runs on `localhost:5173` and backend on `localhost:3001` |
| D-ID stream error | D-ID free tier has limits; check your D-ID dashboard usage |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Speech-to-Text | OpenAI Whisper (`whisper-1`) |
| AI Brain | Anthropic Claude (`claude-sonnet-4-6`) with prompt caching |
| Text-to-Speech | ElevenLabs (`eleven_monolingual_v1`) |
| Avatar Animation | D-ID Streaming API (WebRTC) |
| Real-time | WebRTC, MediaRecorder API, Web Audio API |

---

## Production Deployment

1. Deploy server to any Node.js host (Railway, Render, Fly.io, etc.)
2. Set `PUBLIC_URL` to your deployed server's HTTPS URL
3. Set all four API keys as environment variables on the host
4. Build and deploy the frontend: `cd client && npm run build`
5. Serve the `client/dist` folder (or deploy to Vercel/Netlify)
6. Update Vite proxy → point to your deployed backend URL
