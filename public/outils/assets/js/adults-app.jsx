/* global React, ReactDOM, VB, speakA, useLang, LANGS, DICONS, DOMAINS */
const { useState, useRef, useEffect, useCallback } = React;

/* greeting per language */
const GREET = {
  'Mooré': 'Ne y yibeoogo', 'Dioula': 'I ni sɔgɔma', 'Fulfulde': 'Jam waali', 'Français': 'Bienvenue',
};

const FEATURED = [
  { dom: 'Argent',      col: 'var(--d-argent)', slot: 'img-featured-1', title: 'Comment ouvrir un compte d\u2019épargne', dur: '12 min', text: "Aujourd'hui : comment ouvrir un compte d'épargne, expliqué simplement, étape par étape." },
  { dom: 'Santé',       col: 'var(--d-sante)',  slot: 'img-featured-2', title: "Soigner la diarrhée d'un enfant", dur: '8 min', text: "Aujourd'hui : soigner la diarrhée d'un enfant, les bons gestes qui sauvent." },
  { dom: 'Agriculture', col: 'var(--d-agri)',   slot: 'img-featured-3', title: 'Les prix du mil cette semaine', dur: '5 min', text: "Aujourd'hui : les prix du mil cette semaine sur les marchés du pays." },
];

const TEMOINS = [
  { slot: 'img-temoin-1', id: 'Awa', meta: '34 ans · Kombissiri', quote: "« J'ai appris à reconnaître les premiers signes du paludisme chez mon fils. »" },
  { slot: 'img-temoin-2', id: 'Salif', meta: '52 ans · Bobo-Dioulasso', quote: "« Maintenant je sais comment vendre mon karité à un meilleur prix. »" },
  { slot: 'img-temoin-3', id: 'Mariam', meta: '28 ans · Ouagadougou', quote: "« J'ai ouvert mon premier compte d'épargne grâce à DJOBI. »" },
];

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.areveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

/* mini hare for the kids bridge */
function HareBridge() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M26 40 C16 18 16 4 24 4 C32 4 34 22 33 40 Z" fill="#C89058"></path>
      <path d="M54 40 C64 18 64 4 56 4 C48 4 46 22 47 40 Z" fill="#C89058"></path>
      <path d="M26 36 C20 18 20 8 25 9 C30 10 31 24 30 36 Z" fill="#E8718B" opacity="0.7"></path>
      <path d="M54 36 C60 18 60 8 55 9 C50 10 49 24 50 36 Z" fill="#E8718B" opacity="0.7"></path>
      <ellipse cx="40" cy="50" rx="27" ry="24" fill="#C89058"></ellipse>
      <ellipse cx="40" cy="58" rx="14" ry="11" fill="#EAD0AC"></ellipse>
      <circle cx="31" cy="47" r="4" fill="#3A2A1B"></circle>
      <circle cx="49" cy="47" r="4" fill="#3A2A1B"></circle>
      <path d="M40 54 l-4 3 a4 3 0 0 0 8 0 Z" fill="#A0421C"></path>
    </svg>
  );
}

function FeaturedCard({ f }) {
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); return; }
    setPlaying(true); speakA(f.text, { onend: () => setPlaying(false) });
    setTimeout(() => setPlaying(false), 6000);
  };
  return (
    <article className="fcard areveal">
      <div className="fcard__media">
        <image-slot id={f.slot} shape="rect" fit="cover" placeholder={'[ ' + f.slot.toUpperCase().replace(/-/g, '_') + ' ]'}></image-slot>
        <span className="fcard__dom" style={{ background: f.col }}>{f.dom}</span>
      </div>
      <div className="fcard__body">
        <div className="fcard__title">{f.title}</div>
        <div className="fcard__meta"><span>🎧 Audio</span><span>·</span><span>{f.dur}</span></div>
        <div className="fcard__row">
          <button className={'fcard__play' + (playing ? ' playing' : '')} onClick={toggle} aria-label={playing ? 'Pause' : 'Écouter'}>
            <svg className="p" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
            <svg className="pa" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>
          </button>
          <div className={'fcard__wave' + (playing ? ' on' : '')}>
            {Array.from({ length: 15 }).map((_, i) => <i key={i}></i>)}
          </div>
        </div>
      </div>
    </article>
  );
}

