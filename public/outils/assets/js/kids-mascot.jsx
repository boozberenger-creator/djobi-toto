/* global React */
/* ============================================================
   DJOBI TOTO — Espace Enfants · mascotte + briques audio
   Exposes on window: Hare, HareMini, Say, speakText, useReveal
   ============================================================ */
const { useState, useRef, useEffect, useCallback } = React;

/* ---------- Audio-first helper (mooré par défaut) ---------- */
function speakText(text, opts) {
  opts = opts || {};
  try {
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';            // approximation phonétique (pas de voix mooré native)
    u.rate = opts.rate || 0.9;
    u.pitch = opts.pitch == null ? 1.05 : opts.pitch;
    if (opts.onend) u.onend = opts.onend;
    s.speak(u);
  } catch (e) { if (opts.onend) setTimeout(opts.onend, 1400); }
}

/* ---------- Universal voice button ---------- */
function Say({ text, size, color, label, className }) {
  const [on, setOn] = useState(false);
  const ref = useRef(null);
  const fire = useCallback((e) => {
    if (e) e.stopPropagation();
    setOn(true);
    speakText(text, { onend: () => setOn(false) });
    setTimeout(() => setOn(false), 2600);
  }, [text]);
  const cls = 'say' + (size ? ' ' + size : '') + (on ? ' speaking' : '') + (className ? ' ' + className : '');
  return (
    <button ref={ref} className={cls} style={color ? { background: color } : undefined}
      aria-label={label || 'Écouter'} onClick={fire}
      onMouseEnter={(e) => { /* desktop: announce on hover */ }}>
      {/* ear / listen icon */}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 9a3.5 3.5 0 0 1 7 0c0 2.2-1.8 3-2.7 4.2-.6.8-.8 1.6-.8 2.8" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"></path>
        <circle cx="12" cy="18.6" r="1.5"></circle>
        <path d="M5 6.5a8 8 0 0 1 .4-1.2M19 6.5a8 8 0 0 0-.4-1.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5"></path>
      </svg>
    </button>
  );
}

/* ---------- Scroll reveal hook ---------- */
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.kreveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

/* ============================================================
   MASCOTTE — Compère Lièvre (flat vector, animé)
   ============================================================ */
