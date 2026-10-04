import { v4 as uuidv4 } from 'uuid';

export const generateId = () => {
  return uuidv4();
};

const colors = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#33FFA1',
  '#A133FF', '#FFA133', '#33A1FF', '#A1FF33', '#FF3333',
  '#33FF33', '#3333FF'
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
