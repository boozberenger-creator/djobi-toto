/* global React, ReactDOM, VB, speakA, useLang, LANGS, DICONS */
const { useState, useRef, useEffect, useCallback } = React;

const SUBTHEMES = [
  { id: 'all',     label: 'Tout' },
  { id: 'mil',     label: 'Mil & sorgho' },
  { id: 'elevage', label: 'Élevage' },
  { id: 'marche',  label: 'Prix & marchés' },
  { id: 'calend',  label: 'Calendrier' },
  { id: 'eau',     label: 'Eau & sol' },
];

const EPISODES = [
  { id: 1, sub: 'marche',  new: true,  title: 'Les prix du mil cette semaine', dur: '5 min', desc: 'Le point sur les marchés de Ouaga, Bobo et Koudougou.' },
  { id: 2, sub: 'mil',     title: 'Bien préparer ton champ de mil', dur: '9 min', desc: 'Labour, fumure, espacement : les bases d\u2019une bonne récolte.' },
  { id: 3, sub: 'calend',  title: 'Quand commencer les semis ?', dur: '6 min', desc: 'Lire les premières pluies et choisir le bon moment.' },
  { id: 4, sub: 'elevage', title: 'Vacciner ta volaille contre la maladie de Newcastle', dur: '7 min', desc: 'Le calendrier de vaccination simple pour protéger tes poules.' },
  { id: 5, sub: 'marche',  new: true, title: 'Vendre ton karité au meilleur prix', dur: '11 min', desc: 'Comprendre les acheteurs, grouper l\u2019offre, négocier.' },
  { id: 6, sub: 'eau',     title: 'Le zaï : récupérer les terres sèches', dur: '8 min', desc: 'La technique du zaï pour cultiver même en sol dur.' },
  { id: 7, sub: 'mil',     title: 'Lutter contre les oiseaux dans le sorgho', dur: '4 min', desc: 'Des méthodes simples et sans danger pour le champ.' },
  { id: 8, sub: 'elevage', title: 'Nourrir tes chèvres en saison sèche', dur: '10 min', desc: 'Réserves de fourrage et compléments peu coûteux.' },
  { id: 9, sub: 'calend',  title: 'Le calendrier agricole, mois par mois', dur: '14 min', desc: 'Ce qu\u2019il faut faire de janvier à décembre.' },
  { id: 10, sub: 'eau',    title: 'Composter pour enrichir ton sol', dur: '7 min', desc: 'Fabriquer un bon compost avec ce que tu as déjà.' },
  { id: 11, sub: 'marche', title: 'Comprendre la coopérative agricole', dur: '9 min', desc: 'Pourquoi et comment rejoindre une coopérative.' },
  { id: 12, sub: 'mil',    title: 'Conserver ta récolte sans perte', dur: '8 min', desc: 'Greniers, sacs hermétiques et bonnes pratiques de stockage.' },
];

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    document.querySelectorAll('.areveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

function AgriApp() {
  useReveal();
  const [lang, setLang] = useLang();
  const [filter, setFilter] = useState('all');
  const [current, setCurrent] = useState(null);  // episode being played
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef(null);

  const list = EPISODES.filter((e) => filter === 'all' || e.sub === filter);

  const stopTimer = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };

  const play = useCallback((ep) => {
    window.speechSynthesis && window.speechSynthesis.cancel();
    setCurrent(ep); setPlaying(true); setProgress(0);
    speakA(ep.title + '. ' + ep.desc, { onend: () => setPlaying(false) });
    stopTimer();
    timer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { stopTimer(); setPlaying(false); return 100; }
        return p + 100 / 60; // ~6s sweep for demo
      });
    }, 100);
  }, []);

  const toggle = useCallback(() => {
    if (!current) return;
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); stopTimer(); }
    else { play(current); }
  }, [current, playing, play]);

  const close = () => { window.speechSynthesis.cancel(); setPlaying(false); stopTimer(); setCurrent(null); setProgress(0); };

  useEffect(() => () => stopTimer(), []);

  const mmss = (pct) => {
    const total = 5 * 60; const s = Math.floor((pct / 100) * total);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  return (
    <React.Fragment>
      {/* TOP BAR */}
      <nav className="abar2">
        <a className="abar2__brand" href="Espace adultes.html">
          <svg className="logo-mark" viewBox="0 0 48 48" aria-hidden="true">
            <ellipse cx="19" cy="18.5" rx="15" ry="12" fill="#A0421C"></ellipse>
            <path d="M9 28 L7 35 L15 30 Z" fill="#A0421C"></path>
            <ellipse cx="29" cy="30" rx="15" ry="12" fill="#009E49"></ellipse>
            <path d="M39 40 L42 47 L34 41 Z" fill="#009E49"></path>
            <circle cx="24" cy="24" r="3" fill="#FCD116"></circle>
          </svg>
          <span className="logo-word">DJOBI&nbsp;TOTO</span>
        </a>
        <div className="abar2__right">
          <div className="langsel" role="group" aria-label="Choisir la langue">
            {LANGS.map((l) => <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>{l}</button>)}
          </div>
          <a className="abar2__home" href="Espace adultes.html">← Domaines</a>
        </div>
      </nav>

      {/* HEADER */}
      <header className="dom-hero">
        <div className="dom-hero__bar" style={{ background: 'var(--d-agri)' }}></div>
        <div className="awrap dom-hero__inner">
          <a className="dom-hero__back" href="Espace adultes.html">
            <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
            Tous les domaines
          </a>
          <div className="dom-hero__top">
            <div className="dom-hero__ic" style={{ stroke: 'var(--d-agri)', background: 'color-mix(in oklab, var(--d-agri) 10%, transparent)' }}>{DICONS.agri}</div>
            <div className="dom-hero__txt">
              <span className="a-eyebrow" style={{ color: 'var(--d-agri)' }}>Domaine</span>
              <h1>Agriculture</h1>
              <p>Mieux cultiver, mieux récolter, mieux vendre. <b>{EPISODES.length} contenus à écouter</b>, mis à jour chaque semaine.</p>
            </div>
            <VB size="lg" text="Domaine Agriculture. Mieux cultiver, mieux récolter, mieux vendre. Choisis un sujet et écoute." label="Écouter la présentation du domaine" />
          </div>
        </div>
      </header>

      {/* FILTERS */}
      <div className="dom-filters">
        <div className="awrap dom-filters__inner">
          {SUBTHEMES.map((s) => (
            <button key={s.id} className={'subfilter' + (filter === s.id ? ' active' : '')} onClick={() => setFilter(s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* EPISODE LIST */}
      <main className="dom-list awrap">
        {list.map((ep, i) => {
          const isCur = current && current.id === ep.id;
          return (
            <article key={ep.id} className={'ep areveal' + (isCur ? ' current' : '')}>
              <button className={'ep__play' + (isCur && playing ? ' playing' : '')} onClick={() => (isCur ? toggle() : play(ep))} aria-label={isCur && playing ? 'Pause' : 'Écouter'}>
                {isCur && playing
                  ? <svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>
                  : <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>}
              </button>
              <div className="ep__main">
                <div className="ep__titlerow">
                  <h3 className="ep__title">{ep.title}</h3>
                  {ep.new ? <span className="ep__new">Nouveau</span> : null}
                </div>
                <p className="ep__desc">{ep.desc}</p>
                {isCur ? (
                  <div className={'ep__wave' + (playing ? ' on' : '')}>
                    {Array.from({ length: 28 }).map((_, k) => <i key={k}></i>)}
                  </div>
                ) : null}
              </div>
              <div className="ep__meta">
                <span className="ep__dur">🎧 {ep.dur}</span>
                <VB text={ep.title + '. ' + ep.desc} label={'Écouter le titre : ' + ep.title} />
              </div>
            </article>
          );
        })}
        {list.length === 0 ? <p className="dom-empty">Aucun contenu dans ce thème pour l'instant.</p> : null}
        <p className="dom-note">Démo — lecture simulée via la synthèse du navigateur. Les vrais contenus audio sont enregistrés par des voix locales.</p>
      </main>

      {/* STICKY PLAYER */}
      <div className={'sticky-player' + (current ? ' show' : '')}>
        <div className="sticky-player__inner">
          <button className="sp__play" onClick={toggle} aria-label={playing ? 'Pause' : 'Lire'}>
            {playing
              ? <svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>
              : <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>}
          </button>
          <div className="sp__info">
            <div className="sp__title">{current ? current.title : ''}</div>
            <div className="sp__dom">Agriculture · DJOBI TOTO</div>
            <div className="sp__track"><div className="sp__fill" style={{ width: progress + '%' }}></div></div>
          </div>
          <span className="sp__time">{mmss(progress)} / {current ? current.dur.replace(' min', ':00') : '0:00'}</span>
          <button className="sp__close" onClick={close} aria-label="Fermer le lecteur">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"></path></svg>
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<AgriApp />);
