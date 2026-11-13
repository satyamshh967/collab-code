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
  roomIdRef.current = roomId;
  // Active fallback poller for the current execution job (cancelled on new run/result/unmount)
  const pollRef = useRef({ timer: null, jobId: null });
  // Returns the live editor text; set by CodeEditor so runs never use debounced state
  const codeGetterRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current.timer) clearInterval(pollRef.current.timer);
    pollRef.current = { timer: null, jobId: null };
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

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
      setChatMessages(Array.isArray(data.chatMessages) ? data.chatMessages : []);
      setSnapshots(Array.isArray(data.snapshots) ? data.snapshots : []);

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

    // Language changed by a peer (the server doesn't echo our own change back)
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
      toast.success(`Snapshot "${snapshot.label}" saved`);
    };

    const handleSnapshotRestored = ({ label, restoredBy }) => {
      toast(`${restoredBy} restored snapshot "${label}"`, { icon: '⏪' });
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
      if (pollRef.current.jobId === jobId) stopPolling();
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

    const handleError = (data) => {
      toast.error(data.message || 'An error occurred');
    };

    socket.on(SOCKET_EVENTS.ROOM_INFO, handleRoomInfo);
    socket.on(SOCKET_EVENTS.ROOM_USERS, handleUsers);
    socket.on(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
    socket.on(SOCKET_EVENTS.LANGUAGE_CHANGE, handleLanguageChange);
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
    socket.on(SOCKET_EVENTS.SNAPSHOT_SAVED, handleSnapshotSaved);
    socket.on(SOCKET_EVENTS.SNAPSHOT_RESTORED, handleSnapshotRestored);
    socket.on(SOCKET_EVENTS.ERROR, handleError);

    socket.on('execution:status', handleExecutionStatus);
    socket.on('execution:output', handleExecutionOutput);
    socket.on('execution:result', handleExecutionResult);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_INFO, handleRoomInfo);
      socket.off(SOCKET_EVENTS.ROOM_USERS, handleUsers);
      socket.off(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
      socket.off(SOCKET_EVENTS.LANGUAGE_CHANGE, handleLanguageChange);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
      socket.off(SOCKET_EVENTS.SNAPSHOT_SAVED, handleSnapshotSaved);
      socket.off(SOCKET_EVENTS.SNAPSHOT_RESTORED, handleSnapshotRestored);
      socket.off(SOCKET_EVENTS.ERROR, handleError);

      socket.off('execution:status', handleExecutionStatus);
      socket.off('execution:output', handleExecutionOutput);
      socket.off('execution:result', handleExecutionResult);
    };
  }, [socket, stopPolling]);

  // Rejoining after a reconnect is driven by RoomPage, which re-runs joinRoom
  // whenever the socket's connected state flips back to true.
  const joinRoom = useCallback((id, username) => {
    setRoomId(id);
    if (socket) {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: id, username });
    }
  }, [socket]);

  // Stable identity (reads roomId from a ref) so effects depending on it don't
  // re-run on every room change and trigger a leave/join loop.
  const leaveRoom = useCallback(() => {
    // While disconnected the server has already dropped us; a buffered leave
    // would only be replayed after reconnect.
    if (socket && socket.connected && roomIdRef.current) {
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId: roomIdRef.current });
    }
    stopPolling();
    setRoomId(null);
    setRoomInfo(null);
    setUsers([]);
    setCode('');
    setChatMessages([]);
    setSnapshots([]);
    setCurrentUser(null);
  }, [socket, stopPolling]);

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

  const registerCodeGetter = useCallback((getter) => {
    codeGetterRef.current = getter;
  }, []);

  const runCode = useCallback(async (currentCode, currentLang, stdin = '') => {
    stopPolling();
    const liveCode = codeGetterRef.current ? codeGetterRef.current() : currentCode;
    setExecutionState({
      jobId: null,
      status: 'queued',
      output: 'Queueing execution job in BullMQ...\n',
      error: '',
      exitCode: null,
      executionTime: 0
    });

    try {
      const res = await api.executeCode(liveCode, currentLang, roomId, stdin);
      setExecutionState((prev) => ({
        ...prev,
        jobId: res.jobId,
        status: 'queued',
        output: `Job enqueued (Job ID: ${res.jobId})\nWaiting for worker...\n`
      }));

      // Polling fallback in case the WebSocket result is delayed or Redis is offline
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          if (pollRef.current.timer === pollTimer) stopPolling();
          return;
        }

        try {
          const statusRes = await api.getExecutionStatus(res.jobId);
          // Ignore responses for a job that is no longer the active one
          if (pollRef.current.jobId !== res.jobId) return;
          if (statusRes && (statusRes.status === 'completed' || statusRes.status === 'failed')) {
            stopPolling();
            setExecutionState({
              jobId: res.jobId,
              status: statusRes.status,
              output: statusRes.output || '',
              error: statusRes.error || '',
              exitCode: statusRes.exitCode ?? 0,
              executionTime: statusRes.executionTime || 0
            });
          }
        } catch (e) {
          // Transient network error: keep polling until attempts run out
        }
      }, 1000);
      pollRef.current = { timer: pollTimer, jobId: res.jobId };
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
  }, [roomId, stopPolling]);

  const clearExecutionOutput = useCallback(() => {
    stopPolling();
    setExecutionState({
      jobId: null,
      status: 'idle',
      output: '',
      error: '',
      exitCode: null,
      executionTime: 0
    });
  }, [stopPolling]);

  return (
    <RoomContext.Provider value={{
      roomId, roomInfo, users, language, code, chatMessages, snapshots,
      isInterviewRoom, currentUser,
      executionState, runCode, clearExecutionOutput, registerCodeGetter,
      joinRoom, leaveRoom, updateCode,
      sendMessage, changeLanguage, saveSnapshot, restoreSnapshot
    }}>
      {children}
    </RoomContext.Provider>
  );
};
