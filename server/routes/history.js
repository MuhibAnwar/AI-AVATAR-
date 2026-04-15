const express = require('express');
const { pool } = require('../db');

const router = express.Router();

/**
 * GET /api/history?userId=xxx
 * Returns all calls for a user, newest first.
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ calls: [] });

    const { rows } = await pool.query(
      `SELECT id, session_id, title, started_at, ended_at, message_count
       FROM calls
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json({ calls: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/history/:sessionId/messages
 * Returns all messages for a specific call session.
 */
router.get('/:sessionId/messages', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const callRes = await pool.query(
      `SELECT id FROM calls WHERE session_id = $1`,
      [sessionId]
    );

    if (callRes.rows.length === 0) return res.json({ messages: [] });

    const callId = callRes.rows[0].id;
    const { rows } = await pool.query(
      `SELECT role, content, created_at
       FROM messages
       WHERE call_id = $1
       ORDER BY created_at ASC`,
      [callId]
    );

    res.json({ messages: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/history/:sessionId/end
 * Mark a call as ended.
 */
router.patch('/:sessionId/end', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE calls SET ended_at = NOW() WHERE session_id = $1`,
      [req.params.sessionId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
