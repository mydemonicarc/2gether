/**
 * VideoPlayer.jsx
 * Handles two modes:
 *   1. YouTube     — YT IFrame API
 *   2. Screenshare — displays host's screen stream
 */

import { useEffect, useRef, useState } from 'react';

function loadYouTubeAPI() {
  if (window.YT) return Promise.resolve(window.YT);
  return new Promise(resolve => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
}

function extractVideoId(url) {
  const match = url?.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

const DRIFT_THRESHOLD  = 0.5;  // seconds — correct if guest is off by more than this
const HEARTBEAT_INTERVAL = 3000; // ms — how often host broadcasts current time

export default function VideoPlayer({
  socket, isHost, sendVideoAction,
  urlToLoad,
  screenShareStream, isScreenSharing,
}) {
  const ytPlayerRef    = useRef(null);
  const ytContRef      = useRef(null);
  const screenVideoRef = useRef(null);
  const isSyncingRef   = useRef(false);
  const ytReadyRef     = useRef(false);

  const [videoId, setVideoId] = useState(null);
  const [mode,    setMode]    = useState('none');
  const [status,  setStatus]  = useState(
    isHost ? 'Load a YouTube URL' : 'Waiting for host...'
  );

  // ── Screen sharing (host) ─────────────────────────────────────────────────
  useEffect(() => {
    if (isScreenSharing) {
      setMode('screenshare');
      setStatus('SCREEN SHARE ACTIVE');
    } else {
      setMode(prev => prev === 'screenshare' ? 'none' : prev);
      setStatus(isHost ? 'Load a YouTube URL' : 'Waiting for host...');
    }
  }, [isScreenSharing, isHost]);

  // ── Screen sharing (guest) ────────────────────────────────────────────────
  useEffect(() => {
    if (screenShareStream) {
      setMode('screenshare');
      setStatus('WATCHING HOST SCREEN');
    } else {
      setMode(prev => prev === 'screenshare' ? 'none' : prev);
      setStatus(isHost ? 'Load a YouTube URL' : 'Waiting for host...');
    }
  }, [screenShareStream]);

  // ── YouTube URL loaded ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isScreenSharing && urlToLoad) {
      const id = extractVideoId(urlToLoad);
      if (id) {
        setVideoId(id);
        setMode('youtube');
      }
    } else if (!urlToLoad && !isScreenSharing) {
      setMode(prev => prev === 'youtube' ? 'none' : prev);
    }
  }, [urlToLoad, isScreenSharing]);

  // ── Screen share video element ────────────────────────────────────────────
  useEffect(() => {
    if (screenVideoRef.current && screenShareStream) {
      screenVideoRef.current.srcObject = screenShareStream;
    }
  }, [screenShareStream, mode]);

  // ── YouTube init — create once, reuse forever ─────────────────────────────
  useEffect(() => {
    if (mode !== 'youtube' || !videoId) return;

    loadYouTubeAPI().then(YT => {
      if (!ytContRef.current) return;

      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.loadVideoById(videoId);
          setStatus(isHost ? 'You control playback' : 'Synced with host');
        } catch(e) {
          console.warn('[yt] loadVideoById failed:', e);
        }
        return;
      }

      ytPlayerRef.current = new YT.Player(ytContRef.current, {
        videoId,
        playerVars: { controls: isHost ? 1 : 0 },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
            setStatus(isHost ? 'You control playback' : 'Synced with host');
          },
          onStateChange: e => {
            if (!isHost || isSyncingRef.current) return;
            if (e.data === YT.PlayerState.PLAYING)
              sendVideoAction('play',  ytPlayerRef.current.getCurrentTime());
            else if (e.data === YT.PlayerState.PAUSED)
              sendVideoAction('pause', ytPlayerRef.current.getCurrentTime());
          },
        },
      });
    });
  }, [mode, videoId]);

  // ── Host heartbeat — broadcast current time every 3s for drift correction ─
  useEffect(() => {
    if (!isHost || mode !== 'youtube') return;

    const interval = setInterval(() => {
      if (!ytPlayerRef.current || !ytReadyRef.current) return;
      const playerState = ytPlayerRef.current.getPlayerState();
      // Only heartbeat while actually playing
      if (playerState === window.YT?.PlayerState?.PLAYING) {
        sendVideoAction('heartbeat', ytPlayerRef.current.getCurrentTime());
      }
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [isHost, mode, sendVideoAction]);

  // ── Sync events ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onSync = ({ action, timestamp, url: syncUrl }) => {
      if (!ytPlayerRef.current || !ytReadyRef.current) return;
      if (mode !== 'youtube') return;

      isSyncingRef.current = true;

      if (action === 'play') {
        ytPlayerRef.current.seekTo(timestamp, true);
        ytPlayerRef.current.playVideo();
      } else if (action === 'pause') {
        ytPlayerRef.current.seekTo(timestamp, true);
        ytPlayerRef.current.pauseVideo();
      } else if (action === 'heartbeat') {
        // Drift correction — only seek if meaningfully out of sync
        const current = ytPlayerRef.current.getCurrentTime();
        if (Math.abs(current - timestamp) > DRIFT_THRESHOLD) {
          console.log(`[sync] drift corrected: ${Math.abs(current - timestamp).toFixed(2)}s`);
          ytPlayerRef.current.seekTo(timestamp, true);
        }
      }

      setTimeout(() => { isSyncingRef.current = false; }, 300);
    };

    socket.on('video-sync', onSync);
    return () => socket.off('video-sync', onSync);
  }, [socket, mode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{
        margin: '4px 0 0', fontSize: 10, letterSpacing: 2,
        color: '#7e57c2', fontFamily: "'Courier New',monospace", textAlign: 'center',
      }}>{status}</p>

      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>

        {/* Empty state */}
        {mode === 'none' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.03)',
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#4a148c', fontSize: 12,
            letterSpacing: 2, fontFamily: "'Courier New',monospace",
          }}>
            {isHost ? 'LOAD A VIDEO TO BEGIN' : 'WAITING FOR HOST...'}
          </div>
        )}

        {/* YouTube — ALWAYS in DOM so ref never unmounts */}
        <div style={{
          position: 'absolute', inset: 0,
          display: mode === 'youtube' ? 'block' : 'none',
        }}>
          <div
            ref={ytContRef}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              borderRadius: 12, overflow: 'hidden',
            }}
          />
          {!isHost && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'transparent',
            }}/>
          )}
        </div>

        {/* Screen share */}
        {mode === 'screenshare' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            {!isHost && screenShareStream && (
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%', height: '100%',
                  borderRadius: 12, background: '#000', objectFit: 'contain',
                }}
              />
            )}
            {isHost && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(5,0,16,0.85)',
                borderRadius: 12, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <div style={{ fontSize: 28 }}>🖥</div>
                <div style={{ fontSize: 10, letterSpacing: 3, color: '#ff6ec7', fontFamily: "'Courier New',monospace" }}>
                  SCREEN SHARE ACTIVE
                </div>
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#4a148c', fontFamily: "'Courier New',monospace" }}>
                  GUESTS CAN SEE YOUR SCREEN
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}