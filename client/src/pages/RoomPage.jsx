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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', maxWidth: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Header />
      {isInterviewRoom && <InterviewBanner />}
      
      <div style={{ display: 'flex', flex: 1, width: '100%', minWidth: 0, overflow: 'hidden' }}>
        {/* Editor and Terminal (Flexible Main Area) */}
        <div style={{ flex: '1 1 auto', minWidth: 0, width: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            <CodeEditor />
          </div>
          <OutputPanel />
        </div>

        {/* Sidebar Tabs (Right Fixed Pane) */}
        <div style={{ flex: '0 0 340px', width: '340px', minWidth: '280px', maxWidth: '380px', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Tab Navigation Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#141418' }}>
            <button 
              onClick={() => setActiveTab('chat')} 
              style={tabStyle(activeTab === 'chat')}
            >
              <MessageSquare size={14} />
              <span>Chat</span>
              {chatMessages.length > 0 && (
                <span style={{ fontSize: '10px', background: activeTab === 'chat' ? 'rgba(139, 92, 246, 0.25)' : '#1f1f26', color: activeTab === 'chat' ? '#c4b5fd' : 'var(--text-muted)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
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
              <span style={{ fontSize: '10px', background: activeTab === 'users' ? 'rgba(16, 185, 129, 0.2)' : '#1f1f26', color: activeTab === 'users' ? '#10b981' : 'var(--text-muted)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
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
                <span style={{ fontSize: '10px', background: '#1f1f26', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                  {snapshots.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Tab Content Viewport */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
  padding: '0.65rem 0.5rem',
  background: isActive ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
  color: isActive ? '#f4f4f5' : 'var(--text-muted)',
  border: 'none',
  borderBottom: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
  cursor: 'pointer',
  fontWeight: isActive ? 600 : 500,
  fontSize: '0.8rem',
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.15s ease'
});

export default RoomPage;
