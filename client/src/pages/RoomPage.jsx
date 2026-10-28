import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';
import { useSocket } from '../hooks/useSocket';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Editor/OutputPanel';
import ChatPanel from '../components/Chat/ChatPanel';
import UsersList from '../components/Sidebar/UsersList';
import SnapshotPanel from '../components/Sidebar/SnapshotPanel';
import Header from '../components/Layout/Header';
import InterviewBanner from '../components/Layout/InterviewBanner';
import { MessageSquare, Users, Camera } from 'lucide-react';

const RoomPage = () => {
  const { roomId } = useParams();
  const { joinRoom, leaveRoom, isInterviewRoom, users, chatMessages, snapshots } = useRoom();
  const { isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    const username = localStorage.getItem('codecollab_username') || `Guest_${Math.floor(Math.random() * 1000)}`;
    
    if (isConnected) {
      joinRoom(roomId, username);
    }
    
    return () => {
      leaveRoom();
    };
  }, [roomId, joinRoom, leaveRoom, isConnected]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Header />
      {isInterviewRoom && <InterviewBanner />}
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Editor and Terminal (Left 72%) */}
        <div style={{ flex: '0 0 72%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <CodeEditor />
          </div>
          <OutputPanel />
        </div>

        {/* Sidebar Tabs (Right 28%) */}
        <div style={{ flex: '0 0 28%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {/* Tab Navigation Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(15, 23, 42, 0.95)' }}>
            <button 
              onClick={() => setActiveTab('chat')} 
              style={tabStyle(activeTab === 'chat')}
            >
              <MessageSquare size={14} />
              <span>Chat</span>
              {chatMessages.length > 0 && (
                <span style={{ fontSize: '10px', background: activeTab === 'chat' ? 'var(--accent)' : 'var(--bg-tertiary)', color: activeTab === 'chat' ? '#0f172a' : 'var(--text-secondary)', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                  {chatMessages.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('users')} 
              style={tabStyle(activeTab === 'users')}
            >
              <Users size={14} />
              <span>Users</span>
              <span style={{ fontSize: '10px', background: activeTab === 'users' ? 'var(--neon-green)' : 'rgba(34, 197, 94, 0.15)', color: activeTab === 'users' ? '#052e16' : 'var(--neon-green)', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                {users.length || 1}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('snapshots')} 
              style={tabStyle(activeTab === 'snapshots')}
            >
              <Camera size={14} />
              <span>Snapshots</span>
              {snapshots.length > 0 && (
                <span style={{ fontSize: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                  {snapshots.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Tab Content Viewport */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'chat' && <ChatPanel />}
            {activeTab === 'users' && <UsersList />}
            {activeTab === 'snapshots' && <SnapshotPanel />}
          </div>
        </div>
      </div>
    </div>
  );
};

const tabStyle = (isActive) => ({
  flex: 1,
  padding: '0.75rem 0.5rem',
  background: isActive ? 'rgba(30, 41, 59, 0.5)' : 'transparent',
  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
  border: 'none',
  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
  cursor: 'pointer',
  fontWeight: isActive ? 700 : 500,
  fontSize: '0.82rem',
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.15s ease'
});

export default RoomPage;
