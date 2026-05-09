import { useEffect, useRef, useState, useCallback } from 'react';
import TicketPopup from './TicketPopup';

// ── Shooting star canvas ──────────────────────────────────────────────────────
function ShootingStars({ isDaytime }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let animId;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * 1400, y: Math.random() * 320,
      r: Math.random() * 1.5 + 0.5, phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
      color: Math.random() > 0.7 ? '#ffe082' : '#ffffff',
    }));

    const shooters = [2000, 7000, 12000, 18000, 24000].map(delay => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      len: 0, alpha: 0, timer: delay, color: '#ffffff',
    }));

    const spawnShooter = (s) => {
      s.x = Math.random() * canvas.width * 0.7;
      s.y = Math.random() * canvas.height * 0.35;
      const angle = (Math.PI / 6) + Math.random() * (Math.PI / 8);
      const speed = 6 + Math.random() * 4;
      s.vx = Math.cos(angle) * speed; s.vy = Math.sin(angle) * speed;
      s.len = 60 + Math.random() * 60; s.alpha = 1; s.active = true;
      s.color = ['#ffffff', '#ffe082', '#f8bbd0'][Math.floor(Math.random() * 3)];
    };

    let last = performance.now();
    const draw = (now) => {
      animId = requestAnimationFrame(draw);
      const dt = now - last; last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Hide stars in daytime
      if (!isDaytime) {
        stars.forEach(s => {
          s.phase += s.speed;
          const opacity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.phase));
          ctx.beginPath();
          ctx.arc((s.x / 1400) * canvas.width, (s.y / 320) * canvas.height, s.r, 0, Math.PI * 2);
          ctx.fillStyle = s.color; ctx.globalAlpha = opacity; ctx.fill();
        });

        shooters.forEach(s => {
          if (!s.active) {
            s.timer -= dt;
            if (s.timer <= 0) { spawnShooter(s); s.timer = 8000 + Math.random() * 12000; }
            return;
          }
          const tailX = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.len;
          const tailY = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.len;
          const grad  = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
          grad.addColorStop(0, 'transparent'); grad.addColorStop(1, s.color);
          ctx.globalAlpha = s.alpha;
          ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(s.x, s.y);
          ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
          ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = s.color; ctx.fill();
          s.x += s.vx; s.y += s.vy; s.alpha -= 0.018;
          if (s.alpha <= 0 || s.x > canvas.width + 100 || s.y > canvas.height) s.active = false;
        });
      }
      ctx.globalAlpha = 1;
    };

    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [isDaytime]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }} />;
}

