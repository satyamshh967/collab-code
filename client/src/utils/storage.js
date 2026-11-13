import { generateUsername } from './helpers';

// localStorage can throw (private mode, blocked storage), so every access is guarded.
const read = (key, fallback = null) => {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (e) {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    // Non-critical: the app works without persistence
  }
};

const readJson = (key, fallback) => {
  try {
    const raw = read(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

const USERNAME_KEY = 'codecollab_username';
const RECENT_ROOMS_KEY = 'codecollab_recent_rooms';
const EDITOR_SETTINGS_KEY = 'codecollab_editor_settings';
const LAYOUT_KEY = 'codecollab_layout';

export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const getUsername = () => read(USERNAME_KEY, '');

export const setUsername = (name) => write(USERNAME_KEY, name);

/** Returns the saved display name, creating and saving one if missing, so a
 *  guest keeps the same name across reconnects and reloads. */
export const getOrCreateUsername = () => {
  const existing = getUsername().trim();
  if (existing) return existing;
  const generated = generateUsername();
  setUsername(generated);
  return generated;
};

export const getRecentRooms = () => {
  const rooms = readJson(RECENT_ROOMS_KEY, []);
  return Array.isArray(rooms) ? rooms.filter((r) => r && ROOM_ID_PATTERN.test(r.id)) : [];
};

export const rememberRoom = ({ id, name, language }) => {
  if (!id || !ROOM_ID_PATTERN.test(id)) return;
  const rest = getRecentRooms().filter((r) => r.id !== id);
  const entry = { id, name: name || `Room ${id}`, language: language || 'javascript', visitedAt: Date.now() };
  write(RECENT_ROOMS_KEY, JSON.stringify([entry, ...rest].slice(0, 8)));
};

export const forgetRoom = (id) => {
  write(RECENT_ROOMS_KEY, JSON.stringify(getRecentRooms().filter((r) => r.id !== id)));
};

export const DEFAULT_EDITOR_SETTINGS = { fontSize: 14, minimap: false, wordWrap: true };

export const getEditorSettings = () => ({ ...DEFAULT_EDITOR_SETTINGS, ...readJson(EDITOR_SETTINGS_KEY, {}) });

export const saveEditorSettings = (settings) => write(EDITOR_SETTINGS_KEY, JSON.stringify(settings));

export const DEFAULT_LAYOUT = { sidebarOpen: true, outputHeight: 260 };

export const getLayout = () => ({ ...DEFAULT_LAYOUT, ...readJson(LAYOUT_KEY, {}) });

export const saveLayout = (layout) => write(LAYOUT_KEY, JSON.stringify(layout));

export const generateRoomId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
};
