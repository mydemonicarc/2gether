/**
 * useWebRTC.js
 * Handles camera/mic peer connections AND data channels for file streaming.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import Peer from 'simple-peer';

export function useWebRTC({ socket, myUserId, roomUsers }) {
  const [localStream,   setLocalStream]   = useState(null);
  const [remoteStreams, setRemoteStreams]  = useState({});
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const peersRef       = useRef({});
  const dataHandlerRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(setLocalStream)
      .catch(err => console.warn('[webrtc] no media:', err.message));
  }, []);

  const createPeer = useCallback((targetUserId, stream, initiator) => {
    const peer = new Peer({ initiator, trickle: true, stream });

    peer.on('signal', data => {
      if (data.type === 'offer') {
        socket?.emit('webrtc-offer',  { targetId: targetUserId, offer: data });
      } else if (data.type === 'answer') {
        socket?.emit('webrtc-answer', { targetId: targetUserId, answer: data });
      } else {
        socket?.emit('webrtc-ice',    { targetId: targetUserId, candidate: data });
      }
    });

    peer.on('stream', remoteStream => {
      setRemoteStreams(prev => ({ ...prev, [targetUserId]: remoteStream }));
    });

    peer.on('data', rawData => {
      try {
        let msg;
        if (typeof rawData === 'string') {
          msg = JSON.parse(rawData);
        } else {
          msg = { type: 'file-chunk-binary', buffer: rawData };
        }
        dataHandlerRef.current?.(msg, targetUserId);
      } catch (e) {
        console.warn('[webrtc] data parse error', e);
      }
    });

    peer.on('error', err => console.warn('[webrtc] peer error:', err.message));
    peer.on('close', () => {
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });
    });

    peersRef.current[targetUserId] = peer;
    return peer;
  }, [socket]);

  useEffect(() => {
    if (!socket || !localStream) return;

    const onUserJoined = ({ userId }) => {
      if (!peersRef.current[userId]) createPeer(userId, localStream, true);
    };
    const onOffer  = ({ fromId, offer })     => {
      if (!peersRef.current[fromId]) {
        const peer = createPeer(fromId, localStream, false);
        peer.signal(offer);
      }
    };
    const onAnswer = ({ fromId, answer })    => peersRef.current[fromId]?.signal(answer);
    const onIce    = ({ fromId, candidate }) => peersRef.current[fromId]?.signal(candidate);
    const onUserLeft = ({ userId }) => {
      peersRef.current[userId]?.destroy();
      delete peersRef.current[userId];
      setRemoteStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
    };

    socket.on('user-joined',   onUserJoined);
    socket.on('webrtc-offer',  onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('webrtc-ice',    onIce);
    socket.on('user-left',     onUserLeft);

    return () => {
      socket.off('user-joined',   onUserJoined);
      socket.off('webrtc-offer',  onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('webrtc-ice',    onIce);
      socket.off('user-left',     onUserLeft);
    };
  }, [socket, localStream, createPeer]);

  function toggleMic() {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => (t.enabled = !t.enabled));
    setMicOn(v => !v);
  }

  function toggleCam() {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => (t.enabled = !t.enabled));
    setCamOn(v => !v);
  }

  function sendData(targetUserId, msg) {
    const peer = peersRef.current[targetUserId];
    if (!peer || !peer.connected) return;
    try { peer.send(JSON.stringify(msg)); } catch (e) { console.warn('[webrtc] sendData:', e.message); }
  }

  function sendBinary(targetUserId, buffer) {
    const peer = peersRef.current[targetUserId];
    if (!peer || !peer.connected) return;
    try { peer.send(buffer); } catch (e) { console.warn('[webrtc] sendBinary:', e.message); }
  }

  function broadcastData(msg) {
    Object.keys(peersRef.current).forEach(uid => sendData(uid, msg));
  }

  function broadcastBinary(buffer) {
    Object.keys(peersRef.current).forEach(uid => sendBinary(uid, buffer));
  }

  function onIncomingData(handler) {
    dataHandlerRef.current = handler;
  }

  function getConnectedPeers() {
    return Object.keys(peersRef.current);
  }

  return {
    localStream, remoteStreams,
    micOn, camOn, toggleMic, toggleCam,
    sendData, sendBinary, broadcastData, broadcastBinary,
    onIncomingData, getConnectedPeers,
  };
}