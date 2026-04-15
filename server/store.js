// Shared in-memory stores — imported by server.js and routes alike (no circular dep)
const audioStore = new Map();   // audioId  → { buffer, mimeType }
const sessionStore = new Map(); // sessionId → messages[]

module.exports = { audioStore, sessionStore };
