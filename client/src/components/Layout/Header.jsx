import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Share2, Check, Copy, SmilePlus, Settings2, Download, PanelRightClose, PanelRightOpen,
  LogOut, Minus, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRoom } from '../../hooks/useRoom';
import { useSocket } from '../../hooks/useSocket';
import { usePopover } from '../../hooks/usePopover';
import LanguageSelector from '../Editor/LanguageSelector';

const QUICK_REACTIONS = ['🔥', '🚀', '🎉', '❤️', '👏', '🧠', '💡', '🐛', '👀', '✅'];

const FILE_EXTENSIONS = {
  javascript: 'js', typescript: 'ts', python: 'py', java: 'java', cpp: 'cpp', go: 'go', rust: 'rs'
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
};

const ConnectionPill = () => {
  const { isConnected } = useSocket();
  const { syncStatus } = useRoom();

  if (!isConnected) {
    return <span className="pill bad" title="Lost connection to the server. Reconnecting automatically..."><span className="spinner" style={{ width: 9, height: 9, borderTopColor: '#f87171' }} />Reconnecting</span>;
  }
  if (syncStatus !== 'connected') {
    return <span className="pill warn" title="Connecting the shared editor..."><span className="spinner" style={{ width: 9, height: 9, borderTopColor: '#fbbf24' }} />Syncing</span>;
  }
  return <span className="pill ok" title="Connected. Edits sync live."><span className="status-dot pulsing" style={{ width: 6, height: 6 }} />Live</span>;
};