function AdultsApp() {
  useReveal();
  const [lang, setLang] = useLang();
  const greet = GREET[lang] || GREET['Mooré'];

  return (
    <React.Fragment>
      {/* TOP BAR */}
      <nav className="abar2">
        <a className="abar2__brand" href="DJOBI TOTO.html">
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
            {LANGS.map((l) => (
              <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>{l}</button>
            ))}
          </div>
          <a className="abar2__home" href="DJOBI TOTO.html">Accueil</a>
        </div>
      </nav>

      {/* 1 · HERO */}
      <header className="ahero2">
        <svg className="ahero2__pattern" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="adan" width="64" height="40" patternUnits="userSpaceOnUse">
              <path d="M32 5 L48 20 L32 35 L16 20 Z" fill="none" stroke="#2C1810" strokeWidth="1.1"></path>
              <path d="M0 20 H8 M56 20 H64" stroke="#2C1810" strokeWidth="1.1"></path>
              <circle cx="32" cy="20" r="1.4" fill="#2C1810"></circle>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#adan)"></rect>
        </svg>
        <div className="ahero2__illu">
          <image-slot id="illustration-hero" shape="rect" fit="cover" placeholder="[ ILLUSTRATION_HERO ] — baobab / mains tenant un téléphone, sépia"></image-slot>
        </div>
        <div className="awrap">
          <div className="ahero2__inner">
            <h1>Bienvenue, ami.<span className="moore">{greet}</span></h1>
            <p className="ahero2__sub">Choisis un domaine. Tout est expliqué à voix haute, dans ta langue.</p>
            <div className="ahero2__cta">
              <VB size="xl" text={greet + '. Bienvenue chez DJOBI TOTO. Choisis un domaine ci-dessous : tout est expliqué à voix haute, dans ta langue.'} label="Écouter le message d'accueil" />
              <span className="hint">Appuie pour<br />écouter l'accueil</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2 · À ÉCOUTER AUJOURD'HUI */}
      <section className="featured">
        <div className="awrap">
          <div className="featured__head">
            <div>
              <span className="a-eyebrow">À écouter aujourd'hui</span>
              <h2>Les essentiels du jour</h2>
            </div>
            <VB text="À écouter aujourd'hui : les essentiels du jour, mis à jour pour toi." />
          </div>
          <div className="featured-grid">
            {FEATURED.map((f) => <FeaturedCard key={f.slot} f={f} />)}
          </div>
        </div>
      </section>

      {/* 3 · LES 8 DOMAINES */}
      <section className="domains">
        <div className="awrap">
          <div className="domains__head areveal">
            <span className="a-eyebrow">Huit domaines essentiels</span>
            <h2>Tout savoir utile, dans ta langue.</h2>
            <p>Chaque domaine rassemble des dizaines de contenus courts, à écouter quand tu veux.</p>
          </div>
          <div className="domains-grid">
            {DOMAINS.map((d, i) => (
              <a key={d.id} className={'dcard areveal' + (d.patrie ? ' patrie' : '') + ' ad' + ((i % 2) + 1)}
                 style={{ '--dc': d.col }} href={d.href || undefined}
                 onClick={(e) => { if (!d.href) e.preventDefault(); }}>
                <div className="dcard__ic" style={{ stroke: d.col }}>{DICONS[d.ic]}</div>
                <div className="dcard__main">
                  <div className="dcard__top">
                    <h3>{d.name}</h3>
                    <VB text={d.name + '. ' + d.hook + ' ' + d.desc} label={'Écouter : ' + d.name} />
                  </div>
                  <div className="dcard__hook" style={{ color: d.patrie ? 'var(--terra)' : d.col }}>{d.hook}</div>
                  <p className="dcard__desc">{d.desc}</p>
                  <span className="dcard__count"><span className="dot" style={{ background: d.patrie ? 'var(--terra)' : d.col }}></span>{typeof d.count === 'number' ? d.count + ' contenus à écouter' : d.count}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 4 · COMMENT ÇA MARCHE */}
      <section className="how">
        <svg className="how__pattern" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="adan-d" width="64" height="40" patternUnits="userSpaceOnUse">
              <path d="M32 5 L48 20 L32 35 L16 20 Z" fill="none" stroke="#F5EDDC" strokeWidth="1.1"></path>
              <path d="M0 20 H8 M56 20 H64" stroke="#F5EDDC" strokeWidth="1.1"></path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#adan-d)"></rect>
        </svg>
        <div className="awrap how__inner">
          <div className="how__steps">
            <div className="hstep areveal">
              <div className="hstep__ic"><svg viewBox="0 0 32 32"><path d="M13 4v13M13 17l-3 1c-2 1-3 3-2 5l2 5c1 2 3 3 5 3h6c2 0 4-1 5-3l1-6c.5-2-1-4-3-4h-7" strokeLinecap="round" strokeLinejoin="round"></path></svg></div>
              <div className="hstep__n">Premièrement</div>
              <h3>Tu choisis ton domaine</h3>
            </div>
            <div className="hstep areveal ad1">
              <div className="hstep__ic"><svg viewBox="0 0 32 32"><path d="M11 12a5 5 0 0 1 10 0c0 3-2.5 4.2-3.7 5.8-.8 1-1.3 2.2-1.3 3.9" strokeLinecap="round"></path><circle cx="16" cy="25" r="1.8" fill="#B8542A" stroke="none"></circle></svg></div>
              <div className="hstep__n">Ensuite</div>
              <h3>Tu écoutes dans ta langue</h3>
            </div>
            <div className="hstep areveal ad2">
              <div className="hstep__ic"><svg viewBox="0 0 32 32"><rect x="6" y="8" width="20" height="18" rx="2"></rect><path d="M6 13h20M11 5v5M21 5v5M11 18h4M11 22h8" strokeLinecap="round"></path></svg></div>
              <div className="hstep__n">Et toujours</div>
              <h3>Tu apprends à ton rythme</h3>
            </div>
          </div>
          <p className="how__punch areveal">Pas besoin de savoir lire.<br /><b>DJOBI TOTO parle.</b></p>
        </div>
      </section>

      {/* 5 · TÉMOIGNAGES */}
      <section className="temoins2">
        <div className="awrap">
          <div className="temoins2__head areveal">
            <span className="a-eyebrow">Celles et ceux qui s'en servent</span>
            <h2>Des changements concrets.</h2>
          </div>
          <div className="temoins2-grid">
            {TEMOINS.map((t, i) => (
              <article key={t.slot} className={'tcard2 areveal ad' + (i + 1)}>
                <div className="tcard2__top">
                  <image-slot id={t.slot} shape="rounded" radius="12" fit="cover" placeholder={'[ ' + t.slot.toUpperCase().replace(/-/g, '_') + ' ]'}></image-slot>
                  <div>
                    <div className="tcard2__id">{t.id}</div>
                    <div className="tcard2__meta">{t.meta}</div>
                  </div>
                </div>
                <p className="tcard2__quote">{t.quote}</p>
                <div className="tcard2__row">
                  <VB text={t.id + ', ' + t.meta + '. ' + t.quote.replace(/[«»]/g, '')} label={'Écouter le témoignage de ' + t.id} />
                  <span className="lbl">Écouter en mooré</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · PONT ENFANTS */}
      <section className="bridge">
        <div className="bridge__inner">
          <span className="bridge__mascot"><HareBridge /></span>
          <div className="bridge__txt">
            <h3>Vos enfants apprennent aussi.</h3>
            <p>Histoires, comptines et leçons en mooré, pensées pour les plus jeunes.</p>
          </div>
          <a className="bridge__link" href="Espace enfants.html">Espace enfants →</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="afoot">
        <div className="afoot__flag"><i></i><i></i><i></i></div>
        <div className="awrap">
          <div className="afoot__top">
            <div className="afoot__brand">
              <span className="logo-word">DJOBI&nbsp;TOTO</span>
              <p>Tout savoir utile, expliqué à voix haute, dans la langue de chacun.</p>
            </div>
            <div className="afoot__col">
              <h4>DJOBI TOTO</h4>
              <a href="#">À propos</a><a href="#">Mission</a><a href="#">Partenaires</a>
            </div>
            <div className="afoot__col">
              <h4>Domaines</h4>
              <a href="Domaine — Agriculture.html">Agriculture</a><a href="#">Santé</a><a href="#">Argent</a>
            </div>
            <div className="afoot__col">
              <h4>Aide</h4>
              <a href="#">Confidentialité</a><a href="#">Nous contacter</a><a href="DJOBI TOTO.html">Accueil</a>
            </div>
          </div>
          <div className="afoot__bottom">
            <span className="made">Fait au Burkina Faso, pour le Burkina Faso.</span>
            <span>© 2026 DJOBI TOTO</span>
          </div>
        </div>
      </footer>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<AdultsApp />);
