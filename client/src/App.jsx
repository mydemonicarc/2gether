import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Room from './components/Room';
import LobbyScreen from './components/LobbyScreen';

export default function App() {
  const { socket, connected, createRoom, joinRoom } = useSocket();

  const [screen,      setScreen]      = useState('lobby');
  const [roomData,    setRoomData]    = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [myUserId,    setMyUserId]    = useState(null);
  const [nameInput,   setNameInput]   = useState('');
  const [roomInput,   setRoomInput]   = useState('');
  const [error,       setError]       = useState('');

  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const inviteRoom = params.get('room');
    if (inviteRoom) setRoomInput(inviteRoom);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => setMyUserId(socket.id));
  }, [socket]);

  async function handleCreate() {
    setError('');
    if (!nameInput.trim()) return setError('Enter your name first');
    const result = await createRoom(nameInput.trim());
    if (result.error) return setError(result.error);
    setMyUserId(socket.id);
    setPendingRoom(result.room);
    window.history.pushState({}, '', `?room=${result.room.id}`);
  }

  function handleEnterRoom() {
    setRoomData(pendingRoom);
    setPendingRoom(null);
    setScreen('room');
  }

  function handleDismissTicket() {
    setPendingRoom(null);
  }

  async function handleJoin() {
    setError('');
    if (!nameInput.trim()) return setError('Enter your name first');
    if (!roomInput.trim()) return setError('Enter a room code');
    const result = await joinRoom(roomInput.trim().toUpperCase(), nameInput.trim());
    if (result.error) return setError(result.error);
    setMyUserId(socket.id);
    setRoomData(result.room);
    setScreen('room');
  }

  function handleLeave() {
    socket?.disconnect();
    window.location.href = '/';
  }

  if (screen === 'room' && roomData) {
    return (
      <Room
        socket={socket}
        roomData={roomData}
        myUserId={myUserId}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <LobbyScreen
      connected={connected}
      nameInput={nameInput}
      setNameInput={setNameInput}
      roomInput={roomInput}
      setRoomInput={setRoomInput}
      error={error}
      onCreateRoom={handleCreate}
      onJoinRoom={handleJoin}
      pendingRoom={pendingRoom}
      onEnterRoom={handleEnterRoom}
      onDismissTicket={handleDismissTicket}
    />
  );
}