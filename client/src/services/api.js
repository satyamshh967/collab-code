const BASE_URL = 'http://localhost:3001/api';

export const api = {
  createRoom: async (data) => {
    const res = await fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create room');
    return res.json();
  },
  joinRoom: async (roomId) => {
    return { success: true };
  },
  getRooms: async () => {
    const res = await fetch(`${BASE_URL}/rooms`);
    if (!res.ok) throw new Error('Failed to fetch rooms');
    return res.json();
  },
  getRoomInfo: async (roomId) => {
    const res = await fetch(`${BASE_URL}/rooms/${roomId}`);
    if (!res.ok) throw new Error('Failed to fetch room info');
    return res.json();
  },
  executeCode: async (code, language) => {
    const res = await fetch(`${BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language })
    });
    if (!res.ok) throw new Error('Failed to execute code');
    return res.json();
  }
};
