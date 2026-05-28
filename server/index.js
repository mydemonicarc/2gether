/**
 * index.js  —  CineSync Server
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  updateVideoState,
  addMessage,
  getRoom,
} = require('./roomManager');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.get('/', (req, res) => res.send('CineSync server is running ✅'));

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log(`[connect] socket ${socket.id}`);

  socket.on('create-room', ({ userName }, callback) => {
    const roomId = generateRoomId();
    const room = createRoom(roomId, socket.id, userName);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName;
    console.log(`[room] ${userName} created room ${roomId}`);
    callback({ roomId, room });
  });

  socket.on('join-room', ({ roomId, userName }, callback) => {
    const room = joinRoom(roomId, socket.id, userName);
    if (!room) {
      return callback({ error: 'Room not found' });
    }
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName;

    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName,
      users: room.users,
    });

    console.log(`[room] ${userName} joined room ${roomId}`);
    callback({ room });
  });

  socket.on('video-action', ({ action, timestamp, url }) => {
    const { roomId } = socket.data;
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;

    const newState = updateVideoState(roomId, {
      isPlaying: action === 'play',
      timestamp,
      url: url || room.videoState.url,
    });

    socket.to(roomId).emit('video-sync', { action, timestamp, url: newState.url });
    console.log(`[sync] ${action} @ ${timestamp}s in room ${roomId}`);
  });

  socket.on('chat-message', ({ text }) => {
    const { roomId, userName } = socket.data;
    if (!roomId || !text?.trim()) return;

    const message = {
      id: Date.now(),
      userId: socket.id,
      userName,
      text: text.trim(),
      time: new Date().toLocaleTimeString(),
    };
    addMessage(roomId, message);
    io.to(roomId).emit('chat-message', message);
  });

  socket.on('reaction', ({ emoji }) => {
    const { roomId, userName } = socket.data;
    if (!roomId) return;
    io.to(roomId).emit('reaction', { emoji, userName, id: Date.now() });
  });

  socket.on('screen-share-start', () => {
    const { roomId, userName } = socket.data;
    if (!roomId) return;
    socket.to(roomId).emit('screen-share-start', { hostId: socket.id, userName });
    console.log(`[screenshare] ${userName} started screen share in ${roomId}`);
  });

  socket.on('screen-share-stop', () => {
    const { roomId, userName } = socket.data;
    if (!roomId) return;
    socket.to(roomId).emit('screen-share-stop', { hostId: socket.id });
    console.log(`[screenshare] ${userName} stopped screen share in ${roomId}`);
  });

  socket.on('video-mode', ({ mode }) => {
    const { roomId } = socket.data;
    socket.to(roomId).emit('video-mode', { mode });
  });

  // ── MOOD ──────────────────────────────────────────────────────────────────
  socket.on('mood-change', ({ color }) => {
    const { roomId, userName } = socket.data;
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return; // Only host can change mood
    io.to(roomId).emit('mood-change', { color });
    console.log(`[mood] ${userName} set mood to ${color} in ${roomId}`);
  });

  socket.on('webrtc-offer', ({ targetId, offer }) => {
    io.to(targetId).emit('webrtc-offer', { fromId: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ targetId, answer }) => {
    io.to(targetId).emit('webrtc-answer', { fromId: socket.id, answer });
  });

  socket.on('webrtc-ice', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc-ice', { fromId: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    const { roomId, userName } = socket.data;
    if (!roomId) return;

    const updatedRoom = leaveRoom(roomId, socket.id);
    console.log(`[disconnect] ${userName} left room ${roomId}`);

    if (updatedRoom) {
      io.to(roomId).emit('user-left', {
        userId: socket.id,
        userName,
        newHostId: updatedRoom.hostId,
        users: updatedRoom.users,
      });
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🎬 CineSync server running at http://localhost:${PORT}\n`);
});