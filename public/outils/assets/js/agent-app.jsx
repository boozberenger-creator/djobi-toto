/* global React, ReactDOM */
const { useState, useRef, useEffect, useCallback } = React;

/* ----------------------------------------------------------------
   DATA
---------------------------------------------------------------- */
const VOICES = [
  { id: 'aine',   name: "L'Aîné",   lang: 'Mooré · conteur',     img: 'assets/img/sage-baobab.png',  slot: 'voix-1' },
  { id: 'djobi',  name: 'Djobi',    lang: 'Mooré · neutre',      img: 'assets/img/voix-cyborg.png',  slot: 'voix-2' },
  { id: 'salim',  name: 'Salimata', lang: 'Dioula · Bobo',       img: '',                            slot: 'voix-3' },
  { id: 'aicha',  name: 'Aïcha',    lang: 'Fulfulde · Dori',     img: '',                            slot: 'voix-4' },
  { id: 'noaga',  name: 'Noaga',    lang: 'Français · Ouaga',    img: '',                            slot: 'voix-5' },
];

const INPUT_LANGS = ['Mooré', 'Dioula', 'Fulfulde', 'Français'];

const SUGGESTIONS = [
  {
    q: "Comment soigner la diarrhée d'un enfant ?", lang: 'Français',
    a: "Donnez à boire souvent : eau propre + solution SRO (une pincée de sel, une poignée de sucre dans 1 L). Continuez l'allaitement et les repas. Allez vite au centre de santé s'il y a du sang, une forte fièvre ou les yeux creux."
  },
  {
    q: "Quel est le meilleur engrais pour le mil ?", lang: 'Français',
    a: "Commencez par du fumier organique au labour. À la levée, apportez du NPK 14-23-14, puis de l'urée à la montaison. Ajustez les doses selon les pluies et la richesse de votre sol."
  },
  {
    q: "Raconte-moi une histoire en mooré", lang: 'Mooré',
    a: "Daar a yembre, soaba ne a bi-bila n da bee weoogẽ… Le lièvre rusé promit à l'hyène un festin, mais c'est la patience qui, ce soir-là, remplit les marmites. Veux-tu la suite ?"
  },
  {
    q: "Explique-moi ce qu'est un compte bancaire", lang: 'Français',
    a: "Un compte garde votre argent en sécurité : vous déposez, retirez et envoyez quand vous voulez. Au Burkina, le mobile money (Orange, Moov) s'ouvre simplement avec une pièce d'identité — c'est un premier compte très pratique."
  },
];

const VOICE_SAMPLES = [
  "Yʋʋmd koom na n niẽ beoogo bɩ ?",
  "Wãn la m na n kẽng dʋkããgã ?",
  "Sõng-m tɩ m gʋls lɛtre kãngã.",
];

/* ----------------------------------------------------------------
   Organic blob (full-screen voice mode)
---------------------------------------------------------------- */
function blobPath(cx, cy, base, t, level, seed) {
  const N = 80;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const wob =
      0.13 * Math.sin(3 * a + t * 1.1 + seed) +
      0.09 * Math.sin(5 * a - t * 0.8 + seed) +
      0.05 * Math.sin(8 * a + t * 1.6);
    const r = base * (1 + level * wob);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
  }
  return d + 'Z';
}

function VoiceBlob({ active }) {
  const p1 = useRef(null), p2 = useRef(null), p3 = useRef(null);
  const raf = useRef(0);
  const level = useRef(0.4);
  useEffect(() => {
    let start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      // simulated voice amplitude: slow breathing + lively jitter
      const target = active ? 0.55 + 0.45 * Math.abs(Math.sin(t * 2.3)) * (0.6 + 0.4 * Math.random()) : 0.32;
      level.current += (target - level.current) * 0.15;
      const L = level.current;
      if (p1.current) p1.current.setAttribute('d', blobPath(200, 200, 132, t, L, 0));
      if (p2.current) p2.current.setAttribute('d', blobPath(200, 200, 104, t * 1.15, L, 2.1));
      if (p3.current) p3.current.setAttribute('d', blobPath(200, 200, 70, t * 0.9, L, 4.2));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active]);
  return (
    <div className="vm-blob">
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <radialGradient id="blobGrad" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#C5562E" />
            <stop offset="100%" stopColor="#A0421C" />
          </radialGradient>
        </defs>
        <path ref={p1} fill="url(#blobGrad)" opacity="0.92" />
        <path ref={p2} fill="#8E3414" opacity="0.85" />
        <path ref={p3} fill="#FCD116" opacity="0.42" />
      </svg>
    </div>
  );
}

