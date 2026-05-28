import { useState, useEffect, useRef } from 'react';

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ── Navbar ─────────────────────────────────────────────────────────────────
function Navbar() {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const lastY = useRef(0);

  const navLinks = [
    { label: 'how it works', id: 'how' },
    { label: 'features',     id: 'features' },
    { label: 'about',        id: 'about' },
  ];

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < lastY.current || y < 60);
      setScrolled(y > 60);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observers = navLinks.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActive(id); },
        { threshold: 0.4 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '24px 48px',
      background: scrolled ? 'rgba(9,9,15,0.75)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : 'none',
      fontFamily: "'Courier New', monospace",
      transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 0.4s ease, background 0.4s ease',
    }}>
      <span style={{
        fontSize: 18, fontWeight: 900,
        color: '#ff6ec7', letterSpacing: 4,
        textShadow: '0 0 20px rgba(255,110,199,0.8), 0 0 40px rgba(255,110,199,0.4)',
      }}>2gether</span>

      <div style={{ display: 'flex', gap: 36 }}>
        {navLinks.map(({ label, id }) => (
          <button key={id} onClick={() => scrollTo(id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: active === id ? 'rgba(255,110,199,0.9)' : 'rgba(206,147,216,0.5)',
            fontSize: 13,
            letterSpacing: 3, fontFamily: "'Courier New', monospace",
            padding: '4px 0', position: 'relative',
            transition: 'color 0.3s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#ff6ec7';
              e.currentTarget.querySelector('.underline').style.transform = 'scaleX(1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = active === id ? 'rgba(255,110,199,0.9)' : 'rgba(206,147,216,0.5)';
              e.currentTarget.querySelector('.underline').style.transform = 'scaleX(0)';
            }}
          >
            {label}
            <span className="underline" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 1,
              background: 'rgba(255,110,199,0.6)',
              transform: 'scaleX(0)',
              transformOrigin: 'left',
              transition: 'transform 0.3s ease',
            }}/>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero({ onStart }) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const title = 'Welcome to 2Gether';
    const sub = 'shall we go on a ride?';
    let i = 0, j = 0;
    let cancelled = false;
    const t = document.getElementById('screen-title');
    const s = document.getElementById('screen-sub');
    t.textContent = '';
    s.textContent = '';

    const typeTitle = () => {
      if (cancelled) return;
      if (i < title.length) {
        t.textContent += title[i++];
        setTimeout(typeTitle, 80);
      } else {
        setTimeout(typeSub, 400);
      }
    };

    const typeSub = () => {
      if (cancelled) return;
      if (j < sub.length) {
        s.textContent += sub[j++];
        setTimeout(typeSub, 60);
      } else {
        setShowButton(true);
      }
    };

    setTimeout(typeTitle, 600);
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      position: 'relative',
      height: '100vh', minHeight: 580,
      overflow: 'hidden',
      fontFamily: "'Courier New', monospace",
    }}>
      <img
        src="/Firefly.jpg"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          zIndex: 0,
          filter: 'brightness(0.65) saturate(0.9)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(180deg, rgba(30,0,60,0.35) 0%, rgba(5,0,16,0.5) 60%, #09090f 100%)',
      }}/>
      <div style={{
        position: 'absolute',
        top: '36%', left: '48%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        textAlign: 'center',
      }}>
        <h1 id="screen-title" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(8px, 1vw, 13px)',
          fontWeight: 700,
          color: 'rgba(255,235,180,0.9)',
          letterSpacing: 3,
          margin: '0 0 3px',
          lineHeight: 1.3,
          minHeight: '1.3em',
        }}></h1>
        <p id="screen-sub" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(7px, 0.8vw, 11px)',
          fontWeight: 700,
          fontStyle: 'italic',
          color: 'rgba(255,220,160,0.85)',
          letterSpacing: 2,
          margin: '0 0 8px',
          minHeight: '1em',
        }}></p>
        <div style={{ textAlign: 'center' }}>
          {showButton && (
            <button
              onClick={onStart}
              style={{
                background: 'rgba(255,220,160,0.15)',
                border: '1px solid rgba(255,220,160,0.4)',
                borderRadius: 50,
                cursor: 'pointer',
                color: 'rgba(255,235,180,0.9)',
                fontSize: 'clamp(7px, 0.7vw, 10px)',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                letterSpacing: 2,
                padding: '3px 10px',
                width: 'fit-content',
                transition: 'all 0.2s',
                opacity: 0,
                animation: 'fadeIn 0.6s ease forwards',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,220,160,0.25)';
                e.currentTarget.style.borderColor = 'rgba(255,235,180,0.7)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,220,160,0.15)';
                e.currentTarget.style.borderColor = 'rgba(255,220,160,0.4)';
              }}
            >
              get in the car →
            </button>
          )}
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 32, left: '50%',
        transform: 'translateX(-50%)', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        animation: 'scrollBounce 2s ease-in-out infinite',
      }}>
        <span style={{
          fontSize: 9, letterSpacing: 4,
          color: 'rgba(255,220,160,0.4)',
          fontFamily: "'Courier New', monospace",
        }}>scroll</span>
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path d="M8 0 L8 18" stroke="rgba(255,220,160,0.3)" strokeWidth="1"/>
          <path d="M2 13 L8 20 L14 13" stroke="rgba(255,220,160,0.6)" strokeWidth="1" fill="none"/>
        </svg>
      </div>
    </div>
  );
}

