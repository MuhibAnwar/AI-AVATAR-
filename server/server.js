require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const { initDb } = require('./db');
const transcribeRouter = require('./routes/transcribe');
const chatRouter       = require('./routes/chat');
const speakRouter      = require('./routes/speak');
const animateRouter    = require('./routes/animate');
const historyRouter    = require('./routes/history');
const webhookRouter    = require('./routes/webhook');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Shared in-memory stores ──────────────────────────────────────────────────
const { audioStore } = require('./store');

// ─── Clerk webhook (must be before express.json so body stays raw) ────────────
app.use('/api/webhook/clerk', webhookRouter);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.PUBLIC_URL].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Audio file serving ───────────────────────────────────────────────────────
app.get('/api/audio/:id', (req, res) => {
  const entry = audioStore.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Audio not found or expired' });
  res.set('Content-Type', entry.mimeType || 'audio/mpeg');
  res.set('Content-Length', entry.buffer.length);
  res.set('Access-Control-Allow-Origin', '*');
  res.send(entry.buffer);
  setTimeout(() => audioStore.delete(req.params.id), 120_000);
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/transcribe', transcribeRouter);
app.use('/api/chat',       chatRouter);
app.use('/api/speak',      speakRouter);
app.use('/api/animate',    animateRouter);
app.use('/api/history',    historyRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 AvaAI Server running on http://localhost:${PORT}`);
      console.log(`📡 Public URL: ${process.env.PUBLIC_URL || 'http://localhost:' + PORT}`);
      console.log(`🎙  Whisper:    ${process.env.GROQ_API_KEY        ? '✓' : '✗ missing'}`);
      console.log(`🤖 Claude:     ${process.env.ANTHROPIC_API_KEY   ? '✓' : '✗ missing'}`);
      console.log(`🔊 ElevenLabs: ${process.env.ELEVENLABS_API_KEY  ? '✓' : '✗ missing'}`);
      console.log(`🎬 D-ID:       ${process.env.DID_API_KEY         ? '✓' : '✗ missing'}`);
      console.log(`🗄  Neon DB:    ${process.env.DATABASE_URL        ? '✓' : '✗ missing'}`);
      console.log(`📧 Resend:     ${process.env.RESEND_API_KEY       ? '✓' : '✗ missing'}`);
      console.log(`🔔 Clerk Hook: ${process.env.CLERK_WEBHOOK_SECRET ? '✓' : '✗ missing'}`);
      console.log(`🔍 Web Search: ${process.env.TAVILY_API_KEY      ? '✓' : '✗ missing (set TAVILY_API_KEY)'}\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize DB:', err.message);
    process.exit(1);
  });
