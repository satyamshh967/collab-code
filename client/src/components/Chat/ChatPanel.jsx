import React, { useState, useRef, useEffect } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { formatTime } from '../../utils/helpers';
import { Send, MessageSquare } from 'lucide-react';
import { fireEmojiBurst } from '../../utils/confetti';

const CHAT_EMOJIS = ['🔥', '🚀', '🎉', '💡', '🐛', '👏', '❤️'];

const ChatPanel = () => {
  const { chatMessages, sendMessage, currentUser } = useRoom();
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
      sendMessage(text.trim());
      setText('');
    }
  };

  const handleQuickReaction = (emoji) => {
    fireEmojiBurst(emoji);
    sendMessage(emoji);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {chatMessages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--accent)' }}>
              <MessageSquare size={20} />
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              Room Chat is Ready
            </div>
            <div style={{ fontSize: '0.78rem' }}>Say hi to your collaborators or send a reaction!</div>
          </div>
        ) : (
          chatMessages.map((msg, i) => {
            const isSystem = msg.type === 'system';
            const isMe = msg.username === currentUser?.username;

            if (isSystem) {
              return (
                <div key={i} style={{ textAlign: 'center', margin: '0.25rem 0' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border)',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    color: 'var(--text-muted)'
                  }}>
                    {msg.text}
                  </span>
                </div>
              );
            }

            const initial = (msg.username || 'U').charAt(0).toUpperCase();

            return (
              <div 
                key={i} 
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  flexDirection: isMe ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isMe ? 'var(--accent)' : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}>
                  {initial}
                </div>

                {/* Message Bubble */}
                <div style={{ maxWidth: '80%' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '2px',
                    flexDirection: isMe ? 'row-reverse' : 'row'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isMe ? 'var(--accent)' : '#a855f7' }}>
                      {isMe ? 'You' : msg.username}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  <div style={{
                    background: isMe ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.7)',
                    border: isMe ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: isMe ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)',
                    wordBreak: 'break-word',
                    lineHeight: 1.4
                  }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div style={{ display: 'flex', gap: '6px', padding: '0.4rem 1rem 0 1rem', overflowX: 'auto' }}>
        {CHAT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickReaction(emoji)}
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '2px 7px',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
              lineHeight: 1.2
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input 
          className="input" 
          style={{ flex: 1, padding: '0.5rem 0.8rem', fontSize: '0.85rem', borderRadius: '20px' }} 
          placeholder="Send a message..." 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
        />
        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', flexShrink: 0 }}
          title="Send message"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
