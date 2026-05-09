import { useEffect, useState } from 'react';

const EMOJIS = ['🔥', '😂', '😱', '❤️', '👏', '😭', '🤩', '💀'];

export default function Reactions({ socket, sendReaction }) {
  const [floaters, setFloaters] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const onReaction = ({ emoji, userName, id }) => {
      const floater = {
        id, emoji, userName,
        x: 10 + Math.random() * 80,
        created: Date.now(),
      };
      setFloaters(prev => [...prev, floater]);
      setTimeout(() => {
        setFloaters(prev => prev.filter(f => f.id !== id));
      }, 3000);
    };

    socket.on('reaction', onReaction);
    return () => socket.off('reaction', onReaction);
  }, [socket]);

  return (
    <>
      {/* Floating reaction emojis */}
      {floaters.map(f => (
        <div
          key={f.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${f.x}%`, bottom: 60,
            fontSize: 28,
            animation: 'floatUp 3s ease-out forwards',
            zIndex: 20,
          }}
        >
          {f.emoji}
        </div>
      ))}

      {/* Emoji buttons */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, flexWrap: 'wrap',
      }}>
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            style={{
              fontSize: 20,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #2a0050',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              transition: 'transform 0.15s, border-color 0.15s, background 0.15s',
              lineHeight: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.3)';
              e.currentTarget.style.borderColor = '#7b1fa2';
              e.currentTarget.style.background = 'rgba(123,31,162,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = '#2a0050';
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);    opacity: 1; }
          80%  { transform: translateY(-120px) scale(1.15); opacity: 0.9; }
          100% { transform: translateY(-180px) scale(0.8);  opacity: 0; }
        }
      `}</style>
    </>
  );
}