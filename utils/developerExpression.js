'use strict';

function serialize(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
    return JSON.stringify(value, (_key, item) => Buffer.isBuffer(item) ? `[Buffer ${item.length} bytes]` : item, 2);
}

function evaluateDeveloperExpression(expression, m) {
    const source = String(expression || '').trim().replace(/^\$\s*/, '');
    if (!source.startsWith('m')) return { handled: false };
    const path = source.slice(1).replace(/\?\./g, '.');
    if (path && !/^(?:\.(?:quoted|message|key|sender|participant|chat|text|type|isMedia)(?:\.message|\.key|\.sender|\.participant|\.chat|\.text|\.type|\.isMedia)*)?$/.test(path)) {
        return { handled: true, error: 'Only safe m properties are available: m.quoted.message, m.quoted.text, m.sender, m.chat, and related fields.' };
    }
    const parts = path ? path.slice(1).split('.') : [];
    let value = m;
    for (const part of parts) value = value == null ? undefined : value[part];
    return { handled: true, value, output: serialize(value) };
}

module.exports = { evaluateDeveloperExpression };