// ── Fade-in section ────────────────────────────────────────────────────────
function Section({ id, children, style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section id={id} ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.8s ease, transform 0.8s ease',
      ...style,
    }}>
      {children}
    </section>
  );
}

function Divider() {
  return <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.05)' }}/>;
}

// ── How it works ───────────────────────────────────────────────────────────
function HowHeading() {
  const ref = useRef(null);
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Find the parent section
    const section = ref.current?.closest('section') || ref.current?.parentElement;

    const onScroll = () => {
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight;
      // starts when section top hits viewport, ends when section bottom leaves
      const scrolled = window.innerHeight - rect.top;
      const p = Math.min(Math.max(scrolled / (total + window.innerHeight), 0), 1);
      setProgress(p);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} style={{ marginBottom: 72, display: 'inline-block' }}>
      <h2 style={{
        fontFamily: "'Courier New', monospace",
        fontSize: 13,
        fontWeight: 700,
        color: 'rgba(255,235,180,0.85)',
        letterSpacing: 4,
        margin: '0 0 10px',
        lineHeight: 1.1,
      }}>How it works</h2>
      <div style={{
        height: 1,
        background: 'rgba(255,235,180,0.4)',
        width: `${progress * 100}%`,
        transition: 'width 0.1s linear',
      }}/>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { num: '01', title: 'create a room',  desc: 'Enter your name, hit create. Your room is ready in seconds.', w: '52%' },
    { num: '02', title: 'invite someone', desc: 'Share a code or link. They join from anywhere, no account needed.', w: '66%' },
    { num: '03', title: 'watch together', desc: 'Load YouTube or share your screen. Stay perfectly in sync.', w: '80%' },
  ];

  const stepRefs = useRef([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const onScroll = () => {
      const center = window.innerHeight / 2;
      let closest = null;
      let closestDist = Infinity;

      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const dist = Math.abs(elCenter - center);
        if (dist < closestDist && rect.top < window.innerHeight && rect.bottom > 0) {
          closestDist = dist;
          closest = i;
        }
      });

      setActive(closest);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Section
      id="how"
      style={{
        position: 'relative',
        background: 'transparent',
        padding: '120px 80px',
        overflow: 'hidden',
      }}
    >
      {/* Heading */}
      <HowHeading />

      {/* Ribbons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {steps.map(({ num, title, desc, w }, i) => {
          const isActive = active === i;
          return (
            <div
              key={num}
              ref={el => stepRefs.current[i] = el}
              style={{
                width: w,
                background: isActive ? 'rgba(30, 10, 45, 0.95)' : 'rgba(20, 8, 30, 0.85)',
                borderTop: `1px solid rgba(255,110,199,${isActive ? '0.3' : '0.12'})`,
                borderBottom: `1px solid rgba(255,110,199,${isActive ? '0.3' : '0.12'})`,
                clipPath: 'polygon(0 0, 100% 0, calc(100% - 32px) 50%, 100% 100%, 0 100%)',
                padding: '24px 56px 24px 40px',
                boxSizing: 'border-box',
                backdropFilter: 'blur(8px)',
                overflow: 'hidden',
                opacity: isActive ? 1 : 0.45,
                transform: isActive ? 'translateX(12px)' : 'translateX(0)',
                transition: 'all 0.45s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <p style={{
                fontSize: 9,
                letterSpacing: 4,
                color: isActive ? 'rgba(255,110,199,0.7)' : 'rgba(255,110,199,0.3)',
                margin: '0 0 8px',
                fontFamily: "'Courier New', monospace",
                transition: 'color 0.3s',
              }}>{num}</p>

              <h3 style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 13,
                fontWeight: 700,
                color: isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)',
                letterSpacing: 2,
                margin: 0,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                transition: 'color 0.3s',
              }}>{title}</h3>

              <div style={{
                maxHeight: isActive ? '80px' : '0px',
                opacity: isActive ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.4s ease 0.1s, opacity 0.35s ease 0.15s',
              }}>
                <p style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  lineHeight: 2,
                  color: 'rgba(255,255,255,0.35)',
                  fontFamily: "'Courier New', monospace",
                  margin: '12px 0 0',
                }}>{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function FeaturesHeading() {
  const ref = useRef(null);
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const section = ref.current?.closest('section') || ref.current?.parentElement?.parentElement;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight;
      const scrolled = window.innerHeight - rect.top;
      const p = Math.min(Math.max(scrolled / (total + window.innerHeight), 0), 1);
      setProgress(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} style={{ display: 'inline-block' }}>
      <p style={{
        fontSize: 13, letterSpacing: 4, color: 'rgba(255,235,180,0.85)',
        fontFamily: "'Courier New', monospace", fontWeight: 700, margin: '0 0 10px',
      }}>features</p>
      <div style={{
        height: 1,
        background: 'rgba(255,235,180,0.4)',
        width: `${progress * 100}%`,
        transition: 'width 0.1s linear',
      }}/>
    </div>
  );
}

// ── Features ───────────────────────────────────────────────────────────────
function Features() {
  const features = [
    { title: 'youtube sync',    desc: 'Paste any link. Host plays, everyone follows. No drift.',    img: '/feature-youtube.jpg' },
    { title: 'screen share',    desc: 'Share anything on your screen. Movies, shows, whatever.',    img: '/feature-screenshare.jpg' },
    { title: 'live camera',     desc: 'See each other while you watch. Reactions in real time.',    img: '/feature-camera.jpg' },
    { title: 'emoji reactions', desc: 'Send reactions that float across the screen.',               img: '/feature-reactions.jpg' },
    { title: 'live chat',       desc: 'Talk while you watch without missing a moment.',             img: '/feature-chat.jpg' },
    { title: 'instant invite',  desc: "One link. One click. They're in. No sign up ever.",         img: '/feature-invite.jpg' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % features.length);
    }, 2500);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <Section id="features" style={{ background: 'transparent', padding: '40px 0 120px', overflow: 'hidden' }}>
      <Divider />
      <div style={{ margin: '80px 0 0' }}>

        {/* Heading */}
        <div style={{ padding: '0 80px', marginBottom: 60 }}>
          <FeaturesHeading />
        </div>

        {/* Carousel + arrows wrapper */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

          {/* Left arrow */}
          <button onClick={() => setCurrentIndex(c => Math.max(0, c - 1))} style={{
            flexShrink: 0,
            background: 'none', border: 'none',
            color: 'rgba(255,110,199,0.7)', cursor: 'pointer',
            padding: '0 20px', fontSize: 22,
            fontFamily: "'Courier New', monospace",
            opacity: currentIndex === 0 ? 0.15 : 0.7,
            transition: 'opacity 0.2s',
            zIndex: 20,
          }}
            onMouseEnter={e => { if (currentIndex !== 0) e.currentTarget.style.opacity = 1; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = currentIndex === 0 ? 0.15 : 0.7; }}
          >←</button>

        {/* Carousel */}
        <div style={{
          position: 'relative',
          flex: 1,
          height: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {features.map(({ title, desc, img }, i) => {
            const total = features.length;
            let offset = i - currentIndex;
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            const isActive = offset === 0;
            const isAdjacent = Math.abs(offset) === 1;
            const isVisible = Math.abs(offset) <= 2;

            const scale = isActive ? 1 : isAdjacent ? 0.78 : 0.62;
            const translateX = offset * 160;
            const zIndex = 10 - Math.abs(offset);
            const opacity = isActive ? 1 : isAdjacent ? 0.72 : 0.25;

            return (
              <div
                key={i}
                onClick={() => setCurrentIndex(i)}
                style={{
                  position: 'absolute',
                  width: 200,
                  height: 360,
                  transform: `translateX(${translateX}px) scale(${scale})`,
                  opacity: isVisible ? opacity : 0,
                  zIndex,
                  transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease, scale 0.6s ease',
                  background: isActive ? 'rgba(35, 12, 52, 1)' : 'rgba(28, 10, 42, 0.95)',
                  border: `1px solid rgba(255,110,199,${isActive ? '0.25' : '0.1'})`,
                  backdropFilter: 'blur(8px)',
                  padding: 0,
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  cursor: isActive ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Image top half */}
                <div style={{
                  width: '100%',
                  height: 180,
                  backgroundImage: `url(${img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  flexShrink: 0,
                  filter: isActive ? 'brightness(0.8)' : 'brightness(0.5)',
                  transition: 'filter 0.4s',
                }}/>

                {/* Text bottom half */}
                <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: isActive ? 14 : 11,
                    fontWeight: 900,
                    color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                    letterSpacing: 2,
                    margin: '0 0 10px',
                    lineHeight: 1.2,
                    textTransform: 'uppercase',
                    transition: 'font-size 0.4s, color 0.4s',
                  }}>{title}</h3>

                  <p style={{
                    fontSize: 11,
                    color: isActive ? 'rgba(255,255,255,0.35)' : 'transparent',
                    fontFamily: "'Courier New', monospace",
                    letterSpacing: 1, lineHeight: 2, margin: 0,
                    transition: 'color 0.4s',
                  }}>{desc}</p>
                </div>
              </div>
            );
          })}
        </div>

          {/* Right arrow */}
          <button onClick={() => setCurrentIndex(c => Math.min(features.length - 1, c + 1))} style={{
            flexShrink: 0,
            background: 'none', border: 'none',
            color: 'rgba(255,110,199,0.7)', cursor: 'pointer',
            padding: '0 20px', fontSize: 22,
            fontFamily: "'Courier New', monospace",
            opacity: currentIndex === features.length - 1 ? 0.15 : 0.7,
            transition: 'opacity 0.2s',
            zIndex: 20,
          }}
            onMouseEnter={e => { if (currentIndex !== features.length - 1) e.currentTarget.style.opacity = 1; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = currentIndex === features.length - 1 ? 0.15 : 0.7; }}
          >→</button>

        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 40 }}>
          {features.map((_, i) => (
            <div key={i} onClick={() => setCurrentIndex(i)} style={{
              width: currentIndex === i ? 20 : 6, height: 6, borderRadius: 3,
              background: currentIndex === i ? 'rgba(255,110,199,0.7)' : 'rgba(255,255,255,0.15)',
              cursor: 'pointer',
              transition: 'width 0.3s ease, background 0.3s',
            }}/>
          ))}
        </div>

      </div>
    </Section>
  );
}

// ── About ──────────────────────────────────────────────────────────────────
function About() {
  return (
    <Section id="about" style={{ background: 'transparent', padding: '40px 80px 120px' }}>
      <Divider />
      <div style={{ maxWidth: 680, margin: '80px auto 0' }}>

        {/* Frosted glass box */}
        <div style={{
          background: 'rgba(180,80,220,0.06)',
          border: '1px solid rgba(255,110,199,0.15)',
          backdropFilter: 'blur(24px)',
          borderRadius: 4,
          padding: '64px 72px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(180,60,220,0.08), inset 0 0 60px rgba(255,110,199,0.03)',
        }}>

          {/* Top left pink glow */}
          <div style={{
            position: 'absolute', top: -40, left: -40,
            width: 250, height: 250,
            background: 'radial-gradient(circle, rgba(255,110,199,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>

          {/* Bottom right purple glow */}
          <div style={{
            position: 'absolute', bottom: -40, right: -40,
            width: 250, height: 250,
            background: 'radial-gradient(circle, rgba(120,40,200,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>

          {/* Label */}
          <p style={{
            fontSize: 9, letterSpacing: 6,
            color: 'rgba(255,235,180,0.85)',
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            marginBottom: 40, marginTop: 0,
          }}>about</p>

          {/* Heading */}
          <h2 style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 'clamp(22px, 3vw, 32px)',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.9)',
            margin: '0 0 36px',
            letterSpacing: -0.5,
            lineHeight: 1.2,
          }}>hey lovely people, i'm Blue 💙</h2>

          {/* Divider line */}
          <div style={{
            width: 40, height: 1,
            background: 'rgba(255,110,199,0.4)',
            marginBottom: 36,
          }}/>

          {/* Body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{
              fontSize: 15,
              lineHeight: 2.2,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: "'Courier New', monospace",
              letterSpacing: 0.5,
              margin: 0,
            }}>
              You know that feeling when something makes you laugh so hard you immediately want to send it to someone? Or when a scene hits you so deep you just need someone else to feel it too?
            </p>

            <p style={{
              fontSize: 15,
              lineHeight: 2.2,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: "'Courier New', monospace",
              letterSpacing: 0.5,
              margin: 0,
            }}>
              2gether is for those moments. Watch YouTube, share your screen, see each other on camera, react and chat in real time — like the distance was never there.
            </p>

            <p style={{
              fontSize: 15,
              lineHeight: 2.2,
              color: 'rgba(255,255,255,0.35)',
              fontFamily: "'Courier New', monospace",
              letterSpacing: 0.5,
              margin: 0,
              fontStyle: 'italic',
            }}>
              Retro drive-in vibes, no accounts, no setup. Just a room code and the people who matter.
            </p>
          </div>

        </div>
      </div>
    </Section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      background: 'rgba(9,9,15,0.8)',
      padding: '36px 80px',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{
        fontFamily: "'Courier New', monospace",
        fontSize: 14, fontWeight: 900,
        color: '#ff6ec7', letterSpacing: 4,
        textShadow: '0 0 12px rgba(255,110,199,0.5)',
      }}>2gether</span>

      <p style={{
        fontSize: 9, color: 'rgba(255,255,255,0.15)',
        fontFamily: "'Courier New', monospace",
        letterSpacing: 2, margin: 0,
      }}>made with ♥ by Blue</p>

      {/* Email icon */}
      <a
        href="mailto:geetikapanda4@gmail.com"
        style={{
          color: 'rgba(255,110,199,0.5)',
          transition: 'color 0.3s, filter 0.3s',
          display: 'flex', alignItems: 'center',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'rgba(255,110,199,1)';
          e.currentTarget.style.filter = 'drop-shadow(0 0 6px rgba(255,110,199,0.7))';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'rgba(255,110,199,0.5)';
          e.currentTarget.style.filter = 'none';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M2 7l10 7 10-7"/>
        </svg>
      </a>
    </footer>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function LandingPage({ onStart }) {
  return (
    <div style={{ background: '#09090f', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        @keyframes scrollDrop {
          0%   { transform: scaleY(0); transform-origin: top; opacity: 0.6; }
          50%  { transform: scaleY(1); transform-origin: top; opacity: 0.6; }
          51%  { transform: scaleY(1); transform-origin: bottom; }
          100% { transform: scaleY(0); transform-origin: bottom; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateX(-50%) translateY(0);   opacity: 0.6; }
          50%       { transform: translateX(-50%) translateY(6px); opacity: 1;   }
        }
        @keyframes twinkle {
          0%   { opacity: 0.3; }
          50%  { opacity: 1;   }
          100% { opacity: 0.3; }
        }

        .star { 
          position: fixed; 
          border-radius: 50%; 
          background: white; 
          animation: twinkle var(--d) ease-in-out infinite;
          animation-delay: var(--delay);
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* Stars */}
      {[...Array(60)].map((_, i) => {
        const size = Math.random() < 0.15 ? 2 : 1;
        const warm = Math.random() < 0.15;
        return (
          <div key={i} className="star" style={{
            width: size, height: size,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            '--d': `${2 + Math.random() * 4}s`,
            '--delay': `${Math.random() * 4}s`,
            opacity: 0.2 + Math.random() * 0.5,
            background: warm ? 'rgba(206,147,216,0.9)' : 'white',
          }}/>
        );
      })}

      {/* Nebula blobs */}
      <div style={{
        position: 'fixed', top: '10%', left: '5%',
        width: 500, height: 400,
        background: 'radial-gradient(ellipse, rgba(100,20,140,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>
      <div style={{
        position: 'fixed', bottom: '20%', right: '5%',
        width: 400, height: 350,
        background: 'radial-gradient(ellipse, rgba(180,40,120,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <Hero onStart={onStart} />
        <HowItWorks />
        <Features />
        <About />
        <Footer />
      </div>
    </div>
  );
}