const rooms = new Map();

function createRoom(roomId, hostId, hostName) {
  const room = {
    id: roomId,
    hostId,
    users: [{ id: hostId, name: hostName }],
    videoState: {
      url: '',
      isPlaying: false,
      timestamp: 0,
    },
    chat: [],
    mode: 'sync',
  };
  rooms.set(roomId, room);
  return room;
}

function joinRoom(roomId, userId, userName) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const alreadyIn = room.users.find(u => u.id === userId);
  if (!alreadyIn) room.users.push({ id: userId, name: userName });
  return room;
}

function leaveRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.users = room.users.filter(u => u.id !== userId);
  if (room.users.length === 0) { rooms.delete(roomId); return null; }
  if (room.hostId === userId) room.hostId = room.users[0].id;
  return room;
}

function updateVideoState(roomId, patch) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.videoState = { ...room.videoState, ...patch };
  return room.videoState;
}

function addMessage(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.chat.push(message);
  if (room.chat.length > 100) room.chat.shift();
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

module.exports = { createRoom, joinRoom, leaveRoom, updateVideoState, addMessage, getRoom };