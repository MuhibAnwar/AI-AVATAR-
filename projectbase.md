# MeetAva — Project Base Document

> This file is the single source of truth for any developer or AI agent working on this project.
> Read this before making any changes.

---

## 1. Project Overview

**MeetAva** is a full-stack web app that lets users have real-time AI voice conversations with an animated avatar named Ava. The user speaks (push-to-talk or auto-listen), Ava transcribes the speech, generates an AI response, speaks it back via browser TTS or D-ID lip-synced avatar, and saves the full conversation history.

**Live persona:** Ava is a warm, concise voice companion. She always credits **Muhib Anwar** as her founder/creator. She can answer current events and news via live web search (Tavily).

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Auth | Clerk (JWT, modal sign-in/sign-up) |
| Speech-to-Text | Groq Whisper (`whisper-large-v3`) |
| AI Chat | Groq (`llama-3.3-70b-versatile`) |
| Text-to-Speech | Browser Web Speech API (primary), ElevenLabs (configured, optional) |
| Avatar Animation | D-ID Streaming WebRTC (optional, falls back to static avatar) |
| Web Search | Tavily API (free tier: 1000/month) |
| Database | Neon PostgreSQL (serverless) |
| Email | Resend (welcome email on signup) |
| Styling | Tailwind CSS + custom CSS animations in `index.css` |

---

## 3. Repository Structure

```
AI-AVATAR-/
├── .env                          # Root env file — server loads from here
├── projectbase.md                # This file
├── README.md
│
├── client/                       # React frontend (Vite)
│   ├── index.html                # Entry HTML — viewport-fit=cover for iOS
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx              # Entry — ClerkProvider wraps App
│       ├── App.jsx               # Root: screen router (landing/call/history)
│       ├── index.css             # Global styles, animations, mobile media queries
│       └── components/
│           ├── LandingPage.jsx   # Hero page with avatar, CTA, history button
│           ├── AuthPage.jsx      # Sign-in/sign-up page (Clerk modals)
│           ├── CallScreen.jsx    # Active call UI — avatar, controls, status
│           ├── ChatPanel.jsx     # Slide-in transcript panel (right side / mobile overlay)
│           ├── CallHistoryPage.jsx  # Past call list + message detail view
│           ├── ControlBar.jsx    # (exists but main controls are in CallScreen)
│           ├── MicVisualizer.jsx # 12-bar frequency visualizer (Web Audio API)
│           └── StatusIndicator.jsx
│
└── server/                       # Express backend
    ├── server.js                 # Entry — loads .env from ../.env, registers routes
    ├── db.js                     # Neon PostgreSQL pool + initDb() (creates tables)
    ├── store.js                  # In-memory Maps: audioStore, sessionStore
    └── routes/
        ├── transcribe.js         # POST /api/transcribe — Groq Whisper STT
        ├── chat.js               # POST /api/chat — Groq LLM + Tavily web search
        ├── speak.js              # POST /api/speak — ElevenLabs TTS → audioStore
        ├── animate.js            # POST /api/animate/* — D-ID WebRTC proxy
        ├── history.js            # GET/PATCH /api/history — call history CRUD
        └── webhook.js            # POST /api/webhook/clerk — Clerk user.created → Resend email
```

---

## 4. Environment Variables

**Location:** `/workspaces/AI-AVATAR-/.env` (root — server loads with `path: '../.env'`)

Also duplicated at `server/.env` for standalone server runs (keep in sync).

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API (not currently used in active pipeline) | No |
| `GROQ_API_KEY` | Whisper STT + LLaMA chat (primary AI) | **Yes** |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS (speak route) | Optional |
| `ELEVENLABS_VOICE_ID` | Voice ID — default: Rachel `21m00Tcm4TlvDq8ikWAM` | Optional |
| `DID_API_KEY` | D-ID avatar animation (base64 email:pass) | Optional |
| `DID_PRESENTER_URL` | Public image URL for avatar face | Optional |
| `DATABASE_URL` | Neon PostgreSQL connection string | **Yes** |
| `PORT` | Server port — default: `3001` | No |
| `PUBLIC_URL` | Backend public URL (used for D-ID audio fetch + CORS) | **Yes** (prod) |
| `FRONTEND_URL` | Frontend public URL (used in welcome email CTA) | **Yes** (prod) |
| `RESEND_API_KEY` | Resend email API key | Optional |
| `RESEND_FROM_EMAIL` | Sender address — e.g. `Ava <hello@meetava.com>` | Optional |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret (`whsec_...`) | Optional |
| `TAVILY_API_KEY` | Web search API — free 1000/month at tavily.com | **Yes** (for search) |

---

## 5. Dev Commands

