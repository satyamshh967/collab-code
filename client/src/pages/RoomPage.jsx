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

const RoomPage = () => {
  const { roomId } = useParams();
  const { joinRoom, leaveRoom, isInterviewRoom } = useRoom();
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />
      {isInterviewRoom && <InterviewBanner />}
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: '0 0 70%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--bg-tertiary)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <CodeEditor />
          </div>
          <OutputPanel />
        </div>

        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-tertiary)' }}>
            <button onClick={() => setActiveTab('chat')} style={tabStyle(activeTab === 'chat')}>Chat</button>
            <button onClick={() => setActiveTab('users')} style={tabStyle(activeTab === 'users')}>Users</button>
            <button onClick={() => setActiveTab('snapshots')} style={tabStyle(activeTab === 'snapshots')}>Snapshots</button>
          </div>
          
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
  padding: '1rem',
  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
  border: 'none',
  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
  cursor: 'pointer',
  fontWeight: 'bold',
  outline: 'none'
});

export default RoomPage;