const Facepile = ({ users, currentUser }) => {
  const shown = users.slice(0, 5);
  const extra = users.length - shown.length;
  return (
    <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center' }} aria-label={`${users.length} people in this room`}>
      {shown.map((u, idx) => (
        <div
          key={u.id || idx}
          title={`${u.username}${u.id === currentUser?.id ? ' (you)' : ''}${u.isOwner ? ' · host' : ''}`}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: u.color || '#8b5cf6', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
            marginLeft: idx === 0 ? 0 : -7,
            border: '2px solid #141418',
            boxShadow: u.id === currentUser?.id ? '0 0 0 1.5px #a78bfa' : 'none',
            position: 'relative', zIndex: shown.length - idx
          }}
        >
          {(u.username || 'G').charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div style={{ marginLeft: -7, width: 26, height: 26, borderRadius: '50%', background: '#26262e', color: '#d4d4d8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: '2px solid #141418' }}>
          +{extra}
        </div>
      )}
    </div>
  );
};

const Header = ({ sidebarOpen, onToggleSidebar, editorSettings, onEditorSettingsChange, onShowShortcuts }) => {
  const navigate = useNavigate();
  const { roomId, roomInfo, users, currentUser, language, leaveRoom, sendReaction, getCurrentCode } = useRoom();
  const [copiedLink, setCopiedLink] = useState(false);
  const reactions = usePopover();
  const settings = usePopover();

  const handleLeave = () => {
    if (window.confirm('Leave this room? Your code stays here for others.')) {
      leaveRoom();
      navigate('/');
    }
  };

  const copyInviteLink = async () => {
    if (!roomId) return;
    if (await copyText(`${window.location.origin}/room/${roomId}`)) {
      setCopiedLink(true);
      toast.success('Invite link copied');
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error('Could not access the clipboard');
    }
  };

  const copyRoomId = async () => {
    if (roomId && await copyText(roomId)) toast.success(`Room code ${roomId} copied`);
  };

  const downloadCode = () => {
    const code = getCurrentCode();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${language === 'java' ? 'Main' : 'main'}.${FILE_EXTENSIONS[language] || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setFontSize = (delta) => {
    const next = Math.min(24, Math.max(10, editorSettings.fontSize + delta));
    onEditorSettingsChange({ fontSize: next });
  };

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
      padding: '0 0.75rem 0 1rem', height: 52, flexShrink: 0,
      background: '#141418', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 50
    }}>
      {/* Left: brand, room identity, presence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <Link to="/" title="Home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>⚡</div>
          <span className="hide-narrow" style={{ color: '#f4f4f5', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.3px' }}>
            Code<span style={{ color: '#a78bfa' }}>Collab</span>
          </span>
        </Link>

        <div style={{ width: 1, height: 22, background: 'var(--border)' }} className="hide-mobile" />

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={roomInfo?.name}>
            {roomInfo?.name || 'Joining room...'}
          </span>
          <button
            onClick={copyRoomId}
            title="Copy room code"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}
          >
            #{roomId} <Copy size={10} />
          </button>
        </div>

        <ConnectionPill />
        <Facepile users={users} currentUser={currentUser} />
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
        <div className="popover-anchor" ref={reactions.ref}>
          <button className={`icon-btn ${reactions.open ? 'active' : ''}`} onClick={reactions.toggle} title="Send a reaction everyone sees" aria-haspopup="true" aria-expanded={reactions.open}>
            <SmilePlus size={16} />
          </button>
          {reactions.open && (
            <div className="popover" style={{ minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(5, 36px)', gap: 2 }}>
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="menu-row"
                  style={{ justifyContent: 'center', fontSize: 18, padding: 6 }}
                  onClick={() => sendReaction(emoji)}
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <LanguageSelector />

        <div className="popover-anchor" ref={settings.ref}>
          <button className={`icon-btn ${settings.open ? 'active' : ''}`} onClick={settings.toggle} title="Editor settings" aria-haspopup="true" aria-expanded={settings.open}>
            <Settings2 size={16} />
          </button>
          {settings.open && (
            <div className="popover" style={{ width: 250 }}>
              <div className="popover-section-title">Editor</div>
              <div className="menu-row" style={{ cursor: 'default' }}>
                <span>Font size</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <button className="icon-btn bordered" style={{ height: 24, minWidth: 24, padding: 0 }} onClick={() => setFontSize(-1)} aria-label="Smaller font"><Minus size={12} /></button>
                  <span style={{ width: 22, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{editorSettings.fontSize}</span>
                  <button className="icon-btn bordered" style={{ height: 24, minWidth: 24, padding: 0 }} onClick={() => setFontSize(1)} aria-label="Larger font"><Plus size={12} /></button>
                </span>
              </div>
              <button className="menu-row" onClick={() => onEditorSettingsChange({ wordWrap: !editorSettings.wordWrap })} role="switch" aria-checked={editorSettings.wordWrap}>
                <span>Word wrap</span><span className={`switch ${editorSettings.wordWrap ? 'on' : ''}`} />
              </button>
              <button className="menu-row" onClick={() => onEditorSettingsChange({ minimap: !editorSettings.minimap })} role="switch" aria-checked={editorSettings.minimap}>
                <span>Minimap</span><span className={`switch ${editorSettings.minimap ? 'on' : ''}`} />
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button className="menu-row" onClick={() => { settings.close(); downloadCode(); }}>
                <span>Download file</span><Download size={14} color="var(--text-muted)" />
              </button>
              <button className="menu-row" onClick={() => { settings.close(); onShowShortcuts(); }}>
                <span>Keyboard shortcuts</span><kbd>?</kbd>
              </button>
            </div>
          )}
        </div>

        <button className="icon-btn hide-mobile" onClick={downloadCode} title="Download current file">
          <Download size={16} />
        </button>

        <button className={`icon-btn ${sidebarOpen ? 'active' : ''}`} onClick={onToggleSidebar} title="Toggle sidebar (Ctrl+B)" aria-pressed={sidebarOpen}>
          {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>

        <button
          className="btn btn-primary"
          onClick={copyInviteLink}
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: 30 }}
          title="Copy invite link"
        >
          {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
          <span className="hide-mobile">{copiedLink ? 'Copied' : 'Invite'}</span>
        </button>

        <button className="icon-btn" onClick={handleLeave} title="Leave room" style={{ color: '#fca5a5' }}>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default Header;
