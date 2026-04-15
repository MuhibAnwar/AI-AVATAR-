const express = require('express');
const OpenAI = require('openai');
const { sessionStore } = require('../store');
const { pool } = require('../db');

const router = express.Router();

const groq = new OpenAI.default({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Dynamic system prompt — always includes today's date
function getSystemPrompt(searchContext = '') {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  return `You are Ava, a warm, intelligent, and friendly AI assistant who communicates via voice call. You speak naturally like a human — using short sentences, casual language, and occasional filler words like "sure", "absolutely", "great question". You are helpful, patient, and encouraging. Keep responses concise (2-4 sentences) since you are speaking out loud, not writing. Never use bullet points or markdown. Always sound conversational.

Today's date is ${dateStr} and the current time is ${timeStr}. Always use this when answering questions about the date, day, or time.${searchContext}

IMPORTANT: If anyone asks who created you, who built you, who made you, who is your founder, who is your developer, or any similar question about your origin — always answer: "Muhib Anwar is my founder. He created and built me." Never say anything different about your creator.

IMPORTANT: If anyone asks who is Muhib Anwar, tell them about him naturally in a conversational way using this information: Muhib Anwar is a young tech professional and AI-focused developer from Karachi. He currently works as an Agentic AI Engineer, and is also a Frontend Developer Intern and Web Development Intern. He is the co-founder of NexuPixel. He is skilled in AI and web development, working with technologies like Python, Next.js, React, TypeScript, Tailwind CSS, OpenAI SDKs, Gemini APIs, and Claude Code. He is an intermediate student at DJ Science Government Sindh College, also studying Agentic AI at GIAIC. He has won Student of the Year two years in a row for 2024-25 and 2025-26, won a STEAM Exhibition at provincial level, and received an Outstanding Student Award. He has built impressive AI projects using Claude Code and various APIs, created platforms like Industry Landscape Tracker and BookBarber, managed GitHub with over 100 commits, improved team efficiency by 30 percent, and increased website performance by 40 percent. In short, Muhib Anwar is an ambitious AI engineer and web developer who is actively building projects, gaining real experience, and growing fast in the tech and AI field. Always speak about him with admiration and pride since he is my creator.`;
}

// Detect whether a query needs a live web search
const SEARCH_KEYWORDS = /\b(news|headline|weather|forecast|score|result|match|fixture|price|stock|crypto|bitcoin|market|latest|recent|current|update|today|tonight|trending|breaking|live|election|winner|champion|release|launch|ipl|cricket|football|soccer|nba|nfl|ufc|tennis|formula|f1|premier league|champions league|world cup|series|tournament|league|season|standings|points table|ranking|squad|team|player|transfer|injury|happen|died|arrested|attack|war|conflict|summit|deal|treaty|bill|law|policy|economy|gdp|inflation|rate|budget|forensic|investigation|scandal|controversy|rumor|rumour|allegation)\b/i;

// Also trigger search if query mentions a recent year (2024-2027)
const YEAR_PATTERN = /\b(2024|2025|2026|2027)\b/;

function needsSearch(text) {
  return SEARCH_KEYWORDS.test(text) || YEAR_PATTERN.test(text);
}

// Tavily web search — free tier: 1000 searches/month (https://tavily.com)
async function searchWeb(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('[Search] TAVILY_API_KEY not set — skipping');
    return null;
  }
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 3,
        include_answer: true,
      }),
    });
    const data = await res.json();
    // Prefer Tavily's summarised answer; fall back to top snippets
    if (data.answer) return data.answer;
    const snippets = (data.results || []).map(r => `${r.title}: ${r.content}`).join('\n');
    return snippets || null;
  } catch (err) {
    console.error('[Search Error]', err.message);
    return null;
  }
}

// Ensure a call record exists in DB
async function ensureCallRecord(sessionId, userId, firstUserMessage) {
  const title = firstUserMessage.length > 55
    ? firstUserMessage.slice(0, 52) + '...'
    : firstUserMessage;
  await pool.query(
    `INSERT INTO calls (session_id, user_id, title)
     VALUES ($1, $2, $3)
     ON CONFLICT (session_id) DO NOTHING`,
    [sessionId, userId || null, title]
  );
}

// Save a single message to DB
async function saveMessage(sessionId, role, content) {
  try {
    const callRes = await pool.query(`SELECT id FROM calls WHERE session_id = $1`, [sessionId]);
    if (callRes.rows.length === 0) return;
    const callId = callRes.rows[0].id;
    await pool.query(`INSERT INTO messages (call_id, role, content) VALUES ($1, $2, $3)`, [callId, role, content]);
    await pool.query(`UPDATE calls SET message_count = message_count + 1 WHERE id = $1`, [callId]);
  } catch (err) {
    console.error('[DB] saveMessage error:', err.message);
  }
}

/**
 * POST /api/chat
 * Body: { text, sessionId, userId? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { text, sessionId, userId } = req.body;

    if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });
    if (!sessionId)    return res.status(400).json({ error: 'No sessionId provided' });

    if (!sessionStore.has(sessionId)) sessionStore.set(sessionId, []);
    const history = sessionStore.get(sessionId);

    if (history.length === 0) await ensureCallRecord(sessionId, userId, text.trim());

    history.push({ role: 'user', content: text.trim() });

    // Run web search in parallel with no delay if the query needs live info
    let searchContext = '';
    if (needsSearch(text.trim())) {
      const results = await searchWeb(text.trim());
      if (results) {
        console.log(`[Search] "${text.trim()}" → got results`);
        searchContext = `\n\n[Live web search results for this query:\n${results}\nUse these facts in your answer but speak naturally — do not read them out verbatim.]`;
      }
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      messages: [{ role: 'system', content: getSystemPrompt(searchContext) }, ...history],
    });

    const aiText = response.choices[0]?.message?.content?.trim()
      || "Sorry, I didn't quite catch that. Could you say that again?";

    history.push({ role: 'assistant', content: aiText });
    sessionStore.set(sessionId, history);

    saveMessage(sessionId, 'user', text.trim());
    saveMessage(sessionId, 'assistant', aiText);

    console.log(`[Chat] User: "${text}" → Ava: "${aiText.substring(0, 80)}..."`);

    res.json({
      response: aiText,
      history: history.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content?.[0]?.text || '',
      })),
    });
  } catch (err) {
    console.error('[Chat Error]', err.message);
    next(err);
  }
});

/**
 * DELETE /api/chat/:sessionId
 */
router.delete('/:sessionId', (req, res) => {
  sessionStore.delete(req.params.sessionId);
  res.json({ cleared: true });
});

module.exports = router;
