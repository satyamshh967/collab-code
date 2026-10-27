import crypto from 'crypto';

export const generateId = () => {
  const hex = crypto.randomBytes(4).toString('hex');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
};

const colors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#d946ef'
];

export const generateColor = (existingColors = []) => {
  const availableColors = colors.filter(c => !existingColors.includes(c));
  if (availableColors.length === 0) {
    return colors[Math.floor(Math.random() * colors.length)];
  }
  return availableColors[Math.floor(Math.random() * availableColors.length)];
};

export const formatTimestamp = (date = new Date()) => {
  return date.toISOString();
};

export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
};
