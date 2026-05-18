import { useEffect, useRef, useState } from 'react';

export default function Chat({ socket, sendChatMessage, myUserId }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chat-message', onMessage);
    return () => socket.off('chat-message', onMessage);
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    sendChatMessage(text);
    setInput('');
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'rgba(10,0,25,0.85)',
      border: '1px solid #2a0050',
      borderRadius: 12,
      fontFamily: "'Courier New', monospace",
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #2a0050',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6ec7', boxShadow: '0 0 6px #ff6ec7', display: 'inline-block' }}/>
        <span style={{ fontSize: 9, letterSpacing: 3, color: '#ce93d8', fontWeight: 700 }}>
          CHAT
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
        minHeight: 0,
        scrollbarWidth: 'thin',
        scrollbarColor: '#2a0050 transparent',
      }}>
        {messages.length === 0 && (
          <p style={{
            fontSize: 9, letterSpacing: 2, color: '#3a006a',
            textAlign: 'center', marginTop: 16,
          }}>
            NO MESSAGES YET · SAY HI
          </p>
        )}

        {messages.map(msg => {
          const isMe = msg.userId === myUserId;
          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start',
            }}>
              <span style={{ fontSize: 7, letterSpacing: 1, color: '#4a148c', marginBottom: 3 }}>
                {msg.userName} · {msg.time}
              </span>
              <div style={{
                maxWidth: '80%', padding: '7px 11px',
                borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: isMe ? 'linear-gradient(135deg,#4a148c,#6a1b9a)' : 'rgba(255,255,255,0.04)',
                border: isMe ? 'none' : '1px solid #2a0050',
                color: isMe ? '#f3e5f5' : '#ce93d8',
                fontSize: 11, lineHeight: 1.5,
                boxShadow: isMe ? '0 0 10px rgba(106,27,154,0.3)' : 'none',
                wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #2a0050' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="type a message..."
          style={{
            flex: 1, padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #2a0050', borderRadius: 8,
            color: '#ce93d8', fontSize: 11,
            fontFamily: "'Courier New', monospace",
            outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#7b1fa2'}
          onBlur={e  => e.target.style.borderColor = '#2a0050'}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '8px 14px',
            background: 'linear-gradient(135deg,#4a148c,#6a1b9a)',
            border: '1px solid #7b1fa2', borderRadius: 8,
            color: '#ff6ec7', fontSize: 14, cursor: 'pointer',
            boxShadow: '0 0 8px rgba(255,110,199,0.2)',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          →
        </button>
      </div>
    </div>
  );
}