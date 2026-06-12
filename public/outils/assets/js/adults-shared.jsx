/* global React */
/* ============================================================
   DJOBI TOTO — Espace Adultes · briques partagées
   window: VB, speakA, useLang, LANGS, DICONS, EarIcon, DOMAINS
   ============================================================ */
const { useState, useRef, useEffect, useCallback } = React;

const LANGS = ['Mooré', 'Dioula', 'Fulfulde', 'Français'];

/* ---- language persistence ---- */
function getLang() {
  try { return localStorage.getItem('djobi_lang') || 'Mooré'; } catch (e) { return 'Mooré'; }
}
function setLangLS(l) { try { localStorage.setItem('djobi_lang', l); } catch (e) {} }
function useLang() {
  const [lang, setLang] = useState(getLang());
  const change = useCallback((l) => { setLang(l); setLangLS(l); }, []);
  useEffect(() => {
    const h = () => setLang(getLang());
    window.addEventListener('djobi-lang', h);
    return () => window.removeEventListener('djobi-lang', h);
  }, []);
  const set = useCallback((l) => { change(l); window.dispatchEvent(new Event('djobi-lang')); }, [change]);
  return [lang, set];
}

/* ---- speech ---- */
function speakA(text, opts) {
  opts = opts || {};
  try {
    const s = window.speechSynthesis; if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = opts.rate || 0.92; u.pitch = opts.pitch == null ? 1 : opts.pitch;
    if (opts.onend) u.onend = opts.onend;
    s.speak(u);
  } catch (e) { if (opts.onend) setTimeout(opts.onend, 1400); }
}

/* ---- ear icon ---- */
function EarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 9.2a3.5 3.5 0 0 1 7 0c0 2.1-1.7 3-2.6 4.1-.6.7-.9 1.5-.9 2.7" strokeLinecap="round"></path>
      <circle cx="12" cy="18.4" r="1.3" fill="currentColor" stroke="none"></circle>
    </svg>
  );
}

/* ---- universal voice button ---- */
function VB({ text, size, label, className }) {
  const [on, setOn] = useState(false);
  const fire = useCallback((e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setOn(true);
    speakA(text, { onend: () => setOn(false) });
    setTimeout(() => setOn(false), 2800);
  }, [text]);
  const cls = 'vb' + (size ? ' ' + size : '') + (on ? ' speaking' : '') + (className ? ' ' + className : '');
  return (
    <button className={cls} aria-label={label || 'Écouter'} onClick={fire}><EarIcon /></button>
  );
}

/* ============================================================
   8 DOMAIN ICONS — line-art, monochrome (SF-Symbols spirit)
   stroke = currentColor via parent stroke
   ============================================================ */
