export const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const pick = (items) => items[Math.floor(Math.random() * items.length)];

export const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
