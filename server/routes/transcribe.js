const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const { toFile } = require('openai');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Groq is OpenAI-compatible — free tier, no extra package needed
const openai = new OpenAI.default({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Map MIME type to a file extension Whisper accepts
function mimeToExt(mime = '') {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg'))  return 'ogg';
  if (mime.includes('mp4'))  return 'mp4';
  if (mime.includes('wav'))  return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  return 'webm';
}

/**
 * POST /api/transcribe
 * Accepts: multipart/form-data with `audio` field (webm/wav blob)
 * Returns: { text: string }
 */
router.post('/', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { buffer, mimetype } = req.file;
    const ext = mimeToExt(mimetype);
    const filename = `audio.${ext}`;

    // Use OpenAI's toFile helper — correctly wraps a Buffer for the SDK
    const audioFile = await toFile(buffer, filename, { type: mimetype || 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: 'en',
      response_format: 'json',
    });

    const text = transcription.text?.trim() || '';
    console.log(`[Transcribe] "${text}"`);

    res.json({ text });
  } catch (err) {
    console.error('[Transcribe Error]', err.message);
    next(err);
  }
});

module.exports = router;