// ── Bulb row ──────────────────────────────────────────────────────────────────
function Bulbs({ count = 7, reverse = false }) {
  const delays = ['0s','0.2s','0.4s','0.6s','0.8s','0.2s','0.4s'];
  const dArr   = reverse ? [...delays].reverse() : delays;
  return (
    <div className="flex justify-between px-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="inline-block rounded-full" style={{
          width: '6px', height: '6px', background: '#ff6ec7',
          boxShadow: '0 0 5px #ff6ec7',
          animation: `bulbPulse 1s ease-in-out ${dArr[i % dArr.length]} infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Cloud ─────────────────────────────────────────────────────────────────────
function Cloud({ style, w = 110, h = 44, isDaytime }) {
  const fill1 = isDaytime ? '#c9e8f5' : '#1a0040';
  const fill2 = isDaytime ? '#dff2fb' : '#200048';
  return (
    <svg className="absolute" style={{ transition: 'all 1s', ...style }} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <ellipse cx={w*.5}  cy={h*.68} rx={w*.45} ry={h*.39} fill={fill1} opacity="0.85"/>
      <ellipse cx={w*.32} cy={h*.5}  rx={w*.24} ry={h*.45} fill={fill2} opacity="0.9"/>
      <ellipse cx={w*.62} cy={h*.41} rx={w*.27} ry={h*.5}  fill={fill1} opacity="0.88"/>
      <ellipse cx={w*.8}  cy={h*.61} rx={w*.2}  ry={h*.34} fill={fill1} opacity="0.82"/>
    </svg>
  );
}

// ── Single Car ────────────────────────────────────────────────────────────────
function Car({ carIndex, color, bodyColor, wheelColor, facingLeft = false,
               style, onHonk, isHonking, isDrifting }) {
  const [headlightFlash, setHeadlightFlash] = useState(false);

  useEffect(() => {
    if (isHonking) {
      setHeadlightFlash(true);
      const t = setTimeout(() => setHeadlightFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [isHonking]);

  const headlightOpacity = headlightFlash ? 1 : 0.9;
  const headlightGlow    = headlightFlash ? `0 0 18px 6px #fff9c4` : 'none';

  return (
    <div
      onClick={() => onHonk(carIndex)}
      style={{
        position: 'absolute', cursor: 'pointer', zIndex: 4,
        transform: facingLeft ? 'scaleX(-1)' : 'none',
        transition: isDrifting ? 'left 3s ease-in-out, right 3s ease-in-out' : 'none',
        ...style,
      }}
    >
    {/* BEEP text */}
    {isHonking && (
    <div style={{
        position: 'absolute', top: -36, left: '50%',
        transform: `translateX(-50%) scaleX(${facingLeft ? -1 : 1})`,
        color: '#ffffff', fontSize: 16, fontWeight: 900,
        fontFamily: "'Courier New', monospace",
        animation: 'beepPop 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards',
        whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none',
        textShadow: '0 0 10px #ff6ec7, 0 0 20px #ff6ec7, 0 0 40px #ff4081',
        letterSpacing: 2,
    }}>
         BEEP BEEP!
    </div>
)}
      <svg width="150" height="54" viewBox="0 0 150 54" overflow="visible">
        <rect x="4" y="26" width="90" height="19" rx="6" fill={bodyColor}/>
        <rect x="16" y="11" width="56" height="20" rx="8" fill={color}/>
        <rect x="20" y="14" width="21" height="13" rx="4" fill="#b3e5fc" opacity=".75"/>
        <rect x="46" y="14" width="21" height="13" rx="4" fill="#b3e5fc" opacity=".75"/>
        <circle cx="28" cy="18" r="4" fill="#ffcc80"/>
        <circle cx="56" cy="18" r="4" fill="#ffb74d"/>
        {/* Wheel 1 */}
        <g style={{ animation: 'spinWheel .5s linear infinite', transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle cx="20" cy="45" r="8" fill="#1a0030"/>
          <circle cx="20" cy="45" r="4" fill={wheelColor}/>
          <line x1="20" y1="37" x2="20" y2="53" stroke="#9c27b0" strokeWidth="1.5"/>
          <line x1="12" y1="45" x2="28" y2="45" stroke="#9c27b0" strokeWidth="1.5"/>
        </g>
        {/* Wheel 2 */}
        <g style={{ animation: 'spinWheel .5s linear infinite', transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle cx="76" cy="45" r="8" fill="#1a0030"/>
          <circle cx="76" cy="45" r="4" fill={wheelColor}/>
          <line x1="76" y1="37" x2="76" y2="53" stroke="#9c27b0" strokeWidth="1.5"/>
          <line x1="68" y1="45" x2="84" y2="45" stroke="#9c27b0" strokeWidth="1.5"/>
        </g>
        {/* Headlight */}
        <ellipse cx="94" cy="33" rx="4" ry="3" fill="#fff9c4"
          opacity={headlightOpacity}
          style={{ filter: headlightFlash ? 'drop-shadow(0 0 8px #fff9c4)' : 'none', boxShadow: headlightGlow }}
        />
    {headlightFlash && (
    <>
        <ellipse cx="94" cy="33" rx="10" ry="6" fill="#fff9c4" opacity="0.4"/>
        {/* Light beam cone */}
        <polygon 
        points="97,30 97,36 140,42 140,24" 
        fill="url(#beamGrad)" 
        opacity="0.35"
        />
        {/* Beam gradient definition */}
        <defs>
        <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fff9c4" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#fff9c4" stopOpacity="0"/>
        </linearGradient>
        </defs>
    </>
    )}
      </svg>
    </div>
  );
}

// ── Ticket popup ──────────────────────────────────────────────────────────────


// ── Main LobbyScreen ──────────────────────────────────────────────────────────
export default function LobbyScreen({
  connected, nameInput, setNameInput,
  roomInput, setRoomInput, error,
  onCreateRoom, onJoinRoom,
  pendingRoom, onEnterRoom, onDismissTicket,
}) {
  const [isDaytime, setIsDaytime] = useState(false);
  const [honkingCar, setHonkingCar] = useState(null);
  const [driftingCar, setDriftingCar] = useState(null);

  // Occasional random car drift
  useEffect(() => {
    const interval = setInterval(() => {
      const car = Math.floor(Math.random() * 4);
      setDriftingCar(car);
      setTimeout(() => setDriftingCar(null), 3000);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleHonk = useCallback((carIndex) => {
    setHonkingCar(carIndex);
    setTimeout(() => setHonkingCar(null), 700);
  }, []);

  const nightBg  = 'linear-gradient(180deg,#050010 0%,#0d0025 35%,#1a0035 65%,#110020 100%)';
  const dayBg    = 'linear-gradient(180deg,#87ceeb 0%,#b0e0f5 35%,#d4f0fc 65%,#c8eefc 100%)';

  const cars = [
    { color: '#c62828', bodyColor: '#b71c1c', wheelColor: '#4a148c', left: 14,  facingLeft: false },
    { color: '#283593', bodyColor: '#1a237e', wheelColor: '#4a148c', left: 140, facingLeft: false },
    { color: '#2e7d32', bodyColor: '#1b5e20', wheelColor: '#4a148c', right: 140, facingLeft: true },
    { color: '#6a1b9a', bodyColor: '#4a148c', wheelColor: '#7b1fa2', right: 14,  facingLeft: true },
  ];

  return (
    <div className="relative w-full overflow-hidden font-mono" style={{
      height: '100dvh', minHeight: '580px',
      background: isDaytime ? dayBg : nightBg,
      transition: 'background 1.2s ease',
    }}>
      <style>{`
        @keyframes bulbPulse  { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes floatCard  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes neonPulse  { 0%,100%{text-shadow:0 0 8px #ff6ec7,0 0 20px #ff6ec7,0 0 40px #ff6ec7} 50%{text-shadow:0 0 4px #ff6ec7,0 0 10px #ff6ec7} }
        @keyframes borderGlow { 0%,100%{box-shadow:0 0 8px #7b1fa2,0 0 20px #4a148c,inset 0 0 8px rgba(123,31,162,.15)} 50%{box-shadow:0 0 16px #ff6ec7,0 0 32px #7b1fa2,inset 0 0 12px rgba(255,110,199,.1)} }
        @keyframes cd1 { 0%{transform:translateX(0)} 100%{transform:translateX(40px)} }
        @keyframes cd2 { 0%{transform:translateX(0)} 100%{transform:translateX(-30px)} }
        @keyframes cd3 { 0%{transform:translateX(0)} 100%{transform:translateX(25px)} }
        @keyframes roadMove  { 0%{transform:translateX(0)} 100%{transform:translateX(-120px)} }
        @keyframes spinWheel { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes beepPop { 0%{opacity:0;transform:translateX(-50%) translateY(0) scale(0.5)} 30%{opacity:1;transform:translateX(-50%) translateY(-10px) scale(1.3)} 70%{opacity:1;transform:translateX(-50%) translateY(-18px) scale(1.1)} 100%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.9)} }
        @keyframes carDrift  { 0%{margin-left:0} 50%{margin-left:18px} 100%{margin-left:0} }
        @keyframes ticketIn  { 0%{opacity:0;transform:translateY(20px) scale(0.95)} 100%{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      <ShootingStars isDaytime={isDaytime} />

      {/* Moon / Sun toggle */}
      <div
        onClick={() => setIsDaytime(d => !d)}
        style={{ position: 'absolute', top: 14, right: 70, zIndex: 5, cursor: 'pointer',
          transition: 'transform 0.5s', transform: isDaytime ? 'rotate(180deg)' : 'rotate(0deg)' }}
        title={isDaytime ? 'Switch to night' : 'Switch to day'}
      >
        {isDaytime ? (
          <svg width="42" height="42" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="12" fill="#FFD600"/>
            {[0,45,90,135,180,225,270,315].map((angle, i) => (
              <line key={i}
                x1={21 + 14 * Math.cos(angle * Math.PI/180)}
                y1={21 + 14 * Math.sin(angle * Math.PI/180)}
                x2={21 + 19 * Math.cos(angle * Math.PI/180)}
                y2={21 + 19 * Math.sin(angle * Math.PI/180)}
                stroke="#FFD600" strokeWidth="2.5" strokeLinecap="round"
              />
            ))}
          </svg>
        ) : (
          <svg width="42" height="42" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="18" fill="#fff9c4"/>
            <circle cx="28" cy="13" r="14" fill="#050010"/>
          </svg>
        )}
      </div>

      {/* Clouds */}
      <Cloud isDaytime={isDaytime} style={{ top: 18, left: 40, zIndex: 2, animation: 'cd1 14s ease-in-out alternate infinite' }} w={120} h={48} />
      <Cloud isDaytime={isDaytime} style={{ top: 10, right: 100, zIndex: 2, animation: 'cd2 18s ease-in-out alternate infinite' }} w={140} h={56} />
      <Cloud isDaytime={isDaytime} style={{ top: 55, left: 220, zIndex: 2, animation: 'cd3 20s ease-in-out alternate infinite' }} w={100} h={40} />
      <Cloud isDaytime={isDaytime} style={{ top: 88, left: 10, zIndex: 2, animation: 'cd1 11s ease-in-out 2s alternate infinite' }} w={90} h={36} />
      <Cloud isDaytime={isDaytime} style={{ top: 80, right: 220, zIndex: 2, animation: 'cd2 15s ease-in-out 1s alternate infinite' }} w={105} h={42} />
      <Cloud isDaytime={isDaytime} style={{ top: 110, left: 340, zIndex: 2, animation: 'cd3 17s ease-in-out 3s alternate infinite' }} w={80} h={32} />
      <Cloud isDaytime={isDaytime} style={{ top: 148, right: 50, zIndex: 2, animation: 'cd1 22s ease-in-out 1s alternate infinite' }} w={95} h={38} />
      <Cloud isDaytime={isDaytime} style={{ top: 160, left: 120, zIndex: 2, animation: 'cd2 19s ease-in-out 4s alternate infinite' }} w={70} h={28} />

      {/* Trees LEFT */}
      <svg className="absolute" style={{ bottom: 98, left: 0, zIndex: 3 }} width="170" height="260" viewBox="0 0 170 260">
        <polygon points="15,0 32,260 0,260"     fill={isDaytime ? '#1b4332' : '#0d001a'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="15,30 30,140 2,140"    fill={isDaytime ? '#2d6a4f' : '#130022'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="55,20 74,260 38,260"   fill={isDaytime ? '#1b4332' : '#0a0015'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="55,50 70,155 40,155"   fill={isDaytime ? '#2d6a4f' : '#0d001a'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="100,10 116,260 84,260" fill={isDaytime ? '#1b4332' : '#0d001a'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="100,40 114,150 86,150" fill={isDaytime ? '#2d6a4f' : '#130022'}  style={{transition:'fill 1.2s'}}/>
        <ellipse cx="148" cy="185" rx="20" ry="25" fill={isDaytime ? '#2d6a4f' : '#0d001a'} style={{transition:'fill 1.2s'}}/>
        <ellipse cx="148" cy="170" rx="17" ry="20" fill={isDaytime ? '#40916c' : '#110020'} style={{transition:'fill 1.2s'}}/>
        <ellipse cx="148" cy="157" rx="13" ry="15" fill={isDaytime ? '#52b788' : '#150025'} style={{transition:'fill 1.2s'}}/>
        <rect x="144" y="205" width="8" height="55" fill={isDaytime ? '#74512d' : '#0a0015'} style={{transition:'fill 1.2s'}}/>
      </svg>

      {/* Trees RIGHT */}
      <svg className="absolute" style={{ bottom: 98, right: 0, zIndex: 3 }} width="170" height="260" viewBox="0 0 170 260">
        <polygon points="155,0 170,260 138,260"  fill={isDaytime ? '#1b4332' : '#0d001a'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="155,30 168,140 140,140" fill={isDaytime ? '#2d6a4f' : '#130022'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="115,20 132,260 96,260"  fill={isDaytime ? '#1b4332' : '#0a0015'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="115,50 130,155 100,155" fill={isDaytime ? '#2d6a4f' : '#0d001a'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="70,10 86,260 54,260"    fill={isDaytime ? '#1b4332' : '#0d001a'}  style={{transition:'fill 1.2s'}}/>
        <polygon points="70,40 84,150 56,150"    fill={isDaytime ? '#2d6a4f' : '#130022'}  style={{transition:'fill 1.2s'}}/>
        <ellipse cx="22" cy="185" rx="20" ry="25" fill={isDaytime ? '#2d6a4f' : '#0d001a'} style={{transition:'fill 1.2s'}}/>
        <ellipse cx="22" cy="170" rx="17" ry="20" fill={isDaytime ? '#40916c' : '#110020'} style={{transition:'fill 1.2s'}}/>
        <ellipse cx="22" cy="157" rx="13" ry="15" fill={isDaytime ? '#52b788' : '#150025'} style={{transition:'fill 1.2s'}}/>
        <rect x="18" y="205" width="8" height="55" fill={isDaytime ? '#74512d' : '#0a0015'} style={{transition:'fill 1.2s'}}/>
      </svg>

      {/* Ground */}
      <div className="absolute bottom-0 left-0 w-full" style={{
        height: 106, zIndex: 3,
        background: isDaytime
          ? 'linear-gradient(180deg,#4a7c59 0%,#2d5a27 100%)'
          : 'linear-gradient(180deg,#1b0030 0%,#08000f 100%)',
        transition: 'background 1.2s',
      }}/>
      <div className="absolute left-0 w-full" style={{
        bottom: 104, height: 2, zIndex: 4,
        background: isDaytime
          ? 'linear-gradient(90deg,transparent,#5a8a3c,#7bc67e,#5a8a3c,transparent)'
          : 'linear-gradient(90deg,transparent,#6a1b9a,#9c27b0,#6a1b9a,transparent)',
        opacity: 0.6, transition: 'background 1.2s',
      }}/>

      {/* Moving road */}
      <div className="absolute left-0 w-full overflow-hidden" style={{ bottom: 68, height: 10, zIndex: 4 }}>
        <div style={{ display: 'flex', width: '200%', animation: 'roadMove 1.2s linear infinite' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              width: 80, height: 3,
              background: isDaytime ? '#ffffff' : '#ff6ec7',
              opacity: 0.25, borderRadius: 2, marginRight: 40, flexShrink: 0,
              transition: 'background 1.2s',
            }}/>
          ))}
        </div>
      </div>

      {/* Cars */}
      {cars.map((car, i) => (
        <Car
          key={i}
          carIndex={i}
          color={car.color}
          bodyColor={car.bodyColor}
          wheelColor={car.wheelColor}
          facingLeft={car.facingLeft}
          isHonking={honkingCar === i}
          isDrifting={driftingCar === i}
          onHonk={handleHonk}
          style={{
            bottom: 84,
            ...(car.left  !== undefined ? { left:  car.left  + (driftingCar === i ? 18 : 0) } : {}),
            ...(car.right !== undefined ? { right: car.right + (driftingCar === i ? 18 : 0) } : {}),
            transition: driftingCar === i ? 'left 1.5s ease-in-out, right 1.5s ease-in-out' : 'left 1.5s, right 1.5s',
          }}
        />
      ))}

      {/* Centered card */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ animation: 'floatCard 4s ease-in-out infinite', width: 280, flexShrink: 0, pointerEvents: 'auto' }}>
          <div style={{
            background: isDaytime ? 'rgba(255,255,255,0.82)' : 'rgba(12,0,30,0.96)',
            backdropFilter: 'blur(14px)',
            border: isDaytime ? '1.5px solid #90caf9' : '1.5px solid #7b1fa2',
            borderRadius: 14,
            padding: '14px 20px 12px', position: 'relative',
            animation: isDaytime ? 'none' : 'borderGlow 3s ease-in-out infinite',
            boxShadow: isDaytime ? '0 8px 32px rgba(100,181,246,0.3)' : 'none',
            transition: 'all 1.2s ease',
}}>
            <span style={{ position: 'absolute', top: 7, left: 9, fontSize: 9, opacity: 0.6 }}>✦</span>
            <span style={{ position: 'absolute', top: 7, right: 9, fontSize: 9, opacity: 0.6 }}>✦</span>

            <div style={{ marginBottom: 11 }}><Bulbs /></div>

            <h1 style={{
              textAlign: 'center', margin: '0 0 3px', fontSize: 22,
              fontWeight: 900, color:isDaytime ? '#0277bd' : '#ff6ec7', letterSpacing: 4,
              animation: isDaytime ? 'none' : 'neonPulse 2s ease-in-out infinite',
              transition: 'color 1.2s',
            }}>2gether</h1>
            <p style={{ textAlign: 'center', margin: '0 0 14px', fontSize: 7, color: isDaytime ? '#0288d1' : '#ce93d8', letterSpacing: 2 }}>
              WATCH · TOGETHER · FEEL
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 14 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: connected ? '#69f0ae' : '#ff5252',
                boxShadow: `0 0 5px ${connected ? '#69f0ae' : '#ff5252'}`,
                display: 'inline-block',
              }}/>
              <span style={{ fontSize: 8, color: connected ? '#69f0ae' : '#ff5252', letterSpacing: 1 }}>
                {connected ? 'CONNECTED' : 'CONNECTING…'}
              </span>
            </div>

            {error && (
              <p style={{ fontSize: 8, color: '#ff5252', textAlign: 'center', marginBottom: 10, letterSpacing: 1 }}>
                ⚠ {error}
              </p>
            )}

            <label style={{ fontSize: 8, color: isDaytime ? '#0288d1' : '#ce93d8', display: 'block', marginBottom: 4, letterSpacing: 1 }}>
              YOUR NAME
            </label>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="e.g. Rahul"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 9px',
                borderRadius: 7, border: isDaytime ? '1px solid #90caf9' : '1px solid #4a148c',
                background: isDaytime ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)', fontSize: 11,
                color: isDaytime ? '#01579b' : '#ffe082', marginBottom: 12, outline: 'none',
                fontFamily: "'Courier New', monospace",
              }}
            />

            <button
              onClick={onCreateRoom}
              disabled={!connected || !nameInput.trim()}
              style={{
                width: '100%', padding: '10px 8px', borderRadius: 7, border: 'none',
                background: (!connected || !nameInput.trim())
                  ? 'rgba(255,64,129,0.3)'
                  : 'linear-gradient(135deg,#ff4081,#ff6ec7)',
                color: 'white', fontSize: 10, fontWeight: 700,
                cursor: (!connected || !nameInput.trim()) ? 'not-allowed' : 'pointer',
                letterSpacing: 1, marginBottom: 12,
                fontFamily: "'Courier New', monospace",
                boxShadow: '0 0 12px rgba(255,64,129,0.4)',
              }}
            >
              🎬 CREATE ROOM
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: isDaytime ? '#90caf9' : '#4a148c' }}/>
              <span style={{ fontSize: 7, color: isDaytime ? '#0288d1' : '#ce93d8', letterSpacing: 1 }}>OR JOIN</span>
              <div style={{ flex: 1, height: 1, background: isDaytime ? '#90caf9' : '#4a148c' }}/>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={roomInput}
                onChange={e => setRoomInput(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                style={{
                flex: 1, padding: '8px 7px', borderRadius: 7,
                border: isDaytime ? '1px solid #90caf9' : '1px solid #4a148c',
                background: isDaytime ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)', fontSize: 9,
                fontFamily: "'Courier New', monospace", letterSpacing: 2,
                color: isDaytime ? '#01579b' : '#ffe082', outline: 'none',
                }}
              />
              <button
                onClick={onJoinRoom}
                disabled={!connected || !nameInput.trim() || !roomInput.trim()}
                style={{
                  padding: '8px 10px', borderRadius: 7,
                  border: '1.5px solid #ff6ec7', background: 'transparent',
                  color: '#ff6ec7', fontSize: 9, fontWeight: 700,
                  cursor: (!connected || !nameInput.trim() || !roomInput.trim()) ? 'not-allowed' : 'pointer',
                  fontFamily: "'Courier New', monospace",
                  opacity: (!connected || !nameInput.trim() || !roomInput.trim()) ? 0.4 : 1,
                }}
              >
                JOIN
              </button>
            </div>

            <div style={{ marginTop: 13 }}><Bulbs reverse /></div>
          </div>
        </div>
      </div>

      {/* Ticket popup */}
      {pendingRoom && (
        <TicketPopup
          room={pendingRoom}
          onEnter={onEnterRoom}
          onDismiss={onDismissTicket}
        />
      )}
    </div>
  );
}