function Hare() {
  return (
    <svg viewBox="0 0 320 380" role="img" aria-label="Compère Lièvre, la mascotte">
      <defs>
        <linearGradient id="fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C89058"></stop>
          <stop offset="1" stopColor="#B0773F"></stop>
        </linearGradient>
        <pattern id="pagne" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#A0421C"></rect>
          <path d="M20 6 L30 20 L20 34 L10 20 Z" fill="none" stroke="#FCD116" strokeWidth="2.4"></path>
          <path d="M20 13 L25 20 L20 27 L15 20 Z" fill="#009E49"></path>
          <circle cx="20" cy="20" r="2" fill="#FDF6E8"></circle>
          <path d="M0 20 H6 M34 20 H40" stroke="#FDF6E8" strokeWidth="2"></path>
        </pattern>
      </defs>

      {/* shadow */}
      <ellipse cx="160" cy="356" rx="92" ry="16" fill="#3A2A1B" opacity="0.12"></ellipse>

      {/* ears */}
      <g className="m-ear-l">
        <path d="M118 120 C96 70 92 24 110 12 C128 2 142 36 140 92 C139 112 132 124 124 126 Z" fill="url(#fur)" stroke="#9C6633" strokeWidth="2"></path>
        <path d="M118 110 C104 74 102 38 113 28 C123 22 130 50 128 90 C127 102 123 108 119 109 Z" fill="#E8718B" opacity="0.8"></path>
      </g>
      <g className="m-ear-r">
        <path d="M196 122 C214 70 222 26 206 14 C190 4 174 38 178 94 C179 114 188 126 196 126 Z" fill="url(#fur)" stroke="#9C6633" strokeWidth="2"></path>
        <path d="M196 112 C208 76 214 40 204 30 C195 24 186 52 190 92 C191 104 195 110 199 110 Z" fill="#E8718B" opacity="0.8"></path>
      </g>

      {/* body */}
      <path d="M160 200 C214 200 244 240 244 290 C244 338 208 360 160 360 C112 360 76 338 76 290 C76 240 106 200 160 200 Z" fill="url(#fur)" stroke="#9C6633" strokeWidth="2"></path>
      {/* belly */}
      <ellipse cx="160" cy="300" rx="52" ry="56" fill="#EAD0AC"></ellipse>
      {/* pagne (Faso Dan Fani) */}
      <path d="M108 286 Q160 274 212 286 L214 318 Q160 332 106 318 Z" fill="url(#pagne)" stroke="#7A3214" strokeWidth="2"></path>

      {/* feet */}
      <ellipse cx="124" cy="352" rx="26" ry="15" fill="#EAD0AC" stroke="#9C6633" strokeWidth="1.6"></ellipse>
      <ellipse cx="196" cy="352" rx="26" ry="15" fill="#EAD0AC" stroke="#9C6633" strokeWidth="1.6"></ellipse>

      {/* waving arm */}
      <g className="m-arm">
        <path d="M226 246 C252 232 268 236 272 220 C274 210 264 206 256 212 C246 220 232 224 220 232 Z" fill="url(#fur)" stroke="#9C6633" strokeWidth="2"></path>
        <circle cx="266" cy="216" r="13" fill="#EAD0AC" stroke="#9C6633" strokeWidth="1.6"></circle>
      </g>
      {/* resting arm */}
      <path d="M96 248 C74 262 66 286 78 300 C86 308 98 300 96 288 C94 274 100 262 112 256 Z" fill="url(#fur)" stroke="#9C6633" strokeWidth="2"></path>

      {/* head */}
      <ellipse cx="157" cy="158" rx="78" ry="70" fill="url(#fur)" stroke="#9C6633" strokeWidth="2"></ellipse>
      {/* cheeks blush */}
      <ellipse cx="108" cy="176" rx="15" ry="11" fill="#E8718B" opacity="0.5"></ellipse>
      <ellipse cx="206" cy="176" rx="15" ry="11" fill="#E8718B" opacity="0.5"></ellipse>
      {/* muzzle */}
      <ellipse cx="157" cy="180" rx="40" ry="32" fill="#EAD0AC"></ellipse>

      {/* eyes */}
      <g className="m-eye">
        <ellipse cx="130" cy="150" rx="13" ry="16" fill="#3A2A1B"></ellipse>
        <circle cx="134" cy="144" r="4.2" fill="#fff"></circle>
      </g>
      <g className="m-eye" style={{ animationDelay: '.05s' }}>
        <ellipse cx="184" cy="150" rx="13" ry="16" fill="#3A2A1B"></ellipse>
        <circle cx="188" cy="144" r="4.2" fill="#fff"></circle>
      </g>

      {/* nose + mouth */}
      <path d="M157 166 l-9 6 a9 8 0 0 0 18 0 Z" fill="#A0421C"></path>
      <path d="M157 180 v8 M157 188 q-12 9 -22 3 M157 188 q12 9 22 3" fill="none" stroke="#9C6633" strokeWidth="2.4" strokeLinecap="round"></path>
      {/* whiskers */}
      <path d="M120 178 q-26 -3 -40 -10 M122 186 q-26 4 -42 4 M194 178 q26 -3 40 -10 M192 186 q26 4 42 4" fill="none" stroke="#C89058" strokeWidth="1.6" strokeLinecap="round" opacity="0.7"></path>
      {/* front teeth */}
      <rect x="151" y="196" width="12" height="11" rx="3" fill="#fff" stroke="#9C6633" strokeWidth="1"></rect>
    </svg>
  );
}

/* compact head-only mascot for section headers */
function HareMini({ color }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <ellipse cx="40" cy="74" rx="22" ry="4" fill="#3A2A1B" opacity="0.1"></ellipse>
      <path d="M26 40 C16 18 16 4 24 4 C32 4 34 22 33 40 Z" fill="#C89058"></path>
      <path d="M54 40 C64 18 64 4 56 4 C48 4 46 22 47 40 Z" fill="#C89058"></path>
      <path d="M26 36 C20 18 20 8 25 9 C30 10 31 24 30 36 Z" fill="#E8718B" opacity="0.75"></path>
      <path d="M54 36 C60 18 60 8 55 9 C50 10 49 24 50 36 Z" fill="#E8718B" opacity="0.75"></path>
      <ellipse cx="40" cy="50" rx="28" ry="25" fill="#C89058"></ellipse>
      <ellipse cx="40" cy="58" rx="15" ry="12" fill="#EAD0AC"></ellipse>
      <circle cx="31" cy="47" r="4.5" fill="#3A2A1B"></circle>
      <circle cx="49" cy="47" r="4.5" fill="#3A2A1B"></circle>
      <circle cx="32.4" cy="45.4" r="1.4" fill="#fff"></circle>
      <circle cx="50.4" cy="45.4" r="1.4" fill="#fff"></circle>
      <path d="M40 54 l-4 3 a4 3.5 0 0 0 8 0 Z" fill="#A0421C"></path>
    </svg>
  );
}

Object.assign(window, { Hare, HareMini, Say, speakText, useReveal });