const DICONS = {
  agri: (   /* wheat / mil */
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 28V12"></path>
      <path d="M16 12c0-3 2-5 5-5 0 3-2 5-5 5Z"></path>
      <path d="M16 12c0-3-2-5-5-5 0 3 2 5 5 5Z"></path>
      <path d="M16 18c0-3 2-5 5-5 0 3-2 5-5 5Z"></path>
      <path d="M16 18c0-3-2-5-5-5 0 3 2 5 5 5Z"></path>
      <path d="M16 24c0-3 2-5 5-5 0 3-2 5-5 5Z"></path>
      <path d="M16 24c0-3-2-5-5-5 0 3 2 5 5 5Z"></path>
    </svg>
  ),
  sante: (  /* heart + pulse */
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 27S5 20 5 12.5A5.5 5.5 0 0 1 16 9a5.5 5.5 0 0 1 11 3.5C27 20 16 27 16 27Z"></path>
      <path d="M9 16h3l2-4 3 7 2-3h3"></path>
    </svg>
  ),
  actu: (   /* newspaper */
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h16v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"></path>
      <path d="M22 12h4v12a2 2 0 0 1-2 2"></path>
      <path d="M10 13h8M10 17h8M10 21h5"></path>
    </svg>
  ),
  argent: ( /* coins */
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="16" cy="9" rx="9" ry="3.5"></ellipse>
      <path d="M7 9v6c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V9"></path>
      <path d="M7 15v6c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5v-6"></path>
    </svg>
  ),
  spirit: ( /* dove / peace */
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 8c-3 0-5 2-7 5-2 3-4 5-8 5-2 0-3 1-3 3 0 3 3 5 7 5 7 0 12-5 12-13 0-1 .5-2 1.5-3C28 14 27 8 26 8Z"></path>
      <path d="M8 23c-2 1-4 1-5 3"></path>
      <circle cx="24" cy="11" r="0.6" fill="currentColor"></circle>
    </svg>
  ),
  lire: (   /* open book + letter */
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 9C13 6.5 8 6.5 5 7v17c3-.5 8-.5 11 2 3-2.5 8-2.5 11-2V7c-3-.5-8-.5-11 2Z"></path>
      <path d="M16 11v18"></path>
    </svg>
  ),
  entr: (   /* rocket / launch */
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4c4 2 6 7 6 12l-3 4h-6l-3-4c0-5 2-10 6-12Z"></path>
      <circle cx="16" cy="13" r="2.2"></circle>
      <path d="M13 21l-3 2 1 4 3-3M19 21l3 2-1 4-3-3"></path>
    </svg>
  ),
  patrie: ( /* flag */
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4v24"></path>
      <path d="M9 6h16l-4 5 4 5H9"></path>
      <path d="M16 10.5l.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2Z"></path>
    </svg>
  ),
};

/* ============================================================
   DOMAIN DATA
   ============================================================ */
const DOMAINS = [
  { id: 'agri',   ic: 'agri',   col: 'var(--d-agri)',   name: 'Agriculture',      hook: 'Mieux cultiver, mieux récolter, mieux vendre.', desc: 'Techniques pour le mil, le sorgho, l\u2019élevage. Calendrier agricole. Prix des marchés.', count: 47, href: 'Domaine — Agriculture.html' },
  { id: 'sante',  ic: 'sante',  col: 'var(--d-sante)',  name: 'Santé',            hook: 'Les bons gestes qui sauvent.', desc: 'Premiers soins. Maladies courantes. Vaccins. Quand aller au dispensaire.', count: 63 },
  { id: 'actu',   ic: 'actu',   col: 'var(--d-actu)',   name: 'Actualité',        hook: 'Ce qui se passe dans le pays et le monde.', desc: 'Bulletins quotidiens audio. Décisions du gouvernement. Sport. Météo.', count: 'Quotidien' },
  { id: 'argent', ic: 'argent', col: 'var(--d-argent)', name: 'Argent',           hook: 'Comprendre ton argent, le faire grandir.', desc: 'Mobile money. Épargne. Microcrédit. Éviter les arnaques. Tontines.', count: 38 },
  { id: 'spirit', ic: 'spirit', col: 'var(--d-spirit)', name: 'Spiritualité',     hook: 'Pour tous, dans le respect.', desc: 'Lectures islamiques, chrétiennes, traditions. Calendrier religieux. Paroles de sages.', count: 52 },
  { id: 'lire',   ic: 'lire',   col: 'var(--d-lire)',   name: 'Apprendre à lire', hook: 'Reconnaître les lettres, lire ton premier mot.', desc: 'Cours d\u2019alphabétisation progressifs. Mooré et français. À ton rythme.', count: 'Niveau 1 à 6' },
  { id: 'entr',   ic: 'entr',   col: 'var(--d-entr)',   name: 'Entrepreneuriat',  hook: 'Lancer ton activité, faire vivre ta famille.', desc: 'Idées de petits commerces. Plan simple. Témoignages. Démarches officielles.', count: 41 },
  { id: 'patrie', ic: 'patrie', col: 'var(--d-patrie)', name: 'Patriotisme',      hook: 'Connaître ton pays, comprendre tes droits.', desc: 'Histoire, héros, géographie, langues. Constitution simplifiée. Droits et devoirs.', count: 35, patrie: true },
];

Object.assign(window, { VB, speakA, useLang, LANGS, DICONS, EarIcon, DOMAINS, getLang });
