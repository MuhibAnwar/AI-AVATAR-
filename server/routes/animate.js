const express = require('express');
const axios = require('axios');

const router = express.Router();

const DID_BASE = 'https://api.d-id.com';

// Build D-ID Basic Auth header: apiKey is used as the username, password is empty
function didAuth() {
  const key = process.env.DID_API_KEY;
  if (!key) throw new Error('DID_API_KEY not configured');
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
}

const didHeaders = () => ({
  Authorization: didAuth(),
  'Content-Type': 'application/json',
});

/**
 * POST /api/animate/stream
 * Creates a new D-ID streaming session.
 * Returns: { streamId, sessionId, offer (SDP), iceServers }
 */
router.post('/stream', async (req, res, next) => {
  try {
    const presenterUrl = process.env.DID_PRESENTER_URL ||
      'https://create-images-results.d-id.com/api_docs/assets/noelle.jpeg';

    const response = await axios.post(
      `${DID_BASE}/talks/streams`,
      {
        source_url: presenterUrl,
        driver_url: 'bank://lively',
        config: { stitch: true, result_format: 'mp4' },
      },
      { headers: didHeaders(), timeout: 20_000 }
    );

    const { id: streamId, session_id: sessionId, offer, ice_servers: iceServers } = response.data;

    console.log(`[Animate] Stream created: ${streamId}`);
    res.json({ streamId, sessionId, offer, iceServers });
  } catch (err) {
    console.error('[Animate /stream Error]', err.response?.data || err.message);
    next(err);
  }
});

/**
 * POST /api/animate/sdp
 * Exchanges SDP answer with D-ID after client creates WebRTC answer.
 * Body: { streamId, sessionId, answer (SDP object) }
 */
router.post('/sdp', async (req, res, next) => {
  try {
    const { streamId, sessionId, answer } = req.body;

    await axios.post(
      `${DID_BASE}/talks/streams/${streamId}/sdp`,
      { answer, session_id: sessionId },
      { headers: didHeaders(), timeout: 10_000 }
    );

    console.log(`[Animate] SDP exchanged for stream: ${streamId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Animate /sdp Error]', err.response?.data || err.message);
    next(err);
  }
});

/**
 * POST /api/animate/ice
 * Relays ICE candidate from client to D-ID.
 * Body: { streamId, sessionId, candidate }
 */
router.post('/ice', async (req, res, next) => {
  try {
    const { streamId, sessionId, candidate } = req.body;

    await axios.post(
      `${DID_BASE}/talks/streams/${streamId}/ice`,
      { candidate, session_id: sessionId },
      { headers: didHeaders(), timeout: 10_000 }
    );

    res.json({ ok: true });
  } catch (err) {
    // ICE errors are often non-fatal, log but don't crash
    console.error('[Animate /ice Error]', err.response?.data || err.message);
    res.json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/animate/talk
 * Sends a talk task to D-ID — triggers lip-synced animation.
 * Body: { streamId, sessionId, text }   ← D-ID handles TTS internally (free, no ElevenLabs needed)
 */
router.post('/talk', async (req, res, next) => {
  try {
    const { streamId, sessionId, text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const response = await axios.post(
      `${DID_BASE}/talks/streams/${streamId}`,
      {
        session_id: sessionId,
        script: {
          type: 'text',
          input: text,
          provider: {
            type: 'microsoft',
            voice_id: 'en-US-JennyNeural', // friendly female voice, free with D-ID
          },
        },
        config: { stitch: true },
        driver_url: 'bank://lively',
      },
      { headers: didHeaders(), timeout: 15_000 }
    );

    console.log(`[Animate] Talk sent to stream: ${streamId}`);
    res.json({ ok: true, data: response.data });
  } catch (err) {
    console.error('[Animate /talk Error]', err.response?.data || err.message);
    next(err);
  }
});

/**
 * DELETE /api/animate/stream
 * Closes a D-ID streaming session.
 * Body: { streamId, sessionId }
 */
router.delete('/stream', async (req, res, next) => {
  try {
    const { streamId, sessionId } = req.body;

    if (!streamId) return res.json({ ok: true });

    await axios.delete(
      `${DID_BASE}/talks/streams/${streamId}`,
      {
        data: { session_id: sessionId },
        headers: didHeaders(),
        timeout: 10_000,
      }
    );

    console.log(`[Animate] Stream closed: ${streamId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Animate DELETE Error]', err.response?.data || err.message);
    res.json({ ok: false });
  }
});

module.exports = router;
