/**
 * VideoPlayer.jsx
 * Handles three modes:
 *   1. YouTube     — YT IFrame API
 *   2. Local file  — native <video> element + chunk buffering
 *   3. Screenshare — displays host's screen stream
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

function BufferBar({ progress, fileName }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#050010',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: '#7e57c2', fontFamily: "'Courier New',monospace" }}>
        BUFFERING
      </div>
      <div style={{ fontSize: 11, color: '#ce93d8', fontFamily: "'Courier New',monospace", maxWidth: 300, textAlign: 'center' }}>
        {fileName || 'incoming file...'}
      </div>
      <div style={{ width: 280, height: 6, background: '#1a0035', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3, width: `${progress}%`,
          background: 'linear-gradient(90deg,#7b1fa2,#ff6ec7)',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 8px rgba(255,110,199,0.5)',
        }}/>
      </div>
      <div style={{ fontSize: 10, color: '#ff6ec7', letterSpacing: 2, fontFamily: "'Courier New',monospace" }}>
        {progress}%
      </div>
    </div>
  );
}

export default function VideoPlayer({
  socket, isHost, sendVideoAction,
  urlToLoad,
  localFileUrl, guestFileUrl, streamProgress, isBuffering, fileName,
  screenShareStream, isScreenSharing,
}) {
  const ytPlayerRef    = useRef(null);
  const ytContRef      = useRef(null);
  const localVideoRef  = useRef(null);
  const screenVideoRef = useRef(null);
  const isSyncingRef   = useRef(false);
  const ytReadyRef     = useRef(false); // true once YT player fires onReady

  const [videoId, setVideoId] = useState(null);
  const [mode,    setMode]    = useState('none');
  const [status,  setStatus]  = useState(
    isHost ? 'Load a YouTube URL or open a local file' : 'Waiting for host...'
  );

  // ── Screen sharing (host) ─────────────────────────────────────────────────
  useEffect(() => {
    if (isScreenSharing) {
      setMode('screenshare');
      setStatus('SCREEN SHARE ACTIVE');
    } else {
      setMode(prev => prev === 'screenshare' ? 'none' : prev);
      setStatus(isHost ? 'Load a YouTube URL or open a local file' : 'Waiting for host...');
    }
  }, [isScreenSharing, isHost]);

  // ── Screen sharing (guest) ────────────────────────────────────────────────
  useEffect(() => {
    if (screenShareStream) {
      setMode('screenshare');
      setStatus('WATCHING HOST SCREEN');
    } else {
      setMode(prev => prev === 'screenshare' ? 'none' : prev);
      setStatus(isHost ? 'Load a YouTube URL or open a local file' : 'Waiting for host...');
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

// ── Local file loaded ─────────────────────────────────────────────────────
useEffect(() => {
  if (!isScreenSharing && (localFileUrl || guestFileUrl)) {
    // Just pause YT if playing — NEVER destroy it
    if (ytPlayerRef.current && ytReadyRef.current) {
      try { ytPlayerRef.current.pauseVideo(); } catch(e) {}
    }
    setMode('local');
  }
}, [localFileUrl, guestFileUrl, isScreenSharing]);

useEffect(() => {
  if (!isScreenSharing && isBuffering) {
    setMode('local');
  }
}, [isBuffering, isScreenSharing]);

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
        // Player already exists and is ready — just load the new video
        try {
          ytPlayerRef.current.loadVideoById(videoId);
          setStatus(isHost ? 'You control playback' : 'Synced with host');
        } catch(e) {
          console.warn('[yt] loadVideoById failed:', e);
        }
        return;
      }

      // First time — create the player
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

  // ── Local file sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const vid = localVideoRef.current;
    if (!vid || !isHost || mode !== 'local') return;
    const onPlay  = () => sendVideoAction('play',  vid.currentTime);
    const onPause = () => { if (!isSyncingRef.current) sendVideoAction('pause', vid.currentTime); };
    vid.addEventListener('play',  onPlay);
    vid.addEventListener('pause', onPause);
    return () => { vid.removeEventListener('play', onPlay); vid.removeEventListener('pause', onPause); };
  }, [mode, isHost, localVideoRef.current]);

  // ── Sync events ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onSync = ({ action, timestamp, url: syncUrl }) => {
      if (syncUrl && mode === 'youtube' && ytPlayerRef.current) {
        isSyncingRef.current = true;
        ytPlayerRef.current.seekTo(timestamp, true);
        action === 'play' ? ytPlayerRef.current.playVideo() : ytPlayerRef.current.pauseVideo();
        setTimeout(() => { isSyncingRef.current = false; }, 300);
      }
      if (mode === 'local' && localVideoRef.current) {
        isSyncingRef.current = true;
        localVideoRef.current.currentTime = timestamp;
        action === 'play' ? localVideoRef.current.play().catch(() => {}) : localVideoRef.current.pause();
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

        {/* Local file */}
        {mode === 'local' && (
          <>
            {!isHost && isBuffering && <BufferBar progress={streamProgress} fileName={fileName}/>}
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
            {!isHost && !activeUrl && !isBuffering && (
              <div style={{
                position: 'absolute', inset: 0, background: '#050010',
                borderRadius: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#4a148c', fontSize: 10,
                letterSpacing: 2, fontFamily: "'Courier New',monospace",
              }}>
                WAITING FOR HOST FILE...
              </div>
            )}
          </>
        )}

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