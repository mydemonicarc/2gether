import { useEffect, useRef, useState } from 'react';

function Bulbs({ count = 7, reverse = false }) {
  const delays = ['0s','0.14s','0.28s','0.42s','0.56s','0.14s','0.28s'];
  const dArr   = reverse ? [...delays].reverse() : delays;
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'0 4px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          display:'inline-block', width:6, height:6, borderRadius:'50%',
          background:'#ff6ec7', boxShadow:'0 0 5px #ff6ec7',
          animation:`bulbPulse 1s ease-in-out ${dArr[i % dArr.length]} infinite`,
        }}/>
      ))}
    </div>
  );
}

export default function TicketPopup({ room, onEnter, onDismiss }) {
  const [copied,  setCopied]  = useState(false);
  const [visible, setVisible] = useState(false);

  // Drag state
  const [pos,      setPos]      = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity,   setVelocity]   = useState({ x: 0, y: 0 });
  const [settling,   setSettling]   = useState(false);

  const dragRef    = useRef(null);
  const startPos   = useRef({ x: 0, y: 0 });
  const lastPos    = useRef({ x: 0, y: 0 });
  const lastTime   = useRef(0);
  const velRef     = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Mouse down — start drag
  const onMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    setIsDragging(true);
    setSettling(false);
    cancelAnimationFrame(animFrameRef.current);

    const rect = dragRef.current.getBoundingClientRect();
    startPos.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    lastPos.current = { x: e.clientX, y: e.clientY };
    lastTime.current = Date.now();
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e) => {
      const maxX = window.innerWidth / 2 - 240;
      const maxY = window.innerHeight / 2 - 120;

      const newX = Math.max(-maxX, Math.min(maxX, e.clientX - startPos.current.x));
      const newY = Math.max(-maxY, Math.min(maxY, e.clientY - startPos.current.y));

      const now   = Date.now();
      const dt    = now - lastTime.current || 16;
      const dvx   = (e.clientX - lastPos.current.x) / dt * 16;
      const dvy   = (e.clientY - lastPos.current.y) / dt * 16;
      velRef.current = { x: dvx, y: dvy };

      // Tilt based on horizontal velocity
      const tilt = Math.max(-18, Math.min(18, dvx * 1.5));
      setRotation(tilt);
      setPos({ x: newX, y: newY });

      lastPos.current = { x: e.clientX, y: e.clientY };
      lastTime.current = now;
    };

    const onMouseUp = () => {
      setIsDragging(false);
      setVelocity(velRef.current);
      setSettling(true);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [isDragging]);

  // Momentum + settle after release
  useEffect(() => {
    if (!settling) return;

    let vx  = velocity.x;
    let vy  = velocity.y;
    let rot = rotation;
    let px  = pos.x;
    let py  = pos.y;

    const animate = () => {
      vx  *= 0.88;
      vy  *= 0.88;
      rot *= 0.80;
      px += vx;
      py += vy;

        const maxX = window.innerWidth / 2 - 100;
        const maxY = window.innerHeight / 2 - 100;

        px = Math.max(-maxX, Math.min(maxX, px));
        py = Math.max(-maxY, Math.min(maxY, py));

        // bounce off edges
        if (px <= -maxX || px >= maxX) { vx *= -0.4; }
        if (py <= -maxY || py >= maxY) { 
        vy *= -0.5;
        py = Math.max(-maxY, Math.min(maxY, py));
        }

        setPos({ x: px, y: py });

     
      setRotation(rot);

      if (Math.abs(vx) > 0.2 || Math.abs(vy) > 0.2 || Math.abs(rot) > 0.2) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(0);
        setSettling(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [settling]);

  function copyCode() {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareLink() {
    const url = `${window.location.origin}?room=${room.id}`;
    if (navigator.share) {
      navigator.share({ title: '2gether', text: 'Join my watch party!', url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,0,16,0.7)', backdropFilter: 'blur(4px)',
      opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <style>{`
        @keyframes bulbPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes neonPulse { 0%,100%{text-shadow:0 0 8px #ff6ec7,0 0 20px #ff6ec7} 50%{text-shadow:0 0 4px #ff6ec7,0 0 10px #ff6ec7} }
        @keyframes codeFlicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.5} 94%{opacity:1} 97%{opacity:.7} 98%{opacity:1} }
        @keyframes stampIn { 0%{transform:scale(2.5) rotate(-20deg);opacity:0} 60%{transform:scale(.9) rotate(3deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
      `}</style>

      {/* Draggable ticket */}
      <div
        ref={dragRef}
        onMouseDown={onMouseDown}
        style={{
          position: 'relative',
          transform: `translate(${pos.x}px, ${pos.y}px) rotate(${rotation}deg)`,
          transition: isDragging ? 'none' : settling ? 'none' : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          willChange: 'transform',
        }}
      >
        {/* SVG ticket shape */}
        <svg width="480" height="200" viewBox="0 0 480 200"
          style={{ position:'absolute', top:0, left:0,
            filter:'drop-shadow(0 8px 30px rgba(0,0,0,0.9)) drop-shadow(0 0 20px rgba(123,31,162,0.3))' }}>
          <defs>
            <linearGradient id="tg2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#0d0020"/>
              <stop offset="50%"  stopColor="#0a001a"/>
              <stop offset="100%" stopColor="#080015"/>
            </linearGradient>
            <linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#0f0025"/>
              <stop offset="100%" stopColor="#0a0018"/>
            </linearGradient>
            <pattern id="grain2" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.4" fill="rgba(255,110,199,0.03)"/>
              <circle cx="3" cy="3" r="0.3" fill="rgba(123,31,162,0.03)"/>
            </pattern>
          </defs>

          {/* Main ticket with chipped corners */}
          <path d="
            M 20,0 L 22,2 L 26,0
            L 344,0 L 346,3 L 350,0
            L 350,20 Q 360,20 360,30 Q 350,30 350,40
            L 350,80 Q 360,80 360,90 Q 350,90 350,100
            L 350,140 Q 360,140 360,150 Q 350,150 350,160
            L 350,198 L 347,200
            L 24,200 L 20,197 L 16,200
            L 13,197 L 12,193
            L 12,22 L 14,18 L 12,14 L 14,8 L 18,4 Z
          " fill="url(#tg2)" stroke="#4a148c" strokeWidth="0.8"/>

          {/* Stub with chipped corners */}
          <path d="
            M 360,0 L 462,0 L 464,2 L 468,0
            L 471,3 L 472,7
            L 472,193 L 470,197
            L 467,200 L 463,198
            L 360,200
            L 360,160 Q 350,160 350,150 Q 360,150 360,140
            L 360,100 Q 350,100 350,90 Q 360,90 360,80
            L 360,40 Q 350,40 350,30 Q 360,30 360,20 Z
          " fill="url(#sg2)" stroke="#4a148c" strokeWidth="0.8"/>

          {/* Grain */}
          <path d="M 20,0 L 22,2 L 26,0 L 344,0 L 346,3 L 350,0 L 350,198 L 347,200 L 24,200 L 20,197 L 16,200 L 13,197 L 12,193 L 12,22 L 14,18 L 12,14 L 14,8 L 18,4 Z" fill="url(#grain2)"/>

          {/* Scratch marks */}
          <line x1="15"  y1="40"  x2="22"  y2="42"  stroke="#ff6ec7" strokeWidth="0.3" opacity="0.08"/>
          <line x1="330" y1="160" x2="348" y2="163" stroke="#ff6ec7" strokeWidth="0.3" opacity="0.06"/>
          <line x1="60"  y1="185" x2="80"  y2="183" stroke="#ff6ec7" strokeWidth="0.3" opacity="0.07"/>

          {/* Inner border */}
          <rect x="18" y="8" width="326" height="184" rx="1" fill="none" stroke="#2a0050" strokeWidth="0.8"/>

          {/* Divider */}
          <line x1="90" y1="10" x2="90" y2="190" stroke="#2a0050" strokeWidth="1" strokeDasharray="4,4"/>

          {/* Neon edge accents */}
          <line x1="20" y1="8"   x2="344" y2="8"   stroke="#ff6ec7" strokeWidth="0.4" opacity="0.18"/>
          <line x1="20" y1="192" x2="344" y2="192" stroke="#ff6ec7" strokeWidth="0.4" opacity="0.18"/>

          {/* Chipped corner overlays */}
          <polygon points="12,0 20,0 14,8 12,8"     fill="#050010" opacity="0.9"/>
          <polygon points="350,0 360,0 350,6"        fill="#050010" opacity="0.8"/>
          <polygon points="12,192 12,200 20,200"     fill="#050010" opacity="0.9"/>
          <polygon points="350,194 350,200 358,200"  fill="#050010" opacity="0.8"/>
          <polygon points="460,0 472,0 472,8"        fill="#050010" opacity="0.85"/>
          <polygon points="460,200 472,192 472,200"  fill="#050010" opacity="0.85"/>
        </svg>

        {/* Content */}
        <div style={{ position:'relative', width:480, height:200, fontFamily:"'Courier New',monospace" }}>

          {/* Left strip */}
          <div style={{ position:'absolute', left:18, top:0, width:72, height:200,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ transform:'rotate(-90deg)', fontSize:9, letterSpacing:4,
              color:'#9c27b0', whiteSpace:'nowrap', fontWeight:700 }}>
              2GETHER · WATCH PARTY
            </div>
          </div>

          {/* Main content */}
          <div style={{ position:'absolute', left:100, top:0, width:244, height:170,
            display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 10px' }}>

            <div style={{ fontSize:8, letterSpacing:4, color:'#9c27b0', marginBottom:8 }}>
              ✦ &nbsp; 2GETHER CINEMAS &nbsp; ✦
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <svg width="28" height="20" viewBox="0 0 28 20" style={{ opacity:0.55, flexShrink:0 }}>
                <rect x="2" y="4" width="16" height="12" rx="1" fill="#ff6ec7"/>
                <polygon points="18,6 26,2 26,18 18,14" fill="#ff6ec7"/>
                <circle cx="10" cy="10" r="3" fill="#050010"/>
                <circle cx="10" cy="10" r="1.5" fill="#ff6ec7" opacity="0.4"/>
                <rect x="4"  y="2" width="3" height="3" rx="0.5" fill="#ff6ec7"/>
                <rect x="9"  y="2" width="3" height="3" rx="0.5" fill="#ff6ec7"/>
                <rect x="14" y="2" width="3" height="3" rx="0.5" fill="#ff6ec7"/>
              </svg>
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:'#ff6ec7', letterSpacing:4,
                  lineHeight:1, animation:'neonPulse 2s ease-in-out infinite' }}>
                  2GETHER
                </div>
                <div style={{ fontSize:8, letterSpacing:3, color:'#ce93d8', marginTop:2 }}>
                  WATCH PARTY
                </div>
              </div>
            </div>

            <div style={{ fontSize:8, letterSpacing:4, color:'#9c27b0', margin:'4px 0' }}>
              ★ ★ ★ ★ ★ ★ ★ ★
            </div>

            <div style={{ fontSize:9, letterSpacing:4, color:'#ce93d8', fontWeight:700, marginBottom:8 }}>
              ADMIT ONE
            </div>

            {/* Room code */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:8,
              animation:'stampIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
              <span style={{ fontSize:8, letterSpacing:2, color:'#ce93d8' }}>CODE:</span>
              <span style={{ fontSize:15, fontWeight:900, letterSpacing:5, color:'#ff6ec7',
                border:'1px solid #7b1fa2', padding:'3px 10px', borderRadius:3,
                textShadow:'0 0 10px rgba(255,110,199,0.7), 0 0 20px rgba(255,110,199,0.4)',
                animation:'codeFlicker 4s ease-in-out infinite' }}>
                {room.id}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ position:'absolute', left:100, bottom:10, width:244,
            display:'flex', gap:6, padding:'0 10px' }}>
            <button onClick={copyCode} style={{
              flex:1, padding:'6px 0', background:'transparent',
              border:'1px solid #7b1fa2', borderRadius:2,
              color: copied ? '#69f0ae' : '#ce93d8',
              fontSize:9, fontFamily:"'Courier New',monospace",
              letterSpacing:1, cursor:'pointer', transition:'color 0.2s',
            }}>
              {copied ? '✓ OK' : 'COPY'}
            </button>
            <button onClick={shareLink} style={{
              flex:1, padding:'6px 0', background:'transparent',
              border:'1px solid #7b1fa2', borderRadius:2, color:'#ce93d8',
              fontSize:9, fontFamily:"'Courier New',monospace",
              letterSpacing:1, cursor:'pointer',
            }}>
              SHARE
            </button>
            <button onClick={onEnter} style={{
              flex:2, padding:'6px 0',
              background:'linear-gradient(135deg,#4a148c,#6a1b9a)',
              border:'1px solid #ff6ec7', borderRadius:2, color:'#ff6ec7',
              fontSize:9, fontFamily:"'Courier New',monospace",
              letterSpacing:1, cursor:'pointer',
              boxShadow:'0 0 10px rgba(255,110,199,0.3)',
            }}>
              ▶ ENTER ROOM
            </button>
          </div>

          {/* Stub */}
          <div style={{ position:'absolute', right:0, top:0, width:112, height:200,
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'space-between', padding:'16px 8px' }}>
            <div style={{ fontSize:8, letterSpacing:2, color:'#9c27b0', textAlign:'center', lineHeight:1.8 }}>
              VALID<br/>ONE<br/>TIME
            </div>
            <div style={{ transform:'rotate(90deg)', fontSize:8, letterSpacing:2,
              color:'#9c27b0', whiteSpace:'nowrap' }}>
              45612389
            </div>
            <div style={{ fontSize:8, letterSpacing:2, color:'#9c27b0', textAlign:'center', lineHeight:1.8 }}>
              NO<br/>REFUND
            </div>
          </div>
        </div>

        {/* Close button */}
        <button onClick={onDismiss} style={{
          position:'absolute', top:-10, right:-10, width:22, height:22,
          borderRadius:'50%', background:'#0d0020', border:'1px solid #4a148c',
          color:'#4a148c', fontSize:10, cursor:'pointer', zIndex:3,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>✕</button>

      </div>
    </div>
  );
}