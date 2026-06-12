/* ============================================================
   DJOBI TOTO — interactions
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Navbar reveal on scroll ---------- */
  const nav = document.querySelector('.nav');
  const stickyMic = document.querySelector('.sticky-mic');
  function onScroll() {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('show', y > window.innerHeight * 0.6);
    if (stickyMic) stickyMic.classList.toggle('show', y > window.innerHeight * 0.9);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------- Smooth anchor + mic scroll ---------- */
  function scrollToSel(sel) {
    const t = document.querySelector(sel);
    if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 60, behavior: 'smooth' });
  }
  document.querySelectorAll('[data-scroll]').forEach((el) => {
    el.addEventListener('click', (ev) => { ev.preventDefault(); scrollToSel(el.getAttribute('data-scroll')); });
  });

  /* ============================================================
     SECTION 2 — Carte 3D du Burkina Faso (v3)
     ============================================================ */
  const REGION_DATA = {
    'sahel':              { name:'Sahel',             lang:'Fulfulde',         g:'Jam waali',     t:'Que la paix soit avec toi.' },
    'nord':               { name:'Nord',              lang:'Mooré',            g:'Ne y yibeoogo', t:'Bonjour le matin.' },
    'centre-nord':        { name:'Centre-Nord',       lang:'Mooré',            g:'Ne y zaabre',   t:'Bonsoir.' },
    'boucle-du-mouhoun':  { name:'Boucle du Mouhoun', lang:'Dioula',           g:'I ni sɔgɔma',   t:'Bonjour (le matin).' },
    'est':                { name:'Est',               lang:'Gulmancéma',       g:'Naa ya bee',    t:'Bonjour à toi.' },
    'centre-ouest':       { name:'Centre-Ouest',      lang:'Mooré',            g:'Yãa kíbare?',   t:'Comment vas-tu ?' },
    'plateau-central':    { name:'Plateau-Central',   lang:'Mooré',            g:'Ne y yibeoogo', t:'Bonjour le matin.' },
    'centre':             { name:'Centre',            lang:'Mooré',            g:'Ne y windga',   t:'Bonsoir.' },
    'centre-est':         { name:'Centre-Est',        lang:'Bissa',            g:'Sa wala',       t:'Salutations.' },
    'centre-sud':         { name:'Centre-Sud',        lang:'Kasséna / Nuni',   g:'Ka so',         t:'Bonjour à vous.' },
    'hauts-bassins':      { name:'Hauts-Bassins',     lang:'Dioula',           g:'I ni ce',       t:'Salut à toi.' },
    'sud-ouest':          { name:'Sud-Ouest',         lang:'Dagara',           g:'A naa',         t:'Salut à toi.' },
    'cascades':           { name:'Cascades',          lang:'Sénoufo / Dioula', g:'I ni sɔgɔma',   t:'Bonjour le matin.' }
  };
  const REGION_CENTERS = {
    'sahel':{x:625,y:215},'nord':{x:375,y:170},'centre-nord':{x:460,y:265},'boucle-du-mouhoun':{x:200,y:260},
    'est':{x:680,y:385},'centre-ouest':{x:355,y:340},'plateau-central':{x:505,y:355},'centre':{x:490,y:385},
    'centre-est':{x:615,y:460},'centre-sud':{x:465,y:455},'hauts-bassins':{x:175,y:385},'sud-ouest':{x:320,y:475},'cascades':{x:155,y:525}
  };
  const VIEWBOX_W = 900, VIEWBOX_H = 660;
  const map3d = document.getElementById('map3d');
  const hologram = document.getElementById('hologram');

  if (map3d && hologram) {
    const holoRegion = document.getElementById('holoRegion');
    const holoGreeting = document.getElementById('holoGreeting');
    const holoLang = document.getElementById('holoLang');
    const regionEls = document.querySelectorAll('.region');
    const panel = document.getElementById('infoPanel');
    const rName = document.getElementById('rName');
    const rGreeting = document.getElementById('rGreeting');
    const rTranslation = document.getElementById('rTranslation');
    const rLanguage = document.getElementById('rLanguage');
    const mPlayBtn = document.getElementById('playBtn');
    const waveform = document.getElementById('waveform');
    const resetBtn = document.getElementById('resetBtn');
    let activeRegion = null;
    const synth = window.speechSynthesis;

    function positionHologram(region) {
      const c = REGION_CENTERS[region]; if (!c) return;
      hologram.style.left = (c.x / VIEWBOX_W) * 100 + '%';
      hologram.style.top = (c.y / VIEWBOX_H) * 100 - 12 + '%';
    }
    function showRegion(key) {
      const data = REGION_DATA[key]; if (!data) return;
      activeRegion = key;
      regionEls.forEach((r) => r.classList.remove('active'));
      const el = document.querySelector('[data-region="' + key + '"]');
      if (el) el.classList.add('active');
      rName.textContent = data.name;
      rGreeting.textContent = data.g;
      rTranslation.textContent = '« ' + data.t + ' »';
      rLanguage.textContent = data.lang;
      panel.classList.add('has-region');
    }
    function activateHologram(key) {
      positionHologram(key);
      hologram.classList.remove('visible');
      void hologram.offsetWidth;
      const data = REGION_DATA[key];
      holoRegion.textContent = data.name;
      holoGreeting.textContent = data.g;
      holoLang.textContent = data.lang;
      map3d.classList.add('flat');
      hologram.classList.add('visible');
    }
    function stopPlay() {
      mPlayBtn.classList.remove('playing');
      waveform.classList.remove('playing');
      if (synth && synth.speaking) synth.cancel();
    }
    function resetView() {
      map3d.classList.remove('flat');
      hologram.classList.remove('visible');
      regionEls.forEach((r) => r.classList.remove('active'));
      panel.classList.remove('has-region');
      activeRegion = null;
      stopPlay();
    }
    function playGreeting() {
      if (!activeRegion) return;
      if (mPlayBtn.classList.contains('playing')) { stopPlay(); return; }
      const data = REGION_DATA[activeRegion];
      mPlayBtn.classList.add('playing');
      waveform.classList.add('playing');
      try {
        const u = new SpeechSynthesisUtterance(data.g);
        u.lang = 'fr-FR'; u.rate = 0.85; u.onend = stopPlay;
        synth.cancel(); synth.speak(u);
      } catch (e) { setTimeout(stopPlay, 2200); }
    }
    regionEls.forEach((r) => {
      r.addEventListener('mouseenter', () => showRegion(r.dataset.region));
      r.addEventListener('click', (e) => {
        e.stopPropagation();
        showRegion(r.dataset.region);
        activateHologram(r.dataset.region);
        playGreeting();
      });
      r.setAttribute('tabindex', '0');
      r.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showRegion(r.dataset.region);
          activateHologram(r.dataset.region);
        }
      });
    });
    mPlayBtn.addEventListener('click', playGreeting);
    resetBtn.addEventListener('click', resetView);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') resetView(); });
    setTimeout(() => { if (!activeRegion) showRegion('centre'); }, 1600);
  }

  /* ============================================================
     SECTION 3 — Conversation auto-typée
     ============================================================ */
  const SCRIPT = [
    { who:'bot',  lang:'Français', text:'Bonjour 👋 Comment puis-je vous aider aujourd\u2019hui ?' },
    { who:'user', lang:'Mooré',    text:'Ne y windga. Yʋʋmd koom na n niẽ beoogo bɩ ?' },
    { who:'bot',  lang:'Français', text:'Demain à Ouagadougou : ciel nuageux, pluie probable l\u2019après-midi. Pensez à protéger vos récoltes.' },
    { who:'user', lang:'Mooré',    text:'Barka wʋsgo !' },
    { who:'bot',  lang:'Français', text:'Avec plaisir. Voulez-vous que je vous prévienne chaque matin ?' },
  ];
  const bubblesEl = document.getElementById('bubbles');
  let convoStarted = false;

  function typeBubble(msg) {
    return new Promise((resolve) => {
      const b = document.createElement('div');
      b.className = 'bubble ' + (msg.who === 'user' ? 'user' : 'bot');
      const lang = document.createElement('span');
      lang.className = 'lang'; lang.textContent = msg.lang;
      const body = document.createElement('span');
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      b.appendChild(lang); b.appendChild(body); b.appendChild(cursor);
      bubblesEl.appendChild(b);
      requestAnimationFrame(() => b.classList.add('in'));
      // keep last 4 bubbles visible
      while (bubblesEl.children.length > 4) bubblesEl.removeChild(bubblesEl.firstChild);

      let i = 0;
      const txt = msg.text;
      (function tick() {
        if (i <= txt.length) {
          body.textContent = txt.slice(0, i);
          i++;
          setTimeout(tick, 22 + Math.random() * 28);
        } else {
          cursor.remove();
          setTimeout(resolve, 750);
        }
      })();
    });
  }

  async function runConvo() {
    while (true) {
      bubblesEl.innerHTML = '';
      for (const m of SCRIPT) {
        // brief "thinking" pause before bot replies
        if (m.who === 'bot') await new Promise((r) => setTimeout(r, 320));
        await typeBubble(m);
      }
      await new Promise((r) => setTimeout(r, 2600));
    }
  }

  if (bubblesEl) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !convoStarted) { convoStarted = true; runConvo(); }
      });
    }, { threshold: 0.3 });
    cio.observe(bubblesEl);
  }
})();
