import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { SOCKET_EVENTS } from '../utils/constants';
import toast from 'react-hot-toast';

export const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const { socket } = useSocket();
  const [roomId, setRoomId] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [isInterviewRoom, setIsInterviewRoom] = useState(false);
  const [cursors, setCursors] = useState({});
  const isRemoteChange = useRef(false);

  useEffect(() => {
    if (!socket) return;

    // Room info received after joining
    const handleRoomInfo = (data) => {
      setRoomInfo(data);
      setUsers(data.users || []);
      setLanguage(data.language || 'javascript');
      setCode(data.code || '');
      setIsInterviewRoom(data.isInterviewRoom || false);
      toast.success(`Joined room: ${data.name}`);
    };

    // Users list update
    const handleUsers = (usersList) => {
      setUsers(usersList);
    };

    // A user joined
    const handleUserJoined = (user) => {
      toast.success(`${user.username} joined the room`);
    };

    // A user left
    const handleUserLeft = (userId) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    // Code changed by another user
    const handleCodeChange = (data) => {
      isRemoteChange.current = true;
      setCode(data.code);
    };

    // Language changed
    const handleLanguageChange = (newLanguage) => {
      setLanguage(newLanguage);
      toast(`Language changed to ${newLanguage}`, { icon: '🔄' });
    };

    // Cursor updates from other users
    const handleCursor = (data) => {
      setCursors((prev) => ({
        ...prev,
        [data.userId]: {
          username: data.username,
          color: data.color,
          position: data.cursorPosition,
        },
      }));
    };

    // Chat message received
    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    // Snapshot saved
    const handleSnapshotSaved = (snapshot) => {
      setSnapshots((prev) => [...prev, snapshot]);
      toast.success('Snapshot saved');
    };

    // Error from server
    const handleError = (data) => {
      toast.error(data.message || 'An error occurred');
    };

    socket.on(SOCKET_EVENTS.ROOM_INFO, handleRoomInfo);
    socket.on(SOCKET_EVENTS.ROOM_USERS, handleUsers);
    socket.on(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
    socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
    socket.on(SOCKET_EVENTS.CODE_CHANGE, handleCodeChange);
    socket.on(SOCKET_EVENTS.LANGUAGE_CHANGE, handleLanguageChange);
    socket.on(SOCKET_EVENTS.CURSOR_CHANGE, handleCursor);
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
    socket.on(SOCKET_EVENTS.SNAPSHOT_SAVED, handleSnapshotSaved);
    socket.on(SOCKET_EVENTS.ERROR, handleError);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_INFO, handleRoomInfo);
      socket.off(SOCKET_EVENTS.ROOM_USERS, handleUsers);
      socket.off(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
      socket.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
      socket.off(SOCKET_EVENTS.CODE_CHANGE, handleCodeChange);
      socket.off(SOCKET_EVENTS.LANGUAGE_CHANGE, handleLanguageChange);
      socket.off(SOCKET_EVENTS.CURSOR_CHANGE, handleCursor);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
      socket.off(SOCKET_EVENTS.SNAPSHOT_SAVED, handleSnapshotSaved);
      socket.off(SOCKET_EVENTS.ERROR, handleError);
    };
  }, [socket]);

  const joinRoom = useCallback((id, username) => {
    setRoomId(id);
    if (socket) {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: id, username });
    }
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (socket && roomId) {
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId });
    }
    setRoomId(null);
    setRoomInfo(null);
    setUsers([]);
    setCode('');
    setChatMessages([]);
    setSnapshots([]);
    setCursors({});
  }, [socket, roomId]);

  const updateCode = useCallback((newCode) => {
    // Don't re-emit if this was a remote change
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }
    setCode(newCode);
    if (socket && roomId) {
      socket.emit(SOCKET_EVENTS.CODE_CHANGE, { roomId, code: newCode });
    }
  }, [socket, roomId]);

  const sendCursorPosition = useCallback((cursorPosition) => {
    if (socket && roomId) {
      socket.emit(SOCKET_EVENTS.CURSOR_CHANGE, { roomId, cursorPosition });
    }
  }, [socket, roomId]);

  const sendMessage = useCallback((text) => {
    if (socket && roomId) {
      socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { roomId, text });
    }
  }, [socket, roomId]);

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    if (socket && roomId) {
      socket.emit(SOCKET_EVENTS.LANGUAGE_CHANGE, { roomId, language: lang });
    }
  }, [socket, roomId]);

  const saveSnapshot = useCallback((label) => {
    if (socket && roomId) {
      socket.emit(SOCKET_EVENTS.SAVE_SNAPSHOT, { roomId, label });
    }
  }, [socket, roomId]);

  const restoreSnapshot = useCallback((snapshotId) => {
    if (socket && roomId) {
      socket.emit(SOCKET_EVENTS.RESTORE_SNAPSHOT, { roomId, snapshotId });
    }
  }, [socket, roomId]);

  return (
    <RoomContext.Provider value={{
      roomId, roomInfo, users, language, code, chatMessages, snapshots,
      isInterviewRoom, cursors,
      joinRoom, leaveRoom, updateCode, sendCursorPosition,
      sendMessage, changeLanguage, saveSnapshot, restoreSnapshot
    }}>
      {children}
    </RoomContext.Provider>
  );
};
