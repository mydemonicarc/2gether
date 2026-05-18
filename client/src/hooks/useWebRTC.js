/**
 * useWebRTC.js
 * Handles camera/mic peer connections, data channels, and screen sharing.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import Peer from 'simple-peer';

export function useWebRTC({ socket, myUserId, roomUsers }) {
  const [localStream,     setLocalStream]     = useState(null);
  const [remoteStreams,   setRemoteStreams]    = useState({});
  const [micOn,           setMicOn]           = useState(true);
  const [camOn,           setCamOn]           = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peersRef        = useRef({});
  const dataHandlerRef  = useRef(null);
  const screenStreamRef = useRef(null);
  const localStreamRef  = useRef(null);

  const pendingOffersRef = useRef([]);
  const pendingIceRef    = useRef([]);

  // ── Get camera + mic ───────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        localStreamRef.current = stream;
      })
      .catch(err => {
        console.warn('[webrtc] no media:', err.message);
        setLocalStream(false);
      });
  }, []);

  // ── Create peer ────────────────────────────────────────────────────────────
  const createPeer = useCallback((targetUserId, stream, initiator) => {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream: stream || undefined,
    });

    peer.on('signal', data => {
      if (data.type === 'offer')       socket?.emit('webrtc-offer',  { targetId: targetUserId, offer: data });
      else if (data.type === 'answer') socket?.emit('webrtc-answer', { targetId: targetUserId, answer: data });
      else                             socket?.emit('webrtc-ice',    { targetId: targetUserId, candidate: data });
    });

    peer.on('stream', remoteStream => {
      setRemoteStreams(prev => ({ ...prev, [targetUserId]: remoteStream }));
    });

    peer.on('data', rawData => {
      try {
        const msg = typeof rawData === 'string'
          ? JSON.parse(rawData)
          : { type: 'file-chunk-binary', buffer: rawData };
        dataHandlerRef.current?.(msg, targetUserId);
      } catch (e) { console.warn('[webrtc] data parse error', e); }
    });

    peer.on('error', err => console.warn('[webrtc] peer error:', err.message));
    peer.on('connect', () => console.log('[webrtc] data channel connected to', targetUserId));
    peer.on('close', () => {
      setRemoteStreams(prev => { const n = { ...prev }; delete n[targetUserId]; return n; });
    });

    peersRef.current[targetUserId] = peer;
    return peer;
  }, [socket]);

  // ── Socket signalling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onUserJoined = ({ userId }) => {
      if (!peersRef.current[userId]) {
        createPeer(userId, localStreamRef.current || null, true);
      }
    };

    const onOffer = ({ fromId, offer }) => {
      if (localStreamRef.current === null) {
        pendingOffersRef.current.push({ fromId, offer });
        return;
      }
      if (!peersRef.current[fromId]) {
        const p = createPeer(fromId, localStreamRef.current || null, false);
        p.signal(offer);
      }
    };

    const onAnswer   = ({ fromId, answer })    => peersRef.current[fromId]?.signal(answer);
    const onIce      = ({ fromId, candidate }) => {
      if (!peersRef.current[fromId]) {
        pendingIceRef.current.push({ fromId, candidate });
        return;
      }
      peersRef.current[fromId].signal(candidate);
    };

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
  }, [socket, createPeer]);

  // ── Drain queued offers/ICE once localStream arrives ──────────────────────
  useEffect(() => {
    if (localStream === null) return;

    const queued = pendingOffersRef.current.splice(0);
    queued.forEach(({ fromId, offer }) => {
      if (!peersRef.current[fromId]) {
        const p = createPeer(fromId, localStream || null, false);
        p.signal(offer);
      }
    });

    const queuedIce = pendingIceRef.current.splice(0);
    queuedIce.forEach(({ fromId, candidate }) => {
      peersRef.current[fromId]?.signal(candidate);
    });
  }, [localStream, createPeer]);

  // ── Controls ──────────────────────────────────────────────────────────────
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

  // ── Screen share ───────────────────────────────────────────────────────────
  async function startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true,
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      const screenTrack = screenStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer._pc?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      socket?.emit('screen-share-start');
      screenTrack.onended = () => stopScreenShare();

    } catch (err) {
      console.warn('[screenshare] error:', err.message);
    }
  }

  function stopScreenShare() {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    Object.values(peersRef.current).forEach(peer => {
      const sender = peer._pc?.getSenders().find(s => s.track?.kind === 'video');
      if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
    });

    socket?.emit('screen-share-stop');
  }

  // ── Data helpers ──────────────────────────────────────────────────────────
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

  function broadcastData(msg)   { Object.keys(peersRef.current).forEach(uid => sendData(uid, msg)); }
  function broadcastBinary(buf) { Object.keys(peersRef.current).forEach(uid => sendBinary(uid, buf)); }
  function onIncomingData(h)    { dataHandlerRef.current = h; }
  function getConnectedPeers()  { return Object.keys(peersRef.current); }
  function getPeers()           { return peersRef.current; }

  return {
    localStream, remoteStreams,
    micOn, camOn, toggleMic, toggleCam,
    isScreenSharing, startScreenShare, stopScreenShare,
    sendData, sendBinary, broadcastData, broadcastBinary,
    onIncomingData, getConnectedPeers, getPeers,
  };
}