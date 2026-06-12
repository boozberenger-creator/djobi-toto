/* global React, ReactDOM, Hare, HareMini, Say, speakText, useReveal */
const { useState, useRef, useEffect, useCallback } = React;

/* ============================================================
   DATA
   ============================================================ */
const STORIES = [
  {
    id: 'lievre', title: 'Le lièvre et l\u2019hyène', illu: 'illu-histoire-1', col: 'var(--k-red)',
    scenes: [
      { moore: 'Daar a yembre, soaba ne katre n da bee weoogẽ.', fr: 'Il était une fois, le lièvre et l\u2019hyène vivaient dans la brousse.', bg: 'linear-gradient(160deg,#F4B860,#A0421C)' },
      { moore: 'Katre ra rat n dɩ wʋsgo, la a ka rat tʋʋm ye.', fr: 'L\u2019hyène voulait beaucoup manger, mais ne voulait pas travailler.', bg: 'linear-gradient(160deg,#5BC0EB,#1F6E8C)' },
      { moore: 'Soaba zãkẽ ne yam, n pʋɩ rɩɩbã sõma.', fr: 'Le lièvre, malin, partagea la nourriture avec sagesse.', bg: 'linear-gradient(160deg,#7FB069,#2E5E1E)' },
      { moore: 'Yaoolem, yam yɩɩda pãnga.', fr: 'À la fin, la ruse vaut mieux que la force.', bg: 'linear-gradient(160deg,#E8718B,#7A2E46)' },
    ],
  },
  {
    id: 'fille', title: 'La fille du roi', illu: 'illu-histoire-2', col: 'var(--k-red)',
    scenes: [
      { moore: 'Naab a ye ra tara bi-puglle sẽn yaa neere.', fr: 'Un roi avait une fille au cœur très bon.', bg: 'linear-gradient(160deg,#F4B860,#A0421C)' },
      { moore: 'A ra nong n sõng nin-talse fãa.', fr: 'Elle aimait aider toutes les personnes humbles.', bg: 'linear-gradient(160deg,#E8718B,#7A2E46)' },
      { moore: 'Bãngr ne nong-tɩrga la a tara pãnga.', fr: 'La sagesse et la gentillesse étaient sa vraie force.', bg: 'linear-gradient(160deg,#7FB069,#2E5E1E)' },
    ],
  },
  {
    id: 'baobab', title: 'Le baobab qui parlait', illu: 'illu-histoire-3', col: 'var(--k-red)',
    scenes: [
      { moore: 'Tɩ-kãsenga a ye ra wae n gomd ne kamba.', fr: 'Un grand baobab parlait souvent avec les enfants.', bg: 'linear-gradient(160deg,#7FB069,#2E5E1E)' },
      { moore: 'A togsd-b-la kʋdemd kɩbaya.', fr: 'Il leur racontait les histoires d\u2019autrefois.', bg: 'linear-gradient(160deg,#F4B860,#A0421C)' },
      { moore: 'Tʋʋlg fãa, b zĩnda n kelg-a.', fr: 'Chaque soir, ils s\u2019asseyaient pour l\u2019écouter.', bg: 'linear-gradient(160deg,#5BC0EB,#1F6E8C)' },
    ],
  },
];

const RHYMES = [
  {
    id: 'r1', title: 'Comptine du soleil', illu: 'illu-comptine-1', col: 'var(--k-yellow)',
    scenes: [
      { moore: 'Wĩndga, wĩndga, yi-yi-yi !', fr: 'Soleil, soleil, lève-toi !', bg: 'linear-gradient(160deg,#FCD116,#FF8C42)' },
      { moore: 'Beoog-beoog, d na n yik !', fr: 'Bon matin, nous nous réveillons !', bg: 'linear-gradient(160deg,#FF8C42,#A0421C)' },
      { moore: 'Tãab la sɩda, d sõe taab.', fr: 'Amis pour de vrai, aimons-nous bien.', bg: 'linear-gradient(160deg,#5BC0EB,#1F6E8C)' },
    ],
  },
  {
    id: 'r2', title: 'Compter en mooré', illu: 'illu-comptine-2', col: 'var(--k-yellow)',
    scenes: [
      { moore: 'A ye, a yiibu, a tãabo !', fr: 'Un, deux, trois !', bg: 'linear-gradient(160deg,#FCD116,#009E49)' },
      { moore: 'A naase, a nu — d sõdame !', fr: 'Quatre, cinq — nous comptons !', bg: 'linear-gradient(160deg,#009E49,#1F6E8C)' },
      { moore: 'Yʋʋm-yʋʋm, d bãngd n paasdẽ.', fr: 'Petit à petit, nous apprenons davantage.', bg: 'linear-gradient(160deg,#FF8C42,#A0421C)' },
    ],
  },
];