/* ----------------------------------------------------------------
   Voice selector card
---------------------------------------------------------------- */
function VoiceCard({ v, active, onSelect, onPreview }) {
  return (
    <div className={'voice-card' + (active ? ' active' : '')} onClick={() => onSelect(v.id)}>
      <image-slot id={v.slot} shape="rounded" radius="12" fit="cover" src={v.img || undefined}
        placeholder={'[ IMAGE_' + v.slot.toUpperCase().replace('-', '_') + ' ]'}></image-slot>
      <div className="meta">
        <div className="nm">{v.name}</div>
        <div className="lg">{v.lang}</div>
      </div>
      <button className="prev" aria-label={'Prévisualiser ' + v.name}
        onClick={(e) => { e.stopPropagation(); onPreview(v); }}>
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------
   Message bubble
---------------------------------------------------------------- */
function Message({ m, playing, onReplay }) {
  return (
    <div className={'msg ' + m.who}>
      <span className="lang-chip">{m.lang}{m.who === 'bot' ? ' · DJOBI TOTO' : ''}</span>
      <div className={'bubble2' + (m.transcribing ? ' transcribing' : '')}>
        {m.text}{m.typing ? <span className="cursor"></span> : null}
      </div>
      {m.who === 'bot' && !m.typing && m.text ? (
        <button className={'replay' + (playing ? ' playing' : '')} onClick={() => onReplay(m)}>
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
          <span className="mini-wave"><i></i><i></i><i></i><i></i></span>
          Réécouter
        </button>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------
   APP
---------------------------------------------------------------- */
function AgentApp() {
  const [messages, setMessages] = useState([
    { id: 1, who: 'bot', lang: 'Mooré', text: "Ne y windga ! Je suis DJOBI TOTO. Pose ta question — à l'oral ou à l'écrit, dans ta langue." },
  ]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [inputLang, setInputLang] = useState('Français');
  const [voice, setVoice] = useState('aine');
  const [vmOpen, setVmOpen] = useState(false);
  const [vmText, setVmText] = useState('');
  const [ctxOpen, setCtxOpen] = useState(false);
  const [playingId, setPlayingId] = useState(null);

  const msgEnd = useRef(null);
  const idRef = useRef(2);
  const synth = window.speechSynthesis;

  useEffect(() => {
    if (msgEnd.current) msgEnd.current.scrollIntoView({ block: 'end' });
  }, [messages, typing]);

  const speak = useCallback((text, lang, onend) => {
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (lang === 'Français') ? 'fr-FR' : 'fr-FR';
      u.rate = 0.9;
      if (onend) u.onend = onend;
      synth.speak(u);
    } catch (e) { if (onend) setTimeout(onend, 1800); }
  }, [synth]);

  const replay = useCallback((m) => {
    setPlayingId(m.id);
    speak(m.text, m.lang, () => setPlayingId(null));
    setTimeout(() => setPlayingId((p) => (p === m.id ? null : p)), 4000);
  }, [speak]);

  const answerFor = (text) => {
    const hit = SUGGESTIONS.find((s) => s.q === text);
    if (hit) return hit.a;
    return "Bien reçu. Je peux t'aider sur la santé, l'agriculture, l'administration, l'apprentissage ou simplement discuter — précise ta question et je réponds dans ta langue.";
  };

  const botReply = useCallback((userText) => {
    setTyping(true);
    const full = answerFor(userText);
    const delay = 800 + Math.random() * 500;
    setTimeout(() => {
      setTyping(false);
      const id = idRef.current++;
      setMessages((prev) => [...prev, { id, who: 'bot', lang: 'Français', text: '', typing: true }]);
      // typewriter
      let i = 0;
      const tick = () => {
        i++;
        setMessages((prev) => prev.map((m) => m.id === id ? { ...m, text: full.slice(0, i) } : m));
        if (i < full.length) {
          setTimeout(tick, 16 + Math.random() * 22);
        } else {
          setMessages((prev) => prev.map((m) => m.id === id ? { ...m, typing: false } : m));
        }
      };
      tick();
    }, delay);
  }, []);

  const send = useCallback((text, lang) => {
    const t = (text || '').trim();
    if (!t) return;
    const id = idRef.current++;
    setMessages((prev) => [...prev, { id, who: 'user', lang: lang || inputLang, text: t }]);
    setInput('');
    botReply(t);
  }, [inputLang, botReply]);

  const onPreview = useCallback((v) => {
    setVoice(v.id);
    const sample = v.lang.startsWith('Français') ? "Bonjour, je suis votre voix DJOBI TOTO." : "Ne y windga, mam yaa DJOBI TOTO.";
    speak(sample, 'Français');
  }, [speak]);

  /* Voice mode: type a sample question while open */
  useEffect(() => {
    if (!vmOpen) { setVmText(''); return; }
    const sample = VOICE_SAMPLES[Math.floor(Math.random() * VOICE_SAMPLES.length)];
    let i = 0, alive = true;
    setVmText('');
    const tick = () => {
      if (!alive) return;
      i++;
      setVmText(sample.slice(0, i));
      if (i < sample.length) setTimeout(tick, 70 + Math.random() * 60);
    };
    const start = setTimeout(tick, 700);
    return () => { alive = false; clearTimeout(start); };
  }, [vmOpen]);

  const stopVoice = useCallback(() => {
    const captured = vmText;
    setVmOpen(false);
    if (captured && captured.trim()) {
      setTimeout(() => send(captured, 'Mooré'), 350);
    }
  }, [vmText, send]);

  const activeVoice = VOICES.find((v) => v.id === voice);

  return (
    <React.Fragment>

      {/* ===== HERO ===== */}
      <header className="ahero">
        <svg className="ahero__pattern" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="100%" height="100%" fill="url(#strip-ivory)"></rect>
        </svg>
        <div className="ahero__media">
          <img src="assets/img/ia-djobi.png" alt="DJOBI TOTO — l'intelligence artificielle burkinabè" />
          <div className="ahero__media-fade"></div>
        </div>
        <div className="ahero__inner">
          <h1>Parle. <em>DJOBI&nbsp;TOTO</em> écoute.</h1>
          <p className="ahero__sub">Pose ta question en mooré, en dioula ou en français. Réponse immédiate, à l'oral comme à l'écrit.</p>
          <button className="bigmic" onClick={() => setVmOpen(true)} aria-label="Parler">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a4 4 0 0 0 4-4v-5a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4Zm6.5-4a.9.9 0 0 1 1.8 0 8.3 8.3 0 0 1-7.4 8.25V23a.9.9 0 0 1-1.8 0v-3.05A8.3 8.3 0 0 1 3.7 11.5a.9.9 0 0 1 1.8 0 6.5 6.5 0 0 0 13 0Z"></path></svg>
          </button>
          <p className="ahero__hint">Appuie pour parler</p>
        </div>
        <div className="ahero__scroll"><span>La conversation</span><span className="dot"></span></div>
      </header>

      {/* ===== CHAT ===== */}
      <section className="chat-sec" id="chat">
        <div className="chat-head">
          <p className="eyebrow">L'agent conversationnel</p>
          <h2>Une conversation, ta langue.</h2>
        </div>

        <div className="chat-shell">
          {/* Conversation */}
          <div className="conversation">
            <div className="conv-top">
              <div className="ava"><img src={activeVoice && activeVoice.img ? activeVoice.img : 'assets/img/voix-cyborg.png'} alt="" /></div>
              <div>
                <div className="who">DJOBI TOTO</div>
                <div className="sub">En ligne · répond en quelques secondes</div>
              </div>
              <span className="voice-pill">Voix : {activeVoice ? activeVoice.name : '—'}</span>
            </div>

            <div className="messages">
              {messages.map((m) => (
                <Message key={m.id} m={m} playing={playingId === m.id} onReplay={replay} />
              ))}
              {typing ? (<div className="typing"><i></i><i></i><i></i></div>) : null}
              <div ref={msgEnd}></div>
            </div>

            <div className="composer">
              <div className="composer-row">
                <button className="mic-btn" onClick={() => setVmOpen(true)} aria-label="Mode vocal">
                  <svg viewBox="0 0 24 24"><path d="M12 15.5a4 4 0 0 0 4-4v-5a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4Zm6.5-4a.9.9 0 0 1 1.8 0 8.3 8.3 0 0 1-7.4 8.25V23a.9.9 0 0 1-1.8 0v-3.05A8.3 8.3 0 0 1 3.7 11.5a.9.9 0 0 1 1.8 0 6.5 6.5 0 0 0 13 0Z"></path></svg>
                </button>
                <input type="text" value={input} placeholder="Écris ou appuie sur le micro…"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(input); }} />
                <button className="send-btn" disabled={!input.trim()} onClick={() => send(input)} aria-label="Envoyer">
                  <svg viewBox="0 0 24 24"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z"></path></svg>
                </button>
              </div>
              <div className="composer-tools">
                <button><svg viewBox="0 0 24 24"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5"></path></svg> Pièce jointe</button>
                <button onClick={() => onPreview(activeVoice)}><svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm6-3a6 6 0 0 1-12 0M12 18v3"></path></svg> Voix : {activeVoice ? activeVoice.name : '—'}</button>
                <button><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z"></path></svg> Paramètres</button>
              </div>
            </div>
          </div>

          {/* Context panel */}
          <aside className={'context' + (ctxOpen ? ' open' : '')}>
            <div className="ctx-block">
              <div className="ctx-title">Voix de l'agent</div>
              <div>
                {VOICES.map((v) => (
                  <VoiceCard key={v.id} v={v} active={voice === v.id} onSelect={setVoice} onPreview={onPreview} />
                ))}
              </div>
            </div>

            <div className="ctx-block">
              <div className="ctx-title">Langue d'entrée</div>
              <div className="pills">
                {INPUT_LANGS.map((l) => (
                  <button key={l} className={'pill' + (inputLang === l ? ' active' : '')} onClick={() => setInputLang(l)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="ctx-block">
              <div className="ctx-title">Pour commencer</div>
              <div className="suggests">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="suggest" onClick={() => { send(s.q, s.lang); setCtxOpen(false); }}>
                    <span>{s.q}</span>
                    <span className="ar">→</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Mobile context toggle */}
      <div className={'ctx-backdrop' + (ctxOpen ? ' open' : '')} onClick={() => setCtxOpen(false)}></div>
      <button className="ctx-toggle" onClick={() => setCtxOpen((o) => !o)} aria-label="Options">
        <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="none"></path><rect x="3" y="5" width="18" height="2.4" rx="1.2"></rect><rect x="3" y="10.8" width="18" height="2.4" rx="1.2"></rect><rect x="3" y="16.6" width="18" height="2.4" rx="1.2"></rect></svg>
      </button>

      {/* ===== TÉMOIGNAGE ===== */}
      <section className="agent-temoin">
        <div className="agent-temoin__inner">
          <image-slot id="temoin-agent" shape="rounded" radius="14" fit="cover" src="assets/img/sage-baobab-2.png"
            placeholder="[ IMAGE_TEMOIN_AGENT ]"></image-slot>
          <div>
            <p className="q">« M sõsda ne DJOBI TOTO wa m sõsd ne yaab a yembre. » <span className="fr">— Je parle à DJOBI TOTO comme à un aîné.</span></p>
            <p className="by">Issa, 58 ans · Kongoussi</p>
          </div>
        </div>
      </section>

      {/* ===== VOICE MODE ===== */}
      <div className={'voicemode' + (vmOpen ? ' open' : '')}>
        <svg className="voicemode__pattern" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="100%" height="100%" fill="url(#strip-ivory)"></rect>
        </svg>
        <div className="vm-transcript">
          {vmText || (vmOpen ? '' : '')}
          {vmOpen ? <span className="cursor"></span> : null}
        </div>
        <VoiceBlob active={vmOpen} />
        <div className="vm-label">DJOBI TOTO écoute…</div>
        <button className="vm-stop" onClick={stopVoice}><span className="sq"></span> Arrêter</button>
      </div>

    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<AgentApp />);
