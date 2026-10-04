import React, { useState, useRef, useEffect } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { formatTime } from '../../utils/helpers';

const ChatPanel = () => {
  const { chatMessages, sendMessage } = useRoom();
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {chatMessages.length === 0 && <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No messages yet</div>}
        {chatMessages.map((msg, i) => (
          <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '0.9rem' }}>{msg.username}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatTime(msg.timestamp)}</span>
            </div>
            <div style={{ fontSize: '0.95rem', wordBreak: 'break-word' }}>{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
        <input 
          className="input" 
          style={{ flex: 1 }} 
          placeholder="Type a message..." 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
        />
        <button type="submit" className="btn">Send</button>
      </form>
    </div>
  );
};

export default ChatPanel;
