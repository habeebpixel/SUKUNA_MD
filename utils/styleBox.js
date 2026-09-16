/**
 * styleBox — Sukuna MD shared text styling helpers.
 * Bold-italic Unicode + boxed reply wrapper used across every command.
 */

// Mathematical Sans-Serif Bold Italic block (𝘼𝘽𝘾 / 𝙖𝙗𝙘)
function boldItalic(str) {
    const upperBase = 0x1D63C;
    const lowerBase = 0x1D656;
    let out = '';
    for (const ch of String(str)) {
        const c = ch.codePointAt(0);
        if (c >= 0x41 && c <= 0x5A)      out += String.fromCodePoint(upperBase + (c - 0x41));
        else if (c >= 0x61 && c <= 0x7A) out += String.fromCodePoint(lowerBase + (c - 0x61));
        else out += ch;
    }
    return out;
}

// Mathematical Sans-Serif Bold block (𝐀𝐁𝐂 / 𝐚𝐛𝐜 / 𝟎𝟏𝟐).
function boldSans(str) {
    const upperBase = 0x1D5D4;
    const lowerBase = 0x1D5EE;
    const digitBase = 0x1D7EC;
    let out = '';
    for (const ch of String(str)) {
        const c = ch.codePointAt(0);
        if (c >= 0x41 && c <= 0x5A)      out += String.fromCodePoint(upperBase + (c - 0x41));
        else if (c >= 0x61 && c <= 0x7A) out += String.fromCodePoint(lowerBase + (c - 0x61));
        else if (c >= 0x30 && c <= 0x39) out += String.fromCodePoint(digitBase + (c - 0x30));
        else out += ch;
    }
    return out;
}

// Wrap plain text into the signature Sukuna MD boxed card.
// If the text already looks like a box (starts with ╭ or ╔), pass it through.
function boxify(text, title = 'SUKUNA MD') {
    const raw = String(text == null ? '' : text);
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    if (trimmed.startsWith('╭') || trimmed.startsWith('╔') || trimmed.startsWith('┌')) {
        return raw;
    }

    const lines = raw.split('\n');
    let out = '';
    out += `╭─❒ ◈ ${boldItalic(title)} ❒\n`;
    for (const line of lines) {
        // keep blank lines as light separators inside the box
        if (line.trim() === '') { out += `│\n`; continue; }
        out += `│ ${line}\n`;
    }
    out += `╰─⛧ ${boldItalic('Sukuna MD')}`;
    return out;
}

module.exports = { boldItalic, boldSans, boxify };
