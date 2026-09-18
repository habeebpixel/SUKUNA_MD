/**
 * Retrieve Store — silent deleted-message vault
 *
 * Silently captures every deleted message (text, image, video, sticker,
 * audio, document) from ALL chats — groups AND DMs — and holds them in
 * memory for 2 hours.  Only the bot owner can access stored entries via
 * the .retrieve command.
 *
 * Entry shape:
 *   {
 *     id          : string          — original message ID
 *     jid         : string          — chat JID (group or DM)
 *     sender      : string          — full JID of original sender
 *     senderNum   : string          — sender phone (no @s)
 *     deleter     : string          — full JID who deleted it
 *     deleterNum  : string          — deleter phone (no @s)
 *     type        : string          — 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker'
 *     body        : string | null   — text body (type=text only)
 *     caption     : string | null   — media caption
 *     mimetype    : string | null
 *     fileName    : string | null   — for documents
 *     ptt         : boolean         — voice note flag
 *     mediaBuffer : Buffer | null   — raw bytes for media types
 *     deletedAt   : number          — Date.now() at capture time
 *   }
 */
'use strict';

const TTL_MS      = 2 * 60 * 60 * 1000; // 2 hours
const MAX_ENTRIES = 600;                  // per bot session

// Map<phoneNumber, Entry[]>
const _store = new Map();

// ── Public API ────────────────────────────────────────────────────

function add(phoneNumber, entry) {
    if (!phoneNumber || !entry) return;
    if (!_store.has(phoneNumber)) _store.set(phoneNumber, []);
    const list = _store.get(phoneNumber);
    list.push({ ...entry, deletedAt: Date.now() });
    // hard cap — drop oldest
    while (list.length > MAX_ENTRIES) list.shift();
}

/**
 * Returns all non-expired entries for this session, newest first.
 * Optionally filter by jid.
 */
function getAll(phoneNumber, filterJid = null) {
    const list = _store.get(phoneNumber) || [];
    const now  = Date.now();
    let result = list.filter(e => (now - e.deletedAt) < TTL_MS);
    if (filterJid) result = result.filter(e => e.jid === filterJid);
    return result.slice().reverse(); // newest first
}

/** Total unexpired count. */
function count(phoneNumber) {
    return getAll(phoneNumber).length;
}

function getById(phoneNumber, id, jid = null) {
    if (!id) return null;
    return getAll(phoneNumber, jid).find(entry => entry.id === id) || null;
}

/** Wipe vault for this session. */
function clear(phoneNumber) {
    _store.set(phoneNumber, []);
}

// ── Housekeeping ──────────────────────────────────────────────────

function _purgeExpired() {
    const now = Date.now();
    for (const [pn, list] of _store) {
        const fresh = list.filter(e => (now - e.deletedAt) < TTL_MS);
        _store.set(pn, fresh);
    }
}

// Run every 20 minutes — unref so it doesn't block process exit
setInterval(_purgeExpired, 20 * 60 * 1000).unref();

module.exports = { add, getAll, getById, count, clear };
