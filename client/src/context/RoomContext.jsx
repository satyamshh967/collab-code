import React, { createContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { SOCKET_EVENTS } from '../utils/constants';
import { api } from '../services/api';
import { fireEmojiBurst } from '../utils/confetti';
import toast from 'react-hot-toast';

export const RoomContext = createContext();

const IDLE_EXECUTION = {
  jobId: null,
  status: 'idle', // 'idle' | 'queued' | 'running' | 'completed' | 'failed'
  output: '',
  error: '',
  exitCode: null,
  executionTime: 0,
  runBy: null,      // display name of whoever started the run
  isOwnRun: false   // true when this browser started the run
};

export const RoomProvider = ({ children }) => {
  const { socket } = useSocket();
  const [roomId, setRoomId] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const [language, setLanguage] = useState('javascript');
  const [chatMessages, setChatMessages] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [isInterviewRoom, setIsInterviewRoom] = useState(false);
  const [interview, setInterview] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('connecting'); // Yjs: 'connecting' | 'connected' | 'disconnected'
  const [editor, setEditor] = useState(null); // Monaco instance, for status bar / toolbar actions
  const [executionState, setExecutionState] = useState(IDLE_EXECUTION);

  const roomIdRef = useRef(null);
  roomIdRef.current = roomId;
  const currentUserRef = useRef(null);
  currentUserRef.current = currentUser;
  // Active fallback poller for the current execution job (cancelled on new run/result/unmount)
  const pollRef = useRef({ timer: null, jobId: null });
  // Returns the live editor text; set by CodeEditor so runs never read stale state
  const codeGetterRef = useRef(null);
  // Jobs started from this browser, and who started jobs we've heard about
  const ownJobsRef = useRef(new Set());
  const jobOwnersRef = useRef(new Map());

  const stopPolling = useCallback(() => {
    if (pollRef.current.timer) clearInterval(pollRef.current.timer);
    pollRef.current = { timer: null, jobId: null };
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    if (!socket) return;

    const syncCurrentUser = (list) => {
      const me = list.find((u) => u.socketId === socket.id);
      if (me) setCurrentUser(me);
    };

    const handleRoomInfo = (data) => {
      setRoomInfo(data);
      setUsers(data.users || []);
      setLanguage(data.language || 'javascript');
      setIsInterviewRoom(Boolean(data.isInterviewRoom));
      setInterview(data.interview || null);
      setChatMessages(Array.isArray(data.chatMessages) ? data.chatMessages : []);
      setSnapshots(Array.isArray(data.snapshots) ? data.snapshots : []);
      syncCurrentUser(data.users || []);
    };

    const handleUsers = (list) => {
      setUsers(list);
      syncCurrentUser(list);
    };

    const handleUserJoined = (user) => {
      toast(`${user.username} joined`, { icon: '👋', id: `join-${user.id}` });
    };

    // Language changed by a peer (the server doesn't echo our own change back)
    const handleLanguageChange = (newLanguage) => {
      setLanguage(newLanguage);
      toast(`Language switched to ${newLanguage}`, { icon: '🔄', id: 'language-change' });
    };

    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev.slice(-199), msg]);
    };

    const handleSnapshotSaved = (snapshot) => {
      setSnapshots((prev) => [...prev, snapshot]);
      toast.success(`Snapshot "${snapshot.label}" saved`);
    };

    const handleSnapshotRestored = ({ label, restoredBy }) => {
      toast(`${restoredBy} restored "${label}"`, { icon: '⏪' });
    };

    const handleReaction = ({ emoji, userId }) => {
      // Our own burst was already shown optimistically when we clicked
      if (userId && userId === currentUserRef.current?.id) return;
      fireEmojiBurst(emoji);
    };

    const handleInterviewUpdate = (data) => setInterview(data);

    // Real-time execution events (from our runs and our collaborators')
    const handleExecutionStatus = ({ jobId, status, runBy }) => {
      if (runBy) jobOwnersRef.current.set(jobId, runBy);
      setExecutionState((prev) => {
        // A peer's run starting replaces whatever is in the panel
        const isNewJob = prev.jobId !== jobId;
        const isOwnRun = ownJobsRef.current.has(jobId);
        if (isNewJob && !isOwnRun && status === 'queued') {
          return { ...IDLE_EXECUTION, jobId, status, runBy: runBy || null };
        }
        return { ...prev, jobId, status, runBy: prev.runBy || runBy || null, isOwnRun };
      });
    };

    const handleExecutionOutput = ({ jobId, chunk, type }) => {
      setExecutionState((prev) => (prev.jobId !== jobId ? prev : {
        ...prev,
        output: type === 'stderr' ? prev.output : prev.output + chunk,
        error: type === 'stderr' ? prev.error + chunk : prev.error
      }));
    };

    const handleExecutionResult = ({ jobId, status, output, error, exitCode, executionTime }) => {
      if (pollRef.current.jobId === jobId) stopPolling();
      const isOwnRun = ownJobsRef.current.has(jobId);
      setExecutionState({
        jobId,
        status,
        output: output || '',
        error: error || '',
        exitCode: exitCode ?? 0,
        executionTime: executionTime || 0,
        runBy: jobOwnersRef.current.get(jobId) || null,
        isOwnRun
      });
    };

    const handleError = (data) => {
      toast.error(data?.message || 'An error occurred');
    };

    const handlers = {
      [SOCKET_EVENTS.ROOM_INFO]: handleRoomInfo,
      [SOCKET_EVENTS.ROOM_USERS]: handleUsers,
      [SOCKET_EVENTS.USER_JOINED]: handleUserJoined,
      [SOCKET_EVENTS.LANGUAGE_CHANGE]: handleLanguageChange,
      [SOCKET_EVENTS.CHAT_MESSAGE]: handleChatMessage,
      [SOCKET_EVENTS.SNAPSHOT_SAVED]: handleSnapshotSaved,
      [SOCKET_EVENTS.SNAPSHOT_RESTORED]: handleSnapshotRestored,
      [SOCKET_EVENTS.REACTION]: handleReaction,
      [SOCKET_EVENTS.INTERVIEW_UPDATE]: handleInterviewUpdate,
      [SOCKET_EVENTS.ERROR]: handleError,
      'execution:status': handleExecutionStatus,
      'execution:output': handleExecutionOutput,
      'execution:result': handleExecutionResult
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
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
    setChatMessages([]);
    setSnapshots([]);
    setCurrentUser(null);
    setInterview(null);
    setIsInterviewRoom(false);
    setExecutionState(IDLE_EXECUTION);
  }, [socket, stopPolling]);

  const emitToRoom = useCallback((event, payload = {}) => {
    if (socket && roomIdRef.current) {
      socket.emit(event, { roomId: roomIdRef.current, ...payload });
    }
  }, [socket]);

  const sendMessage = useCallback((text) => emitToRoom(SOCKET_EVENTS.CHAT_MESSAGE, { text }), [emitToRoom]);

  const sendReaction = useCallback((emoji) => {
    fireEmojiBurst(emoji); // optimistic local burst
    emitToRoom(SOCKET_EVENTS.REACTION, { emoji });
  }, [emitToRoom]);

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    emitToRoom(SOCKET_EVENTS.LANGUAGE_CHANGE, { language: lang });
  }, [emitToRoom]);

  const saveSnapshot = useCallback((label) => emitToRoom(SOCKET_EVENTS.SAVE_SNAPSHOT, { label }), [emitToRoom]);
  const restoreSnapshot = useCallback((snapshotId) => emitToRoom(SOCKET_EVENTS.RESTORE_SNAPSHOT, { snapshotId }), [emitToRoom]);
  const endInterview = useCallback(() => emitToRoom(SOCKET_EVENTS.INTERVIEW_END), [emitToRoom]);
  const extendInterview = useCallback(() => emitToRoom(SOCKET_EVENTS.INTERVIEW_EXTEND), [emitToRoom]);

  const registerCodeGetter = useCallback((getter) => {
    codeGetterRef.current = getter;
  }, []);

  const getCurrentCode = useCallback(() => (codeGetterRef.current ? codeGetterRef.current() : ''), []);

  const runCode = useCallback(async (currentLang, stdin = '') => {
    stopPolling();
    const code = getCurrentCode();
    const runBy = currentUserRef.current?.username || null;
    if (!code.trim()) {
      toast.error('Nothing to run yet: the editor is empty');
      return;
    }

    setExecutionState({ ...IDLE_EXECUTION, status: 'queued', runBy, isOwnRun: true });

    try {
      const res = await api.executeCode({ code, language: currentLang, roomId: roomIdRef.current, stdin, runBy });
      ownJobsRef.current.add(res.jobId);
      setExecutionState((prev) => (prev.jobId && prev.jobId !== res.jobId && prev.status !== 'queued'
        ? prev // a socket result for this job already landed
        : { ...prev, jobId: res.jobId, status: prev.jobId === res.jobId ? prev.status : 'queued', isOwnRun: true }));

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
              executionTime: statusRes.executionTime || 0,
              runBy,
              isOwnRun: true
            });
          } else if (statusRes?.status === 'running') {
            setExecutionState((prev) => (prev.jobId === res.jobId && prev.status === 'queued'
              ? { ...prev, status: 'running' } : prev));
          }
        } catch (e) {
          // Transient network error: keep polling until attempts run out
        }
      }, 700);
      pollRef.current = { timer: pollTimer, jobId: res.jobId };
    } catch (err) {
      setExecutionState({
        ...IDLE_EXECUTION,
        status: 'failed',
        error: err.message || 'Failed to submit execution request',
        exitCode: -1,
        runBy,
        isOwnRun: true
      });
      toast.error(err.message || 'Failed to submit execution request');
    }
  }, [stopPolling, getCurrentCode]);

  const clearExecutionOutput = useCallback(() => {
    stopPolling();
    setExecutionState(IDLE_EXECUTION);
  }, [stopPolling]);

  // Memoized so consumers only re-render when something they read changes
  const value = useMemo(() => ({
    roomId, roomInfo, users, language, chatMessages, snapshots,
    isInterviewRoom, interview, currentUser, syncStatus, editor,
    executionState,
    joinRoom, leaveRoom, sendMessage, sendReaction, changeLanguage,
    saveSnapshot, restoreSnapshot, endInterview, extendInterview,
    runCode, clearExecutionOutput, registerCodeGetter, getCurrentCode,
    setSyncStatus, setEditor
  }), [
    roomId, roomInfo, users, language, chatMessages, snapshots,
    isInterviewRoom, interview, currentUser, syncStatus, editor,
    executionState,
    joinRoom, leaveRoom, sendMessage, sendReaction, changeLanguage,
    saveSnapshot, restoreSnapshot, endInterview, extendInterview,
    runCode, clearExecutionOutput, registerCodeGetter, getCurrentCode
  ]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