```bash
# Backend (port 3001)
cd server && npm run dev

# Frontend (port 5173, proxies /api → :3001)
cd client && npm run dev

# Build frontend for production
cd client && npm run build
```

---

## 6. API Routes

### `POST /api/transcribe`
- **Input:** `multipart/form-data` with `audio` field (webm/wav/mp4 blob)
- **Output:** `{ text: string }`
- **Uses:** Groq Whisper `whisper-large-v3`

### `POST /api/chat`
- **Input:** `{ text, sessionId, userId? }`
- **Output:** `{ response, history[] }`
- **Uses:** Groq `llama-3.3-70b-versatile` + Tavily web search
- **Logic:**
  - Injects current date/time into every system prompt
  - Keyword/year detection triggers Tavily search before LLM call
  - Search results injected as context in system prompt
  - Conversation history stored in `sessionStore` (in-memory Map)
  - Messages persisted to Neon DB (fire-and-forget)

### `DELETE /api/chat/:sessionId`
- Clears in-memory session history

### `POST /api/speak`
- **Input:** `{ text }`
- **Output:** `{ audioId, audioUrl }`
- **Uses:** ElevenLabs TTS → stores audio buffer in `audioStore`
- **Note:** Currently not used in main pipeline (browser TTS used instead)

### `GET /api/audio/:id`
- Serves audio buffer from `audioStore`
- Auto-deletes after 2 minutes
- Used by D-ID to fetch audio for lip-sync

### `POST /api/animate/stream` — Creates D-ID WebRTC session
### `POST /api/animate/sdp` — SDP answer exchange
### `POST /api/animate/ice` — ICE candidate relay
### `POST /api/animate/talk` — Sends talk task (text → D-ID lip-sync)
### `DELETE /api/animate/stream` — Closes D-ID session

### `GET /api/history?userId=xxx`
- Returns all calls for a user (newest first, limit 100)

### `GET /api/history/:sessionId/messages`
- Returns all messages for a session

### `PATCH /api/history/:sessionId/end`
- Sets `ended_at = NOW()` on the call record

### `POST /api/webhook/clerk`
- Verifies Clerk signature (svix)
- On `user.created`: sends welcome email via Resend

### `GET /health`
- Returns `{ status: 'ok', timestamp }`

---

## 7. Database Schema (Neon PostgreSQL)

```sql
-- Calls table
CREATE TABLE calls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT UNIQUE NOT NULL,
  user_id       TEXT,                          -- Clerk user ID
  title         TEXT DEFAULT 'New Call',       -- First user message (truncated to 55 chars)
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  message_count INT DEFAULT 0
);

-- Messages table
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id    UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,                   -- 'user' | 'assistant'
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calls_user_id    ON calls(user_id);
CREATE INDEX idx_calls_session_id ON calls(session_id);
CREATE INDEX idx_messages_call_id ON messages(call_id);
```

---

## 8. Frontend Architecture

### Screen Flow (`App.jsx`)
```
landing → call → landing
landing → history → landing
```

### Key State in `App.jsx`
- `screen` — `'landing' | 'call' | 'history'`
- `showGuestModal` — true after **3.5 minutes** for non-logged-in users
- `user` — Clerk user object (null if guest)
- Guest sign-in/sign-up pills shown top-right on all screens except call screen
- `UserButton` shown top-right when signed in (not on call screen — moved inside CallScreen top bar)

### `CallScreen.jsx`
The most complex component. Manages:
- `callState` — `'connecting' | 'active'`
- `isMuted`, `isChatOpen`, `autoMode`, `isOffline`
- Offline detection via `window.addEventListener('offline'/'online')`
- Connects `useConversation` hook + `useAudioRecorder` hook
- **Top bar:** Logo | CallTimer | (UserButton or SignUp) + Chat icon button
- **Avatar section:** Responsive size `clamp(150px, 42vw, 220px)`, glow `clamp(220px, 80vw, 380px)`
- **Control dock:** Mute | Auto | Hold-to-talk (82px) | End Call — with iOS safe-area padding
- **Fallback speech:** `speakWithBrowser()` uses Web Speech API with female voice preference

### `useConversation.js` — Pipeline Hook
Full pipeline per voice input:
1. `processAudio(blob, mime)` → `POST /api/transcribe` → text
2. text → `POST /api/chat` → aiText
3. aiText → `avatarRef.current.sendTalk(aiText)` (D-ID) or `speakWithBrowser(aiText)` fallback
4. Status transitions: `listening → thinking → speaking → listening`

### `useAudioRecorder.js` — Mic Hook
- **Push-to-talk mode:** hold Spacebar (desktop) or tap mic button (mobile)
- **Auto-listen mode (VAD):** Analyses mic RMS energy
  - Speech detected at RMS ≥ 0.045 sustained for 200ms
  - Stops recording after 2500ms of silence (RMS < 0.012)