const COUNT_MOORE = ['', 'a ye', 'a yiibu', 'a tãabo', 'a naase', 'a nu', 'a yoobe', 'a yopoe', 'a nii', 'a wae', 'piiga'];

const HEROS = [
  { id: 'sankara', name: 'Thomas Sankara', tag: 'Le président intègre', slot: 'illu-heros-1' },
  { id: 'yennenga', name: 'Princesse Yennenga', tag: 'La mère des Mossi', slot: 'illu-heros-2' },
  { id: 'guimbi',  name: 'Guimbi Ouattara', tag: 'La résistante de Bobo', slot: 'illu-heros-3' },
];

/* ============================================================
   ICONS (flat, friendly)
   ============================================================ */
const Ic = {
  book: (<svg viewBox="0 0 48 48" fill="none" stroke="#EF2B2D" strokeWidth="2.6" strokeLinejoin="round"><path d="M24 12C20 8 12 8 8 9v28c4-1 12-1 16 3 4-4 12-4 16-3V9c-4-1-12-1-16 3Z"></path><path d="M24 12v31"></path></svg>),
  music: (<svg viewBox="0 0 48 48" fill="none" stroke="#C99A06" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 36V14l20-4v22"></path><circle cx="14" cy="36" r="4.5" fill="#FCD116" stroke="#C99A06"></circle><circle cx="34" cy="32" r="4.5" fill="#FCD116" stroke="#C99A06"></circle></svg>),
  school: (<svg viewBox="0 0 48 48" fill="none" stroke="#009E49" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M24 10 6 18l18 8 18-8Z"></path><path d="M14 22v9c0 3 4.5 5 10 5s10-2 10-5v-9"></path><path d="M42 18v9"></path></svg>),
  flag: (<svg viewBox="0 0 48 48" fill="none" stroke="#A0421C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6v36"></path><path d="M12 9h26l-5 7 5 7H12" fill="#EF2B2D" stroke="#A0421C"></path><circle cx="22" cy="16" r="2.6" fill="#FCD116" stroke="none"></circle></svg>),
};

function EarMini() {
  return (<svg className="ear" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8.5 9a3.5 3.5 0 0 1 7 0c0 2.2-1.8 3-2.7 4.2-.6.8-.8 1.6-.8 2.8"></path><circle cx="12" cy="18.6" r="1.2" fill="currentColor" stroke="none"></circle></svg>);
}

/* ============================================================
   FULL-SCREEN READER (stories & rhymes)
   ============================================================ */
function Reader({ item, onClose, onComplete }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showFr, setShowFr] = useState(true);
  const timer = useRef(null);
  const open = !!item;

  const scenes = item ? item.scenes : [];
  const scene = scenes[idx] || {};

  const clearT = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  const playScene = useCallback((i) => {
    if (!item) return;
    const sc = item.scenes[i];
    if (!sc) return;
    speakText(showFr ? sc.moore : sc.moore, { rate: 0.86 });
    clearT();
    timer.current = setTimeout(() => {
      if (i + 1 < item.scenes.length) { setIdx(i + 1); }
      else { setPlaying(false); if (onComplete) onComplete(); }
    }, 4200);
  }, [item, showFr, onComplete]);

  // when opened
  useEffect(() => {
    if (open) { setIdx(0); setPlaying(true); }
    else { clearT(); window.speechSynthesis && window.speechSynthesis.cancel(); }
    return clearT;
  }, [open, item]);

  // drive playback
  useEffect(() => {
    if (open && playing) playScene(idx);
    else { clearT(); window.speechSynthesis && window.speechSynthesis.cancel(); }
    return clearT;
  }, [open, playing, idx, playScene]);

  if (!open) return <div className="reader"></div>;

  const togglePlay = () => setPlaying((p) => !p);
  const again = () => { setIdx(0); setPlaying(true); };

  return (
    <div className={'reader open'}>
      <div className="reader__bg" style={{ background: scene.bg }}></div>
      <div className="reader__scene">
        <div className="reader__illu" key={idx}>
          <image-slot id={item.illu + '-r'} shape="rounded" radius="28" fit="cover"
            placeholder={'[ ' + item.illu.toUpperCase().replace(/-/g, '_') + ' ]'}></image-slot>
        </div>
      </div>

      <div className="reader__top">
        <div className="reader__title">{item.title}</div>
        <button className="reader__close" onClick={onClose} aria-label="Fermer">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>
        </button>
      </div>

      <div className="reader__bottom">
        <div className={'reader__subs' + (showFr ? '' : ' hide-fr')}>
          <div className="reader__moore">{scene.moore}</div>
          <div className="reader__fr">{scene.fr}</div>
        </div>
        <div className={'reader__wave' + (playing ? ' on' : '')}>
          {Array.from({ length: 13 }).map((_, i) => <i key={i}></i>)}
        </div>
        <div className="reader__ctrls">
          <button className="reader__subtoggle" onClick={() => setShowFr((s) => !s)}>
            {showFr ? 'Cacher le français' : 'Voir le français'}
          </button>
          <button className="reader__pause" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Lire'}>
            {playing
              ? <svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>
              : <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>}
          </button>
          <button className="reader__again" onClick={again}><span className="e">🔁</span> Encore !</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BAOBAB DES PROGRÈS
   ============================================================ */
const LEAVES = [
  [150,150],[185,140],[120,148],[210,165],[95,168],[170,118],[130,120],[225,135],
  [85,140],[200,118],[110,98],[160,90],[235,160],[75,118],[195,95],[140,150],
];
const FRUITS = [[120,180],[200,185],[160,200],[100,150],[225,178]];

function Baobab({ count }) {
  return (
    <div className="baobab-stage">
      <svg viewBox="0 0 320 320" role="img" aria-label="Mon arbre des progrès">
        {/* ground */}
        <ellipse cx="160" cy="298" rx="120" ry="16" fill="#E3C79C"></ellipse>
        {/* trunk — chunky baobab */}
        <path d="M138 300 C132 250 128 220 134 196 C120 196 112 188 116 180 C124 184 134 184 140 180 C140 168 150 150 160 150 C170 150 180 168 180 180 C186 184 196 184 204 180 C208 188 200 196 186 196 C192 220 188 250 182 300 Z"
          fill="#9C6B3F" stroke="#7A5230" strokeWidth="2"></path>
        <path d="M150 300 C148 260 150 220 160 196 C170 220 172 260 170 300 Z" fill="#8A5C34" opacity="0.5"></path>
        {/* canopy base hint */}
        <ellipse cx="160" cy="140" rx="96" ry="58" fill="#7FB069" opacity="0.14"></ellipse>

        {/* leaves */}
        {LEAVES.map((p, i) => (
          <g key={i} className={'leaf' + (i < count ? ' grown' : '')} style={{ animationDelay: (i % 4) * 0.05 + 's' }}>
            <ellipse cx={p[0]} cy={p[1]} rx="20" ry="15"
              fill={i % 3 === 0 ? '#7FB069' : (i % 3 === 1 ? '#5E9E48' : '#9ECF7E')}></ellipse>
          </g>
        ))}
        {/* fruits (badges) appear as the tree fills */}
        {FRUITS.map((p, i) => (
          <g key={'f' + i} className={'fruit' + (count >= (i + 1) * 3 ? ' grown' : '')}>
            <ellipse cx={p[0]} cy={p[1]} rx="7" ry="10" fill="#FF8C42" stroke="#A0421C" strokeWidth="1.4"></ellipse>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
function KidsApp() {
  useReveal();
  const [reader, setReader] = useState(null);     // story/rhyme object or null
  const [leaves, setLeaves] = useState(3);
  const [reward, setReward] = useState('');
  const rewardT = useRef(null);

  const grow = useCallback((msg) => {
    setLeaves((n) => Math.min(LEAVES.length, n + 1));
    if (msg) {
      setReward(msg);
      clearTimeout(rewardT.current);
      rewardT.current = setTimeout(() => setReward(''), 2600);
    }
  }, []);

  const openReader = useCallback((item, sayLabel) => {
    if (sayLabel) speakText(item.title, { rate: 0.92 });
    setReader(item);
  }, []);

  const closeReader = useCallback(() => {
    setReader(null);
    window.speechSynthesis && window.speechSynthesis.cancel();
  }, []);

  return (
    <React.Fragment>

      {/* ===================== HERO ===================== */}
      <header className="khero">
        <svg className="khero__pattern" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="kdan" width="70" height="48" patternUnits="userSpaceOnUse">
              <path d="M35 6 L52 24 L35 42 L18 24 Z" fill="none" stroke="#EF2B2D" strokeWidth="2.4"></path>
              <path d="M35 14 L44 24 L35 34 L26 24 Z" fill="#009E49"></path>
              <circle cx="35" cy="24" r="2.6" fill="#FCD116"></circle>
              <path d="M0 24 H10 M60 24 H70" stroke="#FF8C42" strokeWidth="2.4"></path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#kdan)"></rect>
        </svg>

        <div className="khero__top">
          <div className="mascot">
            <div className="mascot-bubble">Ne y yibeoogo !</div>
            <Hare />
          </div>
          <div className="khero__say">
            <div className="khero__eyebrow">Bienvenue, petit ami !</div>
            <h1>Ne y yibeoogo&nbsp;!</h1>
            <p className="khero__sub">Histoires, comptines et leçons en mooré. Touche, écoute, et apprends en t'amusant.</p>
            <div className="khero__cta">
              <Say text="Ne y yibeoogo ! Bienvenue chez DJOBI TOTO. Touche les images pour écouter des histoires et des chansons dans ta langue." size="xl" label="Écouter le message d'accueil" />
              <span className="say-hint">Touche pour<br />écouter&nbsp;👂</span>
            </div>
          </div>
        </div>

        <div className="khero__photo">
          <img src={(window.__resources && window.__resources.kidsPhoto) || 'assets/img/enfants-burkina.png'} alt="Des enfants burkinabè en habits traditionnels" />
          <div className="khero__photo-cap">Fait pour les enfants du Faso&nbsp;🇧🇫</div>
        </div>
      </header>

      {/* ===================== 4 UNIVERS ===================== */}
      <section className="ksec kwrap">
        <div className="ksec__head kreveal">
          <span className="mini-mascot"><HareMini /></span>
          <h2>Choisis ton monde</h2>
          <Say text="Choisis ton monde : les histoires, les comptines, l'école, ou mon Burkina." color="var(--terra)" />
        </div>

        <div className="univers4">
          {/* HISTOIRES */}
          <article className="ucard kreveal" style={{ '--ucol': 'var(--k-red)' }}>
            <div className="ucard__glow"></div>
            <svg className="ucard__pattern" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 L70 30 L50 52 L30 30 Z M50 48 L70 70 L50 92 L30 70 Z" fill="none" stroke="currentColor" strokeWidth="3"></path></svg>
            <div className="ucard__top">
              <div className="ucard__ic">{Ic.book}</div>
              <Say text="Les histoires : des contes de chez nous, racontés à voix haute." color="var(--k-red)" />
            </div>
            <h3>Les histoires</h3>
            <p>Des contes mooré racontés à voix haute, avec de belles images qui défilent.</p>
            <div className="ucard__items">
              {STORIES.map((s) => (
                <button key={s.id} className="ucard__chip" onClick={() => openReader(s, true)}>
                  <EarMini /> {s.title}
                </button>
              ))}
            </div>
          </article>

          {/* COMPTINES */}
          <article className="ucard kreveal kd1" style={{ '--ucol': 'var(--k-yellow)' }}>
            <div className="ucard__glow"></div>
            <svg className="ucard__pattern" viewBox="0 0 100 100" aria-hidden="true"><path d="M30 75V25l45-9v50" fill="none" stroke="currentColor" strokeWidth="3"></path><circle cx="24" cy="75" r="9" fill="currentColor"></circle><circle cx="69" cy="66" r="9" fill="currentColor"></circle></svg>
            <div className="ucard__top">
              <div className="ucard__ic">{Ic.music}</div>
              <Say text="Les comptines : des petites chansons en mooré pour chanter ensemble." color="#C99A06" />
            </div>
            <h3>Les comptines</h3>
            <p>Des petites chansons en mooré. Les mots s'illuminent : chante avec le lièvre&nbsp;!</p>
            <div className="ucard__items">
              {RHYMES.map((r) => (
                <button key={r.id} className="ucard__chip" onClick={() => openReader(r, true)}>
                  <EarMini /> {r.title}
                </button>
              ))}
            </div>
          </article>

          {/* ÉCOLE */}
          <article className="ucard kreveal kd2" style={{ '--ucol': 'var(--k-green)' }}>
            <div className="ucard__glow"></div>
            <svg className="ucard__pattern" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 20 18 36l32 16 32-16Z M30 44v18c0 6 9 10 20 10s20-4 20-10V44" fill="none" stroke="currentColor" strokeWidth="3"></path></svg>
            <div className="ucard__top">
              <div className="ucard__ic">{Ic.school}</div>
              <Say text="L'école : apprends l'alphabet, à compter, et les sciences, en t'amusant." color="var(--k-green)" />
            </div>
            <h3>École</h3>
            <p>L'alphabet, la lecture, compter, et les sciences — comme un jeu, avec des étoiles.</p>
            <div className="ucard__items">
              <button className="ucard__chip" onClick={() => { speakText('A, Be, Ce... apprenons les lettres !'); grow('Bravo ! Une nouvelle feuille pousse 🌱'); }}><EarMini /> Alphabet</button>
              <button className="ucard__chip" onClick={() => { const n = Math.floor(Math.random()*10)+1; speakText('Comptons : ' + COUNT_MOORE.slice(1, n+1).join(', ') + '. ' + n + ' !', {rate:0.8}); grow('Tu as compté jusqu\u2019à ' + n + ' ! 🌿'); }}><EarMini /> Compter</button>
              <button className="ucard__chip" onClick={() => { speakText('Le corps, les animaux, les plantes : découvrons la nature !'); grow('Petit savant ! 🌟'); }}><EarMini /> Sciences</button>
            </div>
          </article>

          {/* MON BURKINA */}
          <article className="ucard kreveal kd3" style={{ '--ucol': 'var(--terra)' }}>
            <div className="ucard__glow"></div>
            <svg className="ucard__pattern" viewBox="0 0 100 100" aria-hidden="true"><path d="M24 12v76 M24 18h52l-10 14 10 14H24" fill="none" stroke="currentColor" strokeWidth="3"></path></svg>
            <div className="ucard__top">
              <div className="ucard__ic">{Ic.flag}</div>
              <Say text="Mon Burkina : les héros, la carte du pays, les langues et la cuisine." color="var(--terra)" />
            </div>
            <h3>Mon Burkina</h3>
            <p>Les héros du pays, la carte, les langues et les bons plats de chez nous.</p>
            <div className="ucard__items">
              {HEROS.map((h) => (
                <button key={h.id} className="ucard__chip" onClick={() => { speakText(h.name + '. ' + h.tag + '.'); grow('Tu connais un héros ! ⭐'); }}>
                  <EarMini /> {h.name}
                </button>
              ))}
              <button className="ucard__chip" onClick={() => { speakText('La carte du Burkina Faso, avec ses treize régions !'); grow('En route pour le Faso ! 🗺️'); }}><EarMini /> La carte</button>
            </div>
          </article>
        </div>
      </section>

      {/* ===================== AUJOURD'HUI ===================== */}
      <section className="ksec today">
        <div className="kwrap">
          <div className="ksec__head kreveal">
            <span className="mini-mascot"><HareMini /></span>
            <h2>Aujourd'hui</h2>
            <Say text="Aujourd'hui : une histoire, une chanson, et un petit défi rien que pour toi." color="var(--k-mango)" />
          </div>
          <div className="today-rail">
            <article className="tcard kreveal" style={{ '--tcol': 'var(--k-red)' }} onClick={() => openReader(STORIES[2], true)}>
              <div className="tcard__badge">Histoire du jour</div>
              <div className="tcard__illu"><image-slot id="today-histoire" shape="rounded" radius="18" fit="cover" placeholder="[ ILLU_HISTOIRE_3 ]"></image-slot></div>
              <h3>{STORIES[2].title}</h3>
              <div className="tcard__row">
                <Say text={STORIES[2].title} color="var(--k-red)" />
                <span className="lbl">Écouter l'histoire →</span>
              </div>
            </article>

            <article className="tcard kreveal kd1" style={{ '--tcol': 'var(--k-yellow)' }} onClick={() => openReader(RHYMES[0], true)}>
              <div className="tcard__badge">Comptine du jour</div>
              <div className="tcard__illu"><image-slot id="today-comptine" shape="rounded" radius="18" fit="cover" placeholder="[ ILLU_COMPTINE_1 ]"></image-slot></div>
              <h3>{RHYMES[0].title}</h3>
              <div className="tcard__row">
                <Say text={RHYMES[0].title} color="#C99A06" />
                <span className="lbl">Chanter →</span>
              </div>
            </article>

            <article className="tcard kreveal kd2" style={{ '--tcol': 'var(--k-green)' }} onClick={() => { speakText('Petit défi : compte jusqu\u2019à dix en mooré ! A ye, a yiibu, a tãabo, a naase, a nu, a yoobe, a yopoe, a nii, a wae, piiga !', {rate:0.8}); grow('Défi relevé ! 🌿'); }}>
              <div className="tcard__badge">Petit défi</div>
              <div className="tcard__illu" style={{ display: 'grid', placeItems: 'center' }}>
                <span style={{ fontFamily: 'var(--k-title)', fontSize: '64px', color: 'var(--k-green)' }}>1·2·3</span>
              </div>
              <h3>Compter jusqu'à 10</h3>
              <div className="tcard__row">
                <Say text="Compte jusqu'à dix en mooré avec moi !" color="var(--k-green)" />
                <span className="lbl">Relever le défi →</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===================== MES PROGRÈS ===================== */}
      <section className="ksec progres kwrap">
        <div className="ksec__head kreveal" style={{ justifyContent: 'center' }}>
          <span className="mini-mascot"><HareMini /></span>
          <h2>Mon arbre des progrès</h2>
        </div>
        <p className="lead kreveal">Chaque histoire écoutée, chaque chanson apprise fait pousser une nouvelle feuille sur ton baobab&nbsp;!</p>
        <div className="kreveal"><Baobab count={leaves} /></div>
        <div className="progres__reward" style={{ opacity: reward ? 1 : 0 }}>{reward || '\u00a0'}</div>
        <div className="progres__actions kreveal">
          <button className="grow-btn" onClick={() => grow('Une feuille de plus ! 🌱')}><span className="e">🌿</span> J'ai écouté une histoire</button>
          <button className="grow-btn" onClick={() => grow('Bravo, tu chantes bien ! 🎶')}><span className="e">🎶</span> J'ai appris une chanson</button>
          <button className="grow-btn" onClick={() => grow('Tu apprends vite ! ⭐')}><span className="e">⭐</span> J'ai fait une leçon</button>
        </div>
      </section>

      {/* ===================== PARENTS ===================== */}
      <div className="parents">
        <div className="parents__inner">
          <a href="DJOBI TOTO.html">Vous êtes un parent ? Espace adulte →</a>
        </div>
      </div>
      <footer className="kfoot">
        <div className="flag"><i></i><i></i><i></i></div>
        <p>Grandir dans sa langue, c'est grandir debout.</p>
      </footer>

      {/* ===================== READER OVERLAY ===================== */}
      <Reader item={reader} onClose={closeReader} onComplete={() => grow('Histoire terminée ! Une feuille pousse 🌱')} />

    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<KidsApp />);
