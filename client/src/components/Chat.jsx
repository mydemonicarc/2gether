import { useEffect, useRef, useState } from 'react';

export default function Chat({ socket, sendChatMessage, myUserId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
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
    <div className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-gray-500 text-xs text-center mt-4">No messages yet. Say hi!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.userId === myUserId ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-gray-500 mb-0.5">{msg.userName} · {msg.time}</span>
            <div className={`px-3 py-1.5 rounded-2xl text-sm max-w-[80%] ${
              msg.userId === myUserId ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-100'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-gray-700">
        <input
          className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:outline-none focus:border-purple-500"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}