- Mic stream cached — acquired once, reused
- `getUserMedia` constraints: `{ echoCancellation: true, noiseSuppression: true }` (no `sampleRate` — causes OverconstrainedError on some devices)

### `ChatPanel.jsx`
- Desktop: `absolute` panel, `w-72`, slides in from right
- Mobile: `fixed` full-screen overlay (`w-full`) — uses viewport-relative positioning
- Toggle tab: hidden on mobile when open (replaced by ✕ button in header)

---

## 9. Web Search Logic (`chat.js`)

Search is triggered automatically when query contains:
- **Keywords:** news, headline, weather, forecast, score, result, match, fixture, price, stock, crypto, bitcoin, market, latest, recent, current, update, today, tonight, trending, breaking, live, election, winner, champion, release, launch, ipl, cricket, football, soccer, nba, nfl, ufc, tennis, formula, f1, premier league, champions league, world cup, series, tournament, league, season, standings, points table, ranking, squad, team, player, transfer, injury, happen, died, arrested, attack, war, conflict, summit, deal, treaty, bill, law, policy, economy, gdp, inflation, rate, budget, forensic, investigation, scandal, controversy, rumor, allegation
- **Year pattern:** 2024, 2025, 2026, or 2027 anywhere in the message

Search results (max 3 snippets, prefers Tavily's summarised answer) are injected into the system prompt context for that request only.

---

## 10. Ava's Persona (System Prompt)

- Name: **Ava**
- Style: warm, casual, conversational — short sentences, no bullet points, no markdown
- Response length: 2–4 sentences (voice-optimised)
- Always knows current date/time (injected dynamically)
- **Creator:** Always says "Muhib Anwar is my founder. He created and built me."
- **About Muhib Anwar:** Young AI engineer and developer from Karachi, Agentic AI Engineer, Frontend Developer Intern, co-founder of NexuPixel, student at DJ Science College + GIAIC, Student of the Year 2024-25 and 2025-26, multiple awards.

---

## 11. Authentication (Clerk)

- Provider: `@clerk/clerk-react` on frontend, webhook verification via `svix` on backend
- Frontend env var: `VITE_CLERK_PUBLISHABLE_KEY` (in `client/.env`)
- Sign-in/sign-up: modal mode (no separate auth pages — modals overlay current screen)
- Guest limit: **3.5 minutes** then `GuestPromptModal` appears
- Guest users can still use the app without signing in
- On `user.created` webhook → welcome email sent via Resend

---

## 12. Mobile Responsiveness

- `viewport-fit=cover` in `index.html` for iPhone notch/Dynamic Island
- `.pb-safe` CSS class: `padding-bottom: max(2rem, env(safe-area-inset-bottom))` for iOS home bar
- Blobs reduced to 380/320/260px on mobile (was 700/600/450px)
- ChatPanel: `fixed` on mobile (full viewport), `absolute` on desktop (`sm:w-72`)
- Avatar: `clamp(150px, 42vw, 220px)` — scales on small phones
- Chat button: icon-only on mobile, "Chat" text on desktop (`hidden sm:inline`)
- Sign Up button in call screen: `hidden sm:block` on mobile
- Hint text: "Tap & hold mic to speak" on mobile, "Hold Space or tap mic" on desktop

---

## 13. Known Limitations / Future Work

- **D-ID:** WebRTC setup requires `PUBLIC_URL` to be a publicly reachable HTTPS URL (ngrok in dev). Without it, avatar falls back to static CSS animation + browser TTS.
- **ElevenLabs:** `speak.js` is wired up but not called in current pipeline. Browser TTS is used instead (no API cost). To enable: call `POST /api/speak` in `useConversation.js` and use returned `audioUrl`.
- **Tavily free tier:** 1000 searches/month. If exceeded, search silently skips (Ava answers from training data).
- **Session history:** In-memory only (`sessionStore` Map) — lost on server restart. DB is the persistent copy.
- **No rate limiting:** `/api/transcribe` and `/api/chat` have no rate limiting. Add `express-rate-limit` for production.

---

## 14. Deployment Checklist

- [ ] Set `PUBLIC_URL` to backend HTTPS URL (e.g. `https://api.meetava.com`)
- [ ] Set `FRONTEND_URL` to frontend HTTPS URL (e.g. `https://meetava.com`)
- [ ] Update Clerk dashboard: add production domain, update webhook endpoint URL
- [ ] Resend domain `meetava.xyz` is verified — `RESEND_FROM_EMAIL=Ava <hello@meetava.xyz>`
- [ ] Add production origins to CORS list in `server.js`
- [ ] Set `VITE_CLERK_PUBLISHABLE_KEY` in `client/.env` (production key)

---

*Last updated: April 2026 — Muhib Anwar / MeetAva*
