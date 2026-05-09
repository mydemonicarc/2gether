import { useEffect, useState } from 'react';
import VideoPlayer from './VideoPlayer';
import VideoCall from './VideoCall';
import Chat from './Chat';
import Reactions from './Reactions';
import { useWebRTC } from '../hooks/useWebRTC';
import { useFileStream } from '../hooks/useFileStream';

export default function Room({ socket, roomData, myUserId, onLeave }) {
  const [users,    setUsers]    = useState(roomData.users || []);
  const [hostId,   setHostId]   = useState(roomData.hostId);
  const [copied,   setCopied]   = useState(false);
  const [urlInput,  setUrlInput]  = useState('');
  const [urlToLoad, setUrlToLoad] = useState('');
  const isHost = hostId === myUserId;

  const { localStream, remoteStreams, micOn, camOn, toggleMic, toggleCam,
broadcastData, broadcastBinary, onIncomingData } =
  useWebRTC({ socket, myUserId, roomUsers: users });

  const {
  selectFile, localFileUrl,
  guestFileUrl, streamProgress,
  isBuffering, fileName,
  handleIncomingData,
} = useFileStream({ isHost, broadcastData, broadcastBinary });

onIncomingData(handleIncomingData);

  useEffect(() => {
    if (!socket) return;
    const onJoin = ({ users: u }) => setUsers(u);
    const onLeft = ({ newHostId, users: u }) => { setUsers(u); setHostId(newHostId); };
    socket.on('user-joined', onJoin);
    socket.on('user-left',   onLeft);
    return () => { socket.off('user-joined', onJoin); socket.off('user-left', onLeft); };
  }, [socket]);

  function copyInviteLink() {
    const url = `${window.location.origin}?room=${roomData.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLoad() {
    const match = urlInput.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (!match) return;
    setUrlToLoad(urlInput);
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#050010', color: 'white',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Courier New', monospace",
    }}>
      <style>{`
        
        @keyframes neonPulse   { 0%,100%{text-shadow:0 0 8px #ff6ec7,0 0 20px #ff6ec7} 50%{text-shadow:0 0 4px #ff6ec7,0 0 10px #ff6ec7} }
        @keyframes screenGlow  { 0%,100%{box-shadow:0 0 30px rgba(123,31,162,0.5),0 0 60px rgba(123,31,162,0.2)} 50%{box-shadow:0 0 45px rgba(255,110,199,0.4),0 0 90px rgba(123,31,162,0.3)} }
        @keyframes groundShine { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        @keyframes cloudDrift1 { 0%{transform:translateX(0)} 100%{transform:translateX(35px)} }
        @keyframes cloudDrift2 { 0%{transform:translateX(0)} 100%{transform:translateX(-28px)} }
        @keyframes twinkle     { 0%,100%{opacity:1} 50%{opacity:0.1} }
        @keyframes floatUp     { 0%{transform:translateY(0) scale(1);opacity:1} 80%{transform:translateY(-120px) scale(1.1);opacity:.9} 100%{transform:translateY(-180px) scale(.8);opacity:0} }
        .panel-btn { transition:all .2s; }
        .panel-btn:hover { background:rgba(123,31,162,0.25)!important; border-color:#ff6ec7!important; color:#ff6ec7!important; }
        .leave-btn { transition:all .2s; }
        .leave-btn:hover { background:rgba(255,64,129,0.2)!important; border-color:#ff4081!important; color:#ff4081!important; }
        .url-input:focus { outline:none; border-color:#7b1fa2!important; box-shadow:0 0 0 2px rgba(123,31,162,0.25); }
        .load-btn:hover  { background:linear-gradient(135deg,#e91e8c,#ff6ec7)!important; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 28px', height:56,
        background:'rgba(10,0,25,0.97)',
        borderBottom:'1px solid #2a0050',
        backdropFilter:'blur(12px)', flexShrink:0, zIndex:10,
      }}>
        <span style={{
          fontSize:20, fontWeight:900, color:'#ff6ec7', letterSpacing:4,
          animation:'neonPulse 2s ease-in-out infinite',
        }}>2gether</span>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, color:'#7e57c2', letterSpacing:3 }}>ROOM</span>
          <span style={{
            fontSize:15, fontWeight:700, letterSpacing:5, color:'#ffe082',
            background:'rgba(255,224,130,0.07)', border:'1px solid #4a148c',
            padding:'3px 14px', borderRadius:5, fontFamily:"'Courier New',monospace",
          }}>{roomData.id}</span>
          {isHost && (
            <span style={{
              fontSize:10, letterSpacing:2, color:'#ff6ec7',
              border:'1px solid #ff6ec7', padding:'2px 9px', borderRadius:12,
              background:'rgba(255,110,199,0.08)',
            }}>HOST</span>
          )}
          <span style={{ fontSize:11, color:'#7e57c2', letterSpacing:1, marginLeft:6 }}>
            👥 {users.length} watching
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="panel-btn" style={{
            padding:'6px 16px', borderRadius:7, cursor:'pointer',
            background:'transparent', border:'1px solid #4a148c',
            color:'#ce93d8', fontSize:11, letterSpacing:2,
            fontFamily: "'Courier New', monospace",
          }}>🎭 MOOD</button>
          <button className="panel-btn" onClick={copyInviteLink} style={{
            padding:'6px 16px', borderRadius:7, cursor:'pointer',
            background:'transparent', border:'1px solid #4a148c',
            color: copied ? '#69f0ae' : '#ce93d8', fontSize:11, letterSpacing:2,
            fontFamily: "'Courier New', monospace",
          }}>{copied ? '✓ COPIED' : '🔗 INVITE'}</button>
          <button className="leave-btn" onClick={onLeave} style={{
            padding:'6px 16px', borderRadius:7, cursor:'pointer',
            background:'transparent', border:'1px solid #4a148c',
            color:'#ce93d8', fontSize:11, letterSpacing:2,
            fontFamily: "'Courier New', monospace",
          }}>✕ LEAVE</button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ── LEFT — url bar + sky scene + reactions bar ── */}
        <div style={{
          flex:1, display:'flex', flexDirection:'column', overflow:'hidden',
        }}>

          {/* URL toolbar — host only */}
          {isHost && (
            <div style={{
              flexShrink:0, padding:'10px 20px',
              background:'rgba(10,0,25,0.95)',
              borderBottom:'1px solid #2a0050',
              display:'flex', alignItems:'center', gap:10,
            }}>
              <span style={{ fontSize:9, color:'#7e57c2', letterSpacing:3, whiteSpace:'nowrap' }}>
                NOW PLAYING
              </span>
              <input
                className="url-input"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLoad()}
                placeholder="Paste a YouTube URL..."
                style={{
                  flex:1, boxSizing:'border-box',
                  padding:'8px 14px', borderRadius:8,
                  border:'1px solid #2a0050',
                  background:'rgba(255,255,255,0.04)',
                  color:'#ffe082', fontSize:12,
                  fontFamily:"'Courier New',monospace",
                  letterSpacing:1, transition:'border-color .2s, box-shadow .2s',
                }}
              />
              <button className="load-btn" onClick={handleLoad} style={{
                padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer',
                background:'linear-gradient(135deg,#ff4081,#ff6ec7)',
                color:'white', fontSize:11, fontWeight:700, letterSpacing:2,
                fontFamily:"'Courier New',monospace",
                boxShadow:'0 0 14px rgba(255,64,129,0.4)',
                transition:'background .2s', whiteSpace:'nowrap',
              }}>▶ LOAD</button>
              <button onClick={selectFile} style={{
              padding:'8px 16px', borderRadius:8, border:'1px solid #4a148c',
              background:'transparent', color:'#ce93d8', fontSize:11,
              fontWeight:700, letterSpacing:2, cursor:'pointer',
              fontFamily:"'Courier New',monospace", whiteSpace:'nowrap',
            }}> OPEN FILE</button>
            </div>
          )}

          {/* ── NIGHT SKY SCENE — flex:1 fills remaining space ── */}
          <div style={{
            flex:1, position:'relative', overflow:'hidden',
            background:'linear-gradient(180deg,#050010 0%,#0d0025 40%,#1a0035 72%,#1b0030 100%)',
            display:'flex', flexDirection:'column', alignItems:'center',
          }}>
            {/* Stars */}
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'65%', pointerEvents:'none', zIndex:1 }} preserveAspectRatio="xMidYMid slice">
              {[
                [8,8],[60,18],[120,6],[200,22],[280,10],[350,28],[430,8],[500,20],[560,5],[620,18],
                [40,40],[150,50],[250,35],[370,48],[470,32],[540,44],[90,70],[310,62],[490,72],[580,55],
                [20,90],[170,80],[330,95],[450,85],[600,78],[100,110],[260,100],[420,115],[550,105],
              ].map(([cx,cy],i) => (
                <circle key={i} cx={`${cx/640*100}%`} cy={cy}
                  r={i%3===0?1.5:1} fill={i%4===0?'#ffe082':'#ffffff'}
                  style={{ animation:`twinkle ${1.5+((i*0.37)%1.5)}s ease-in-out ${(i*0.23)%2}s infinite` }}
                />
              ))}
            </svg>

            {/* Moon */}
            <svg style={{ position:'absolute', top:14, right:70, zIndex:2 }} width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="#fff9c4"/>
              <circle cx="24" cy="11" r="12" fill="#050010"/>
            </svg>

            {/* Clouds */}
            <svg style={{ position:'absolute', top:12, left:36, zIndex:2, animation:'cloudDrift1 16s ease-in-out alternate infinite' }} width="110" height="44" viewBox="0 0 110 44">
              <ellipse cx="55" cy="30" rx="50" ry="17" fill="#1a0040" opacity=".8"/>
              <ellipse cx="34" cy="21" rx="26" ry="21" fill="#200048" opacity=".88"/>
              <ellipse cx="70" cy="17" rx="30" ry="23" fill="#1a0040" opacity=".84"/>
            </svg>
            <svg style={{ position:'absolute', top:18, right:120, zIndex:2, animation:'cloudDrift2 20s ease-in-out alternate infinite' }} width="95" height="38" viewBox="0 0 95 38">
              <ellipse cx="47" cy="26" rx="43" ry="15" fill="#1a0040" opacity=".75"/>
              <ellipse cx="28" cy="18" rx="22" ry="19" fill="#200048" opacity=".83"/>
              <ellipse cx="60" cy="14" rx="26" ry="21" fill="#1a0040" opacity=".79"/>
            </svg>

            {/* ── FLOATING SCREEN ── */}
            <div style={{
              position:'relative', zIndex:5,
              width:'88%', maxWidth:820,
              marginTop:28, marginBottom:20, borderRadius:16,
              background:'#000',
              animation:'screenGlow 4s ease-in-out infinite',
              border:'2px solid #4a148c',
              
            }}>
              <div style={{
                background:'linear-gradient(90deg,#0d0020,#180030,#0d0020)',
                padding:'6px 14px', borderBottom:'1px solid #2a0050',
                display:'flex', alignItems:'center', gap:6,
              }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff6ec7', boxShadow:'0 0 5px #ff6ec7', display:'inline-block' }}/>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#ffe082', boxShadow:'0 0 5px #ffe082', display:'inline-block' }}/>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#69f0ae', boxShadow:'0 0 5px #69f0ae', display:'inline-block' }}/>
                <span style={{ fontSize:8, color:'#4a148c', letterSpacing:3, marginLeft:10 }}>NOW PLAYING</span>
              </div>
              <VideoPlayer
              socket={socket}
              isHost={isHost}
              urlToLoad={urlToLoad}
              localFileUrl={localFileUrl}
              guestFileUrl={guestFileUrl}
              streamProgress={streamProgress}
              isBuffering={isBuffering}
              fileName={fileName}
              sendVideoAction={(action, timestamp, url) =>
                socket?.emit('video-action', { action, timestamp, url })
              }
              />
            </div>

            {/* Ground strip */}
            <div style={{
              position:'absolute', bottom:0, left:0, right:0, height:70, zIndex:3,
              background:'linear-gradient(180deg,#1b0030 0%,#08000f 100%)',
            }}>
              <div style={{
                width:'100%', height:2,
                background:'linear-gradient(90deg,transparent,#6a1b9a,#9c27b0,#6a1b9a,transparent)',
                animation:'groundShine 3s ease-in-out infinite',
              }}/>
              <div style={{ overflow:'hidden', marginTop:20, height:8, display:'flex', alignItems:'center', paddingLeft:16 }}>
                {Array.from({length:20}).map((_,i)=>(
                  <div key={i} style={{ width:50, height:2.5, background:'#ff6ec7', opacity:.18, borderRadius:2, marginRight:36, flexShrink:0 }}/>
                ))}
              </div>
            </div>
          </div>

          {/* ── REACTIONS BAR — own section at the bottom ── */}
          <div style={{
            flexShrink:0,
            background:'rgba(8,0,20,0.97)',
            borderTop:'1px solid #2a0050',
            padding:'12px 24px',
            display:'flex', alignItems:'center', justifyContent:'center',
            gap:8, zIndex:10,
          }}>
            <span style={{
              fontSize:9, letterSpacing:3, color:'#4a148c',
              marginRight:8, whiteSpace:'nowrap',
              fontFamily:"'Courier New', monospace",
            }}>REACT</span>
            <Reactions
              socket={socket}
              sendReaction={(emoji) => socket?.emit('reaction', { emoji })}
            />
          </div>

        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{
          width:290, display:'flex', flexDirection:'column', gap:10,
          padding:12, overflowY:'auto', flexShrink:0,
          background:'rgba(8,0,20,0.98)',
          borderLeft:'1px solid #2a0050',
        }}>

          {/* Cams */}
          <div style={{
            border:'1px solid #2a0050', borderRadius:12,
            background:'rgba(12,0,30,0.9)', overflow:'hidden',
          }}>
            <div style={{
              padding:'8px 14px', borderBottom:'1px solid #2a0050',
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <span style={{ fontSize:11, letterSpacing:3, color:'#7e57c2' }}>CAMS</span>
              <span style={{ fontSize:10, color:'#4a148c' }}>{users.length} online</span>
            </div>
            <div style={{ padding:10 }}>
              <VideoCall
                localStream={localStream}
                remoteStreams={remoteStreams}
                users={users}
                myUserId={myUserId}
                micOn={micOn}
                camOn={camOn}
                toggleMic={toggleMic}
                toggleCam={toggleCam}
              />
            </div>
          </div>

          {/* Users */}
          <div style={{
            border:'1px solid #2a0050', borderRadius:12,
            background:'rgba(12,0,30,0.9)', padding:'10px 14px',
          }}>
            <span style={{ fontSize:11, letterSpacing:3, color:'#7e57c2', display:'block', marginBottom:10 }}>
              IN THIS ROOM
            </span>
            <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
              {users.map(u => (
                <li key={u.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{
                    width:8, height:8, borderRadius:'50%', flexShrink:0,
                    background: u.id===hostId ? '#ff6ec7' : '#69f0ae',
                    boxShadow:`0 0 6px ${u.id===hostId ? '#ff6ec7' : '#69f0ae'}`,
                  }}/>
                  <span style={{ fontSize:13, color:'#ffe082', letterSpacing:1 }}>{u.name}</span>
                  {u.id===hostId && (
                    <span style={{ fontSize:9, color:'#7e57c2', letterSpacing:1, marginLeft:'auto' }}>HOST</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Chat */}
          <div style={{
            flex:1, minHeight:300, border:'1px solid #2a0050', borderRadius:12,
            background:'rgba(12,0,30,0.9)', overflow:'hidden',
            display:'flex', flexDirection:'column',
          }}>
            <div style={{ padding:'8px 14px', borderBottom:'1px solid #2a0050' }}>
              <span style={{ fontSize:11, letterSpacing:3, color:'#7e57c2' }}>CHAT</span>
            </div>
            <div style={{ flex:1, minHeight:0 }}>
              <Chat
                socket={socket}
                myUserId={myUserId}
                sendChatMessage={(text) => socket?.emit('chat-message', { text })}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}