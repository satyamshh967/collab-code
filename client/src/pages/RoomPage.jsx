import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Users, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRoom } from '../hooks/useRoom';
import { useSocket } from '../hooks/useSocket';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Editor/OutputPanel';
import ChatPanel from '../components/Chat/ChatPanel';
import UsersList from '../components/Sidebar/UsersList';
import SnapshotPanel from '../components/Sidebar/SnapshotPanel';
import Header from '../components/Layout/Header';
import StatusBar from '../components/Layout/StatusBar';
import InterviewBanner from '../components/Layout/InterviewBanner';
import ShortcutsModal from '../components/Layout/ShortcutsModal';
import {
  ROOM_ID_PATTERN, getOrCreateUsername, rememberRoom,
  getEditorSettings, saveEditorSettings, getLayout, saveLayout
} from '../utils/storage';

const MIN_OUTPUT_HEIGHT = 38;   // collapsed: toolbar only
const MIN_EDITOR_HEIGHT = 140;

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const {
    joinRoom, leaveRoom, isInterviewRoom, users, chatMessages, snapshots,
    roomInfo, saveSnapshot
  } = useRoom();
  const { isConnected } = useSocket();

  const [activeTab, setActiveTab] = useState('chat');
  const [layout, setLayout] = useState(getLayout);
  const [editorSettings, setEditorSettings] = useState(getEditorSettings);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const mainRef = useRef(null);

  const isValidRoom = ROOM_ID_PATTERN.test(roomId || '');

  // Bad URLs (e.g. /room/hello world) go back home instead of a broken workspace
  useEffect(() => {
    if (!isValidRoom) {
      toast.error('That room link is not valid');
      navigate('/', { replace: true });
    }
  }, [isValidRoom, navigate]);

  // Join on mount and again after every reconnect (isConnected flips back to true)
  useEffect(() => {
    if (!isValidRoom || !isConnected) return undefined;
    joinRoom(roomId, getOrCreateUsername());
    return () => leaveRoom();
  }, [roomId, isValidRoom, joinRoom, leaveRoom, isConnected]);

  useEffect(() => {
    if (roomInfo?.id === roomId) {
      rememberRoom({ id: roomInfo.id, name: roomInfo.name, language: roomInfo.language });
      document.title = `${roomInfo.name} · CodeCollab`;
    }
    return () => { document.title = 'CodeCollab'; };
  }, [roomInfo, roomId]);

  // ---- Unread chat counter -------------------------------------------------
  const chatVisible = layout.sidebarOpen && activeTab === 'chat';
  const seenCountRef = useRef(0);
  const [unread, setUnread] = useState(0);
  // History delivered on join counts as already seen (declared first so it
  // runs before the counter below in the same commit)
  useEffect(() => {
    seenCountRef.current = (roomInfo?.chatMessages || []).filter((m) => m.type === 'message').length;
  }, [roomInfo]);
  useEffect(() => {
    const userMessages = chatMessages.filter((m) => m.type === 'message').length;
    if (chatVisible || userMessages < seenCountRef.current) {
      seenCountRef.current = userMessages;
      setUnread(0);
    } else {
      setUnread(userMessages - seenCountRef.current);
    }
  }, [chatMessages, chatVisible]);

  // ---- Persisted layout & editor settings ----------------------------------
  const updateLayout = useCallback((patch) => {
    setLayout((prev) => {
      const next = { ...prev, ...patch };
      saveLayout(next);
      return next;
    });
  }, []);

  const updateEditorSettings = useCallback((patch) => {
    setEditorSettings((prev) => {
      const next = { ...prev, ...patch };
      saveEditorSettings(next);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => updateLayout({ sidebarOpen: !layout.sidebarOpen }), [layout.sidebarOpen, updateLayout]);

  const openTab = useCallback((tab) => {
    setActiveTab(tab);
    updateLayout({ sidebarOpen: true });
  }, [updateLayout]);

  const toggleOutput = useCallback(() => {
    updateLayout({ outputHeight: layout.outputHeight <= MIN_OUTPUT_HEIGHT ? 260 : MIN_OUTPUT_HEIGHT });
  }, [layout.outputHeight, updateLayout]);

  // ---- Drag to resize the output panel -------------------------------------
  const startResize = (e) => {
    e.preventDefault();
    const main = mainRef.current;
    if (!main) return;
    setIsDragging(true);
    const rect = main.getBoundingClientRect();

    const onMove = (ev) => {
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const max = rect.height - MIN_EDITOR_HEIGHT;
      const height = Math.max(MIN_OUTPUT_HEIGHT, Math.min(max, rect.bottom - clientY));
      setLayout((prev) => ({ ...prev, outputHeight: Math.round(height) }));
    };
    const onUp = () => {
      setIsDragging(false);
      setLayout((prev) => { saveLayout(prev); return prev; });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ---- Global shortcuts (Ctrl+Enter to run lives in OutputPanel) -----------
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const typingInField = ['INPUT', 'TEXTAREA'].includes(e.target?.tagName);

      if (mod && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        const label = `Checkpoint ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        saveSnapshot(label);
      } else if (mod && key === 'b') {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      } else if (mod && key === 'j') {
        e.preventDefault();
        e.stopPropagation();
        toggleOutput();
      } else if (mod && e.shiftKey && key === 'm') {
        e.preventDefault();
        openTab('chat');
      } else if (key === '?' && !typingInField && !e.target?.closest?.('.monaco-editor')) {
        e.preventDefault();
        setShowShortcuts(true);
      } else if (key === 'escape') {
        setShowShortcuts(false);
      }
    };
    // Capture phase so these win over Monaco's own bindings
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [saveSnapshot, toggleSidebar, toggleOutput, openTab]);

  if (!isValidRoom) return null;

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, count: unread, accent: unread > 0 },
    { id: 'users', label: 'People', icon: Users, count: users.length },
    { id: 'snapshots', label: 'Snapshots', icon: Camera, count: snapshots.length }
  ];

  return (
    <div className="workspace">
      <Header
        sidebarOpen={layout.sidebarOpen}
        onToggleSidebar={toggleSidebar}
        editorSettings={editorSettings}
        onEditorSettingsChange={updateEditorSettings}
        onShowShortcuts={() => setShowShortcuts(true)}
      />
      {isInterviewRoom && <InterviewBanner />}

      <div className="workspace-body">
        <div className="workspace-main" ref={mainRef}>
          <div className="editor-pane">
            <CodeEditor settings={editorSettings} />
          </div>
          <div
            className={`resize-handle ${isDragging ? 'dragging' : ''}`}
            onPointerDown={startResize}
            onDoubleClick={toggleOutput}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize output panel (double-click to collapse)"
            title="Drag to resize · double-click to collapse"
          />
          <OutputPanel
            height={layout.outputHeight}
            collapsed={layout.outputHeight <= MIN_OUTPUT_HEIGHT}
            onToggleCollapse={toggleOutput}
          />
        </div>

        {layout.sidebarOpen && (
          <aside className="sidebar" aria-label="Room sidebar">
            <div className="sidebar-tabs" role="tablist">
              {tabs.map(({ id, label, icon: Icon, count, accent }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  className={`sidebar-tab ${activeTab === id ? 'active' : ''}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  {count > 0 && <span className={`badge ${accent ? 'accent' : ''}`}>{count}</span>}
                </button>
              ))}
            </div>
            <div className="sidebar-content">
              {activeTab === 'chat' && <ChatPanel />}
              {activeTab === 'users' && <UsersList />}
              {activeTab === 'snapshots' && <SnapshotPanel />}
            </div>
          </aside>
        )}
      </div>

      <StatusBar
        unreadMessages={unread}
        onOpenChat={() => openTab('chat')}
        onOpenPeople={() => openTab('users')}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
};

export default RoomPage;
