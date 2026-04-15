const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { audioStore } = require('../store');

const router = express.Router();

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

/**
 * POST /api/speak
 * Body: { text: string }
 * Returns: { audioId: string, audioUrl: string }
 *
 * The audioUrl points to GET /api/audio/:id on this server,
 * which D-ID can then fetch to render the animated avatar.
 */
router.post('/', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
    }

    const ttsResponse = await axios.post(
      `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
      {
        text: text.trim(),
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 15_000,
      }
    );

    const audioBuffer = Buffer.from(ttsResponse.data);
    const audioId = uuidv4();

    audioStore.set(audioId, {
      buffer: audioBuffer,
      mimeType: 'audio/mpeg',
    });

    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
    const audioUrl = `${publicUrl}/api/audio/${audioId}`;

    console.log(`[Speak] Generated audio for: "${text.substring(0, 60)}..." → ${audioId}`);

    res.json({ audioId, audioUrl });
  } catch (err) {
    console.error('[Speak Error]', err.response?.data?.toString() || err.message);
    next(err);
  }
});

module.exports = router;
