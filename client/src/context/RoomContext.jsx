import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { SOCKET_EVENTS } from '../utils/constants';
import { api } from '../services/api';
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
  const [currentUser, setCurrentUser] = useState(null);

  // Asynchronous execution streaming state
  const [executionState, setExecutionState] = useState({
    jobId: null,
    status: 'idle', // 'idle' | 'queued' | 'running' | 'completed' | 'failed'
    output: '',
    error: '',
    exitCode: null,
    executionTime: 0
  });

  const roomIdRef = useRef(null);
  const usernameRef = useRef(null);
  roomIdRef.current = roomId;

  useEffect(() => {
    if (!socket) return;

    // Room info received after joining
    const handleRoomInfo = (data) => {
      setRoomInfo(data);
      setUsers(data.users || []);
      setLanguage(data.language || 'javascript');
      if (data.code !== undefined) {
        setCode(data.code);
      }
      setIsInterviewRoom(data.isInterviewRoom || false);

      const foundUser = (data.users || []).find(u => u.socketId === socket.id);
      if (foundUser) {
        setCurrentUser(foundUser);
      }
      toast.success(`Connected to room: ${data.name}`);
    };

    // Users list update
    const handleUsers = (usersList) => {
      setUsers(usersList);
      const foundUser = usersList.find(u => u.socketId === socket.id);
      if (foundUser) {
        setCurrentUser(foundUser);
      }
    };

    // User joined/left toasts
    const handleUserJoined = (user) => {
      toast.success(`${user.username} joined the room`);
    };

    const handleUserLeft = (userId) => {
      // Handled via room:users
    };

    // Language changed by peer
    const handleLanguageChange = (newLanguage) => {
      setLanguage(newLanguage);
      toast(`Language switched to ${newLanguage}`, { icon: '🔄' });
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

    // Real-time execution events
    const handleExecutionStatus = ({ jobId, status }) => {
      setExecutionState((prev) => ({
        ...prev,
        jobId,
        status,
        output: status === 'running' ? (prev.output ? prev.output + '\n[Execution started...]\n' : '[Execution started...]\n') : prev.output
      }));
    };

    const handleExecutionOutput = ({ jobId, chunk, type }) => {
      setExecutionState((prev) => ({
        ...prev,
        jobId,
        output: type === 'stderr' ? prev.output : prev.output + chunk,
        error: type === 'stderr' ? prev.error + chunk : prev.error
      }));
    };

    const handleExecutionResult = ({ jobId, status, output, error, exitCode, executionTime }) => {
      setExecutionState({
        jobId,
        status,
        output: output || '',
        error: error || '',
        exitCode: exitCode ?? 0,
        executionTime: executionTime || 0
      });

      if (status === 'completed' && exitCode === 0) {
        toast.success(`Execution completed in ${executionTime || 0}ms`);
      } else {
        toast.error(`Execution finished with errors (${exitCode ?? 1})`);
      }
    };

    // Graceful socket reconnection handling
    const handleReconnect = () => {
      if (roomIdRef.current && usernameRef.current) {
        console.log('[Socket] Reconnected, re-joining room:', roomIdRef.current);
        socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
          roomId: roomIdRef.current,
          username: usernameRef.current
        });
        toast.success('Reconnected to room');
      }
    };

    const handleError = (data) => {
      toast.error(data.message || 'An error occurred');
    };

    socket.on(SOCKET_EVENTS.ROOM_INFO, handleRoomInfo);
    socket.on(SOCKET_EVENTS.ROOM_USERS, handleUsers);
    socket.on(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
    socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
    socket.on(SOCKET_EVENTS.LANGUAGE_CHANGE, handleLanguageChange);
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
    socket.on(SOCKET_EVENTS.SNAPSHOT_SAVED, handleSnapshotSaved);
    socket.on(SOCKET_EVENTS.ERROR, handleError);

    socket.on('execution:status', handleExecutionStatus);
    socket.on('execution:output', handleExecutionOutput);
    socket.on('execution:result', handleExecutionResult);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_INFO, handleRoomInfo);
      socket.off(SOCKET_EVENTS.ROOM_USERS, handleUsers);
      socket.off(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
      socket.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
      socket.off(SOCKET_EVENTS.LANGUAGE_CHANGE, handleLanguageChange);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
      socket.off(SOCKET_EVENTS.SNAPSHOT_SAVED, handleSnapshotSaved);
      socket.off(SOCKET_EVENTS.ERROR, handleError);

      socket.off('execution:status', handleExecutionStatus);
      socket.off('execution:output', handleExecutionOutput);
      socket.off('execution:result', handleExecutionResult);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket]);

  const joinRoom = useCallback((id, username) => {
    setRoomId(id);
    usernameRef.current = username;
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
    setCurrentUser(null);
  }, [socket, roomId]);

  const updateCode = useCallback((newCode) => {
    setCode(newCode);
  }, []);

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

  const runCode = useCallback(async (currentCode, currentLang, stdin = '') => {
    setExecutionState({
      jobId: null,
      status: 'queued',
      output: 'Queueing execution job in BullMQ...\n',
      error: '',
      exitCode: null,
      executionTime: 0
    });

    try {
      const res = await api.executeCode(currentCode, currentLang, roomId, stdin);
      setExecutionState((prev) => ({
        ...prev,
        jobId: res.jobId,
        status: 'queued',
        output: `Job enqueued (Job ID: ${res.jobId})\nWaiting for worker...\n`
      }));

      // Polling fallback in case WebSocket stream is delayed
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(pollTimer);
          return;
        }

        try {
          const statusRes = await api.getExecutionStatus(res.jobId);
          if (statusRes && (statusRes.status === 'completed' || statusRes.status === 'failed')) {
            clearInterval(pollTimer);
            setExecutionState({
              jobId: res.jobId,
              status: statusRes.status,
              output: statusRes.output || '',
              error: statusRes.error || '',
              exitCode: statusRes.exitCode ?? 0,
              executionTime: statusRes.executionTime || 0
            });
          }
        } catch (e) {}
      }, 1000);
    } catch (err) {
      setExecutionState({
        jobId: null,
        status: 'failed',
        output: '',
        error: err.message || 'Failed to submit execution request',
        exitCode: -1,
        executionTime: 0
      });
      toast.error(err.message || 'Failed to submit execution request');
    }
  }, [roomId]);

  const clearExecutionOutput = useCallback(() => {
    setExecutionState({
      jobId: null,
      status: 'idle',
      output: '',
      error: '',
      exitCode: null,
      executionTime: 0
    });
  }, []);

  return (
    <RoomContext.Provider value={{
      roomId, roomInfo, users, language, code, chatMessages, snapshots,
      isInterviewRoom, currentUser,
      executionState, runCode, clearExecutionOutput,
      joinRoom, leaveRoom, updateCode,
      sendMessage, changeLanguage, saveSnapshot, restoreSnapshot
    }}>
      {children}
    </RoomContext.Provider>
  );
};
