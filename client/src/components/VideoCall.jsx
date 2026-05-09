import { useEffect, useRef } from 'react';

function VideoTile({ stream, label, muted = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{
      position: 'relative', borderRadius: 10, overflow: 'hidden',
      background: '#0a0018', aspectRatio: '16/9',
      border: '1px solid #2a0050',
    }}>
      <video
        ref={videoRef}
        autoPlay playsInline muted={muted}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <span style={{
        position: 'absolute', bottom: 6, left: 8,
        fontSize: 9, letterSpacing: 2, color: '#ce93d8',
        background: 'rgba(5,0,16,0.7)', padding: '2px 7px', borderRadius: 4,
        fontFamily: "'Courier New', monospace",
      }}>{label}</span>
    </div>
  );
}

export default function VideoCall({
  localStream, remoteStreams, users, myUserId,
  micOn, camOn, toggleMic, toggleCam,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Mic + Cam toggles */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={toggleMic}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${micOn ? '#2a0050' : '#ff4081'}`,
            background: micOn ? 'rgba(255,255,255,0.03)' : 'rgba(255,64,129,0.12)',
            color: micOn ? '#7e57c2' : '#ff6ec7',
            fontSize: 10, letterSpacing: 2,
            fontFamily: "'Courier New', monospace",
            transition: 'all 0.2s',
          }}
        >
          {micOn ? '🎙 MIC ON' : '🔇 MUTED'}
        </button>
        <button
          onClick={toggleCam}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${camOn ? '#2a0050' : '#ff4081'}`,
            background: camOn ? 'rgba(255,255,255,0.03)' : 'rgba(255,64,129,0.12)',
            color: camOn ? '#7e57c2' : '#ff6ec7',
            fontSize: 10, letterSpacing: 2,
            fontFamily: "'Courier New', monospace",
            transition: 'all 0.2s',
          }}
        >
          {camOn ? '📷 CAM ON' : '🚫 CAM OFF'}
        </button>
      </div>

      {/* Video tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
      }}>
        {localStream && <VideoTile stream={localStream} label="YOU" muted />}
        {Object.entries(remoteStreams).map(([userId, stream]) => {
          const user = users.find(u => u.id === userId);
          return (
            <VideoTile
              key={userId}
              stream={stream}
              label={user?.name?.toUpperCase() || 'GUEST'}
            />
          );
        })}
      </div>

      {!localStream && (
        <p style={{
          fontSize: 9, letterSpacing: 2, color: '#4a148c',
          textAlign: 'center', fontFamily: "'Courier New', monospace",
        }}>
          NO CAMERA · CHAT & SYNC STILL WORK
        </p>
      )}
    </div>
  );
}