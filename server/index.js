/**
 * index.js  —  CineSync Server
 *
 * Responsibilities:
 *  1. Serve a simple health-check HTTP endpoint
 *  2. Handle Socket.IO events for rooms, sync, chat, and reactions
 *  3. Forward WebRTC signalling (offer/answer/ICE) between peers
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

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Health check — open http://localhost:4000 to confirm server is running
app.get('/', (req, res) => res.send('CineSync server is running ✅'));

// Generate a short random room ID like "ABC123"
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── Socket.IO events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[connect] socket ${socket.id}`);

  // ── CREATE ROOM ────────────────────────────────────────────────────────────
  socket.on('create-room', ({ userName }, callback) => {
    const roomId = generateRoomId();
    const room = createRoom(roomId, socket.id, userName);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName;
    console.log(`[room] ${userName} created room ${roomId}`);
    callback({ roomId, room });
  });

  // ── JOIN ROOM ──────────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, userName }, callback) => {
    const room = joinRoom(roomId, socket.id, userName);
    if (!room) {
      return callback({ error: 'Room not found' });
    }
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName;

    // Tell everyone else a new user joined
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName,
      users: room.users,
    });

    console.log(`[room] ${userName} joined room ${roomId}`);
    callback({ room }); // Send current room state back to the joiner
  });

  // ── VIDEO SYNC (host only) ─────────────────────────────────────────────────
  // Host sends this whenever they play, pause, or seek.
  socket.on('video-action', ({ action, timestamp, url }) => {
    const { roomId } = socket.data;
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return; // Only host can control

    const newState = updateVideoState(roomId, {
      isPlaying: action === 'play',
      timestamp,
      url: url || room.videoState.url,
    });

    // Broadcast to everyone EXCEPT the host who sent it
    socket.to(roomId).emit('video-sync', { action, timestamp, url: newState.url });
    console.log(`[sync] ${action} @ ${timestamp}s in room ${roomId}`);
  });

  // ── CHAT ──────────────────────────────────────────────────────────────────
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

    // Broadcast to the whole room (including sender so they see it too)
    io.to(roomId).emit('chat-message', message);
  });

  // ── REACTIONS ─────────────────────────────────────────────────────────────
  socket.on('reaction', ({ emoji }) => {
    const { roomId, userName } = socket.data;
    if (!roomId) return;
    io.to(roomId).emit('reaction', { emoji, userName, id: Date.now() });
  });

  // ── WebRTC SIGNALLING ─────────────────────────────────────────────────────
  // The server just forwards these messages between peers.
  // It never reads the actual media content.

  // ── Screen share signalling ──────────────────────────────────────────────
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

  socket.on('webrtc-offer', ({ targetId, offer }) => {
    io.to(targetId).emit('webrtc-offer', { fromId: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ targetId, answer }) => {
    io.to(targetId).emit('webrtc-answer', { fromId: socket.id, answer });
  });

  socket.on('webrtc-ice', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc-ice', { fromId: socket.id, candidate });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { roomId, userName } = socket.data;
    if (!roomId) return;

    const updatedRoom = leaveRoom(roomId, socket.id);
    console.log(`[disconnect] ${userName} left room ${roomId}`);

    if (updatedRoom) {
      // Notify remaining users
      io.to(roomId).emit('user-left', {
        userId: socket.id,
        userName,
        newHostId: updatedRoom.hostId,
        users: updatedRoom.users,
      });
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🎬 CineSync server running at http://localhost:${PORT}\n`);
  
});