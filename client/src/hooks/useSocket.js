import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:4000';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socketRef.current = io(SERVER_URL, { autoConnect: true });

    socketRef.current.on('connect', () => {
      console.log('connected:', socketRef.current.id);
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('disconnected');
      setConnected(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  function createRoom(userName) {
    return new Promise((resolve) => {
      socketRef.current.emit('create-room', { userName }, resolve);
    });
  }

    function joinRoom(roomId, userName) {
      return new Promise((resolve) => {
        socketRef.current.emit('join-room', { roomId, userName }, resolve);
      });
    }
  
    return {
      socket: socketRef.current,
      connected,
      createRoom,
      joinRoom,
    };
  }