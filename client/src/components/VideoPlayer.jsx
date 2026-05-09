/**
 * VideoPlayer.jsx
 * Handles two modes:
 *   1. YouTube mode  — uses YT IFrame API
 *   2. Local file mode — uses native <video> element
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

// ── Loading bar shown to guests while buffering ────────────────────────────
function BufferBar({ progress, fileName }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#050010',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: '#7e57c2', fontFamily: "'Orbitron',monospace" }}>
        BUFFERING
      </div>
      <div style={{ fontSize: 11, color: '#ce93d8', fontFamily: "'Courier New',monospace", maxWidth: 300, textAlign: 'center' }}>
        {fileName || 'incoming file...'}
      </div>
      {/* Bar */}
      <div style={{ width: 280, height: 6, background: '#1a0035', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #7b1fa2, #ff6ec7)',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 8px rgba(255,110,199,0.5)',
        }}/>
      </div>
      <div style={{ fontSize: 10, color: '#ff6ec7', letterSpacing: 2, fontFamily: "'Orbitron',monospace" }}>
        {progress}%
      </div>
    </div>
  );
}

export default function VideoPlayer({
  socket, isHost, sendVideoAction,
  // YouTube
  urlToLoad,
  // Local file
  localFileUrl,   // host's blob URL
  guestFileUrl,   // guest's blob URL
  streamProgress, // 0–100
  isBuffering,
  fileName,
}) {
  const ytPlayerRef  = useRef(null);
  const ytContRef    = useRef(null);
  const localVideoRef = useRef(null);
  const isSyncingRef = useRef(false);

  const [videoId,  setVideoId]  = useState(null);
  const [mode,     setMode]     = useState('none'); // 'none' | 'youtube' | 'local'
  const [status,   setStatus]   = useState(
    isHost ? 'Load a YouTube URL or open a local file' : 'Waiting for host...'
  );

  // ── Detect mode changes ────────────────────────────────────────────────────
  useEffect(() => {
    if (urlToLoad) {
      const id = extractVideoId(urlToLoad);
      if (id) { setVideoId(id); setMode('youtube'); }
    }
  }, [urlToLoad]);

  useEffect(() => {
    if (localFileUrl || guestFileUrl) setMode('local');
  }, [localFileUrl, guestFileUrl]);

  // ── YouTube player init ────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'youtube' || !videoId) return;

    loadYouTubeAPI().then(YT => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.loadVideoById(videoId);
        return;
      }
      ytPlayerRef.current = new YT.Player(ytContRef.current, {
        videoId,
        playerVars: { controls: isHost ? 1 : 0 },
        events: {
          onReady: () => setStatus(isHost ? 'You control playback' : 'Synced with host'),
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

  // ── Local video sync (host sends events) ──────────────────────────────────
  useEffect(() => {
    const vid = localVideoRef.current;
    if (!vid || !isHost || mode !== 'local') return;

    const onPlay  = () => sendVideoAction('play',  vid.currentTime);
    const onPause = () => { if (!isSyncingRef.current) sendVideoAction('pause', vid.currentTime); };

    vid.addEventListener('play',  onPlay);
    vid.addEventListener('pause', onPause);
    return () => { vid.removeEventListener('play', onPlay); vid.removeEventListener('pause', onPause); };
  }, [mode, isHost, localVideoRef.current]);

  // ── Sync events from server ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onSync = ({ action, timestamp, url: syncUrl }) => {
      // YouTube sync
      if (syncUrl && mode === 'youtube' && ytPlayerRef.current) {
        isSyncingRef.current = true;
        ytPlayerRef.current.seekTo(timestamp, true);
        if (action === 'play')  ytPlayerRef.current.playVideo();
        else                    ytPlayerRef.current.pauseVideo();
        setTimeout(() => { isSyncingRef.current = false; }, 300);
      }

      // Local file sync
      if (mode === 'local' && localVideoRef.current) {
        isSyncingRef.current = true;
        localVideoRef.current.currentTime = timestamp;
        if (action === 'play')  localVideoRef.current.play().catch(() => {});
        else                    localVideoRef.current.pause();
        setTimeout(() => { isSyncingRef.current = false; }, 300);
      }
    };

    socket.on('video-sync', onSync);
    return () => socket.off('video-sync', onSync);
  }, [socket, mode]);

  const activeUrl = isHost ? localFileUrl : guestFileUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{
        margin: '4px 0 0', fontSize: 10, letterSpacing: 2,
        color: '#7e57c2', fontFamily: "'Courier New', monospace", textAlign: 'center',
      }}>{status}</p>

      {/* Player area */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>

        {/* Empty state */}
        {mode === 'none' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.03)',
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#4a148c', fontSize: 12,
            letterSpacing: 2, fontFamily: "'Courier New', monospace",
          }}>
            {isHost ? 'LOAD A VIDEO TO BEGIN' : 'WAITING FOR HOST...'}
          </div>
        )}

        {/* YouTube player */}
        {mode === 'youtube' && (
          <div ref={ytContRef} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            borderRadius: 12, overflow: 'hidden',
          }}/>
        )}

        {/* Local file player */}
        {mode === 'local' && (
          <>
            {/* Guest buffering bar */}
            {!isHost && isBuffering && (
              <BufferBar progress={streamProgress} fileName={fileName} />
            )}

            {/* Video element */}
            {(!isBuffering || isHost) && activeUrl && (
              <video
                ref={localVideoRef}
                src={activeUrl}
                controls={isHost}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  borderRadius: 12, background: '#000', objectFit: 'contain',
                }}
                onCanPlay={() => setStatus(isHost ? 'You control playback' : 'Synced with host')}
              />
            )}

            {/* Guest waiting for stream to start */}
            {!isHost && !activeUrl && !isBuffering && (
              <div style={{
                position: 'absolute', inset: 0, background: '#050010',
                borderRadius: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#4a148c', fontSize: 10,
                letterSpacing: 2, fontFamily: "'Courier New', monospace",
              }}>
                WAITING FOR HOST FILE...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}