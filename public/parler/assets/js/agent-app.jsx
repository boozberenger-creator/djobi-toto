/* global React, ReactDOM */
const { useState, useRef, useEffect, useCallback } = React;

/* ----------------------------------------------------------------
   CONVERSION AUDIO : WebM → WAV 16kHz mono (pour notre modèle MMS)
---------------------------------------------------------------- */
function encodeWAV(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v   = new DataView(buf);
  const w   = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true);
  w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buf;
}

async function convertToWav16k(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  ctx.close();
  const samples = audioBuffer.getChannelData(0); // mono
  return new Blob([encodeWAV(samples, 16000)], { type: 'audio/wav' });
}

/* ----------------------------------------------------------------
   TTS MOORÉ : appel direct au Space HuggingFace (évite timeout Vercel)
---------------------------------------------------------------- */
const TTS_SPACE = 'https://hfdjobii-djobi-toto-tts.hf.space';

async function speakMoore(text, onend) {
  try {
    // Étape 1 : lancer la synthèse
    const postRes = await fetch(`${TTS_SPACE}/gradio_api/call/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [text] }),
    });
    const { event_id } = await postRes.json();

    // Étape 2 : récupérer l'audio (SSE)
    const getRes = await fetch(`${TTS_SPACE}/gradio_api/call/synthesize/${event_id}`);
    const raw = await getRes.text();
    const match = raw.match(/^data:\s*(\[.*\])/m);
    if (!match) { if (onend) onend(); return; }

    const b64 = JSON.parse(match[1])[0];
    if (!b64) { if (onend) onend(); return; }

    // Étape 3 : jouer l'audio WAV
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: 'audio/wav' });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); if (onend) onend(); };
    audio.onerror = () => { URL.revokeObjectURL(url); if (onend) onend(); };
    audio.play();
  } catch (e) {
    console.error('TTS mooré erreur:', e);
    if (onend) onend();
  }
}

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
   HISTORIQUE — localStorage
---------------------------------------------------------------- */
const STORAGE_KEY = 'djobi_convs';
function loadConvs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveConvs(convs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, 50))); } catch {}
}
function genConvId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}
function makeGreeting() {
  return { id: 1, who: 'bot', lang: 'Mooré', text: "Ne y windga ! Je suis DJOBI TOTO. Pose ta question — à l'oral ou à l'écrit, dans ta langue." };
}
function makeConv(overrides) {
  const now = Date.now();
  return { id: genConvId(), title: 'Nouvelle conversation', messages: [makeGreeting()], createdAt: now, lastAt: now, voice: 'aine', inputLang: 'Mooré', mode: 'gratuit', ...overrides };
}
function formatRelDate(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'j';
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ----------------------------------------------------------------
   APP
---------------------------------------------------------------- */
function AgentApp() {
  const [conversations, setConversations] = useState(() => {
    const saved = loadConvs();
    if (saved.length > 0) return saved;
    const first = makeConv();
    saveConvs([first]);
    return [first];
  });
  const [currentConvId, setCurrentConvId] = useState(() => {
    const saved = loadConvs();
    return saved.length > 0 ? saved[0].id : null;
  });
  const [messages, setMessages] = useState(() => {
    const saved = loadConvs();
    return saved.length > 0 ? saved[0].messages : [makeGreeting()];
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentConvIdRef = useRef(currentConvId);
  useEffect(() => { currentConvIdRef.current = currentConvId; }, [currentConvId]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [inputLang, setInputLang] = useState('Français');
  const [mode, setMode] = useState('gratuit'); // 'gratuit' | 'premium'
  const modeRef = useRef('gratuit');
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const [voice, setVoice] = useState('aine');
  const [vmOpen, setVmOpen] = useState(false);
  const [vmText, setVmText] = useState('');
  const [vmListening, setVmListening] = useState(false);
  const [vmStatus, setVmStatus] = useState(''); // 'listening' | 'processing' | 'error'
  const [ctxOpen, setCtxOpen] = useState(false);
  const [playingId, setPlayingId] = useState(null);

  const msgEnd = useRef(null);
  const idRef = useRef(2);
  const synth = window.speechSynthesis;

  // Refs pour le micro
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const inputLangRef = useRef(inputLang);
  useEffect(() => { inputLangRef.current = inputLang; }, [inputLang]);

  useEffect(() => {
    if (msgEnd.current) msgEnd.current.scrollIntoView({ block: 'end' });
  }, [messages, typing]);

  // Auto-save : déclenche quand les messages changent ET que la frappe est terminée
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.typing) return; // ne pas sauver pendant l'animation
    if (messages.length <= 1) return; // seulement le message d'accueil → pas de save
    const convId = currentConvIdRef.current;
    setConversations(prev => {
      const firstUser = messages.find(m => m.who === 'user');
      const updated = prev.map(c => c.id !== convId ? c : {
        ...c,
        messages,
        lastAt: Date.now(),
        title: (c.title === 'Nouvelle conversation' && firstUser)
          ? firstUser.text.slice(0, 48) + (firstUser.text.length > 48 ? '…' : '')
          : c.title,
      });
      saveConvs(updated);
      return updated;
    });
  }, [messages]);

  const speak = useCallback((text, lang, onend) => {
    if (!text) { if (onend) onend(); return; }
    // L'Aîné → notre TTS mooré
    if (voice === 'aine') {
      speakMoore(text, onend);
      return;
    }
    // Autres voix → browser TTS
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.9;
      if (onend) u.onend = onend;
      synth.speak(u);
    } catch (e) { if (onend) setTimeout(onend, 1800); }
  }, [synth, voice]);

  const replay = useCallback((m) => {
    setPlayingId(m.id);
    speak(m.text, m.lang, () => setPlayingId(null));
    setTimeout(() => setPlayingId((p) => (p === m.id ? null : p)), 4000);
  }, [speak]);

  // Historique pour le contexte Claude (max 10 messages)
  const historyRef = useRef([]);

  const botReply = useCallback(async (userText, userLang) => {
    setTyping(true);
    const id = idRef.current++;

    // Ajouter à l'historique avant l'appel
    historyRef.current.push({ role: 'user', text: userText });

    let full = '';
    let respLang = userLang || 'Français';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          lang: userLang,
          history: historyRef.current.slice(-8),
          mode: modeRef.current,
        }),
      });
      const data = await res.json();
      respLang = data.lang || respLang;
      if (data.event_id && data.space) {
        // Mode premium : SSE lu directement depuis le Space (pas de timeout Vercel)
        const sseRes = await fetch(`${data.space}/gradio_api/call/generate/${data.event_id}`);
        const raw = await sseRes.text();
        const match = raw.match(/^data:\s*(.+)$/m);
        if (match) {
          const parsed = JSON.parse(match[1]);
          full = (Array.isArray(parsed) ? parsed[0] : parsed)?.toString().trim() || '';
        }
        if (!full) full = "Je n'ai pas pu répondre. Réessaie dans un instant.";
      } else {
        full = data.text || "Je n'ai pas pu répondre. Réessaie dans un instant.";
      }
    } catch (e) {
      full = "Problème de connexion. Vérifie ta connexion internet et réessaie.";
    }

    // Ajouter la réponse à l'historique
    historyRef.current.push({ role: 'bot', text: full });
    if (historyRef.current.length > 20) historyRef.current = historyRef.current.slice(-20);

    setTyping(false);
    setMessages((prev) => [...prev, { id, who: 'bot', lang: respLang, text: '', typing: true }]);

    // Typewriter
    let i = 0;
    const tick = () => {
      i++;
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, text: full.slice(0, i) } : m));
      if (i < full.length) {
        setTimeout(tick, 14 + Math.random() * 18);
      } else {
        setMessages((prev) => prev.map((m) => m.id === id ? { ...m, typing: false } : m));
        // ── Parler automatiquement après chaque réponse ──
        setTimeout(() => speak(full, respLang), 200);
      }
    };
    tick();
  }, [speak]);

  const send = useCallback((text, lang) => {
    const t = (text || '').trim();
    if (!t) return;
    const id = idRef.current++;
    const usedLang = lang || inputLang;
    setMessages((prev) => [...prev, { id, who: 'user', lang: usedLang, text: t }]);
    setInput('');
    botReply(t, usedLang);
  }, [inputLang, botReply]);

  const onPreview = useCallback((v) => {
    setVoice(v.id);
    const sample = v.lang.startsWith('Français') ? "Bonjour, je suis votre voix DJOBI TOTO." : "Ne y windga, mam yaa DJOBI TOTO.";
    speak(sample, 'Français');
  }, [speak]);

  /* ---- VRAI MICRO ---- */
  const stopAllRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      const { mr, stream } = mediaRecorderRef.current;
      try { mr.stop(); } catch (e) {}
      stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }
  }, []);

  const startVoice = useCallback(() => {
    setVmOpen(true);
    setVmText('');
    setVmListening(true);
    setVmStatus('listening');
    audioChunksRef.current = [];

    // 1. MediaRecorder : capture audio brut pour le backend mooré
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mr.ondataavailable = e => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mr.start(200);
        mediaRecorderRef.current = { mr, stream };
      })
      .catch(err => {
        console.warn('Accès micro refusé :', err);
        setVmStatus('error');
      });

    // 2. SpeechRecognition : UNIQUEMENT pour le français
    // Pour mooré/dioula/fulfulde → on n'active PAS le browser SR (il produit du charabia)
    // L'audio sera envoyé au backend Groq Whisper qui détecte la langue tout seul
    const currentLang = inputLangRef.current;
    const useBrowserSR = currentLang === 'Français';

    if (useBrowserSR) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const r = new SR();
        r.lang = 'fr-FR';
        r.interimResults = true;
        r.continuous = true;
        r.onresult = e => {
          const t = Array.from(e.results).map(res => res[0].transcript).join('');
          setVmText(t);
        };
        r.onerror = () => {};
        try { r.start(); } catch (e) {}
        recognitionRef.current = r;
      }
    } else {
      // Afficher un indicateur visuel d'écoute pour les langues africaines
      setVmText('');
    }
  }, []);

  const stopVoice = useCallback(async () => {
    setVmListening(false);
    setVmStatus('processing');

    // Arrêter SpeechRecognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    // Arrêter MediaRecorder et récupérer le blob
    let blob = null;
    if (mediaRecorderRef.current) {
      const { mr, stream } = mediaRecorderRef.current;
      blob = await new Promise(resolve => {
        mr.onstop = () => {
          const b = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          resolve(b);
        };
        try { mr.stop(); } catch (e) { resolve(null); }
      });
      stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }

    const browserText = vmText.trim();
    setVmOpen(false);
    setVmStatus('');

    // Cas 1 : le navigateur a transcrit quelque chose (français)
    if (browserText) {
      setTimeout(() => send(browserText, inputLangRef.current), 350);
      return;
    }

    // Cas 2 : pas de transcript browser → envoyer l'audio à notre modèle ASR
    if (!blob || blob.size < 500) {
      const id = idRef.current++;
      setMessages(prev => [...prev, { id, who: 'bot', lang: 'Français', text: "Enregistrement trop court. Maintiens le bouton et parle.", typing: false }]);
      return;
    }

    setTyping(true);
    try {
      // Convertir WebM → WAV 16kHz mono avant envoi (notre MMS l'exige)
      let audioBlob = blob;
      try {
        audioBlob = await convertToWav16k(blob);
      } catch (convErr) {
        console.warn('Conversion WAV échouée, envoi WebM brut:', convErr);
        // Continuer avec le WebM original si la conversion échoue
      }

      const fd = new FormData();
      fd.append('audio', audioBlob, audioBlob.type === 'audio/wav' ? 'recording.wav' : 'recording.webm');
      fd.append('lang', inputLangRef.current);

      // Étape 1 : Vercel lance la transcription et retourne event_id
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.loading) {
        setTyping(false);
        const id = idRef.current++;
        setMessages(prev => [...prev, { id, who: 'bot', lang: 'Français', text: "Le modèle s'initialise (30-60 s la 1ère fois). Réessaie dans un instant.", typing: false }]);
        return;
      }

      // Étape 2 : si on a un event_id, on récupère le résultat directement depuis le Space
      // (évite le timeout Vercel de 10s — le Space prend 15-20s)
      let text = data.text || '';
      if (!text && data.event_id) {
        const getRes = await fetch(
          `${data.space}/gradio_api/call/transcribe/${data.event_id}`
        );
        const raw = await getRes.text();
        const match = raw.match(/^data:\s*(\[.*\])/m);
        if (match) text = (JSON.parse(match[1])[0] ?? '').trim();
      }

      setTyping(false);
      if (text) {
        setTimeout(() => send(text, inputLangRef.current), 100);
      } else {
        const id = idRef.current++;
        setMessages(prev => [...prev, { id, who: 'bot', lang: 'Français', text: "Je n'ai pas bien saisi. Parle un peu plus près du micro et réessaie.", typing: false }]);
      }
    } catch (e) {
      setTyping(false);
      console.error('Erreur transcription:', e);
      const id = idRef.current++;
      setMessages(prev => [...prev, { id, who: 'bot', lang: 'Français', text: "Erreur de transcription. Vérifie ta connexion et réessaie.", typing: false }]);
    }
  }, [vmText, send]);

  const newChat = useCallback(() => {
    const conv = makeConv({ voice, inputLang, mode });
    setConversations(prev => {
      const updated = [conv, ...prev];
      saveConvs(updated);
      return updated;
    });
    setCurrentConvId(conv.id);
    currentConvIdRef.current = conv.id;
    setMessages([makeGreeting()]);
    idRef.current = 2;
    historyRef.current = [];
  }, [voice, inputLang, mode]);

  const loadConv = useCallback((convId) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    setCurrentConvId(convId);
    currentConvIdRef.current = convId;
    setMessages(conv.messages);
    idRef.current = Math.max(0, ...conv.messages.map(m => m.id)) + 1;
    historyRef.current = conv.messages
      .filter(m => !m.typing)
      .map(m => ({ role: m.who === 'user' ? 'user' : 'bot', text: m.text }));
    if (conv.voice) setVoice(conv.voice);
    if (conv.inputLang) setInputLang(conv.inputLang);
    if (conv.mode) setMode(conv.mode);
  }, [conversations]);

  const deleteConv = useCallback((e, convId) => {
    e.stopPropagation();
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== convId);
      saveConvs(updated);
      if (convId === currentConvIdRef.current) {
        if (updated.length > 0) {
          setCurrentConvId(updated[0].id);
          currentConvIdRef.current = updated[0].id;
          setMessages(updated[0].messages);
          idRef.current = Math.max(0, ...updated[0].messages.map(m => m.id)) + 1;
          historyRef.current = [];
        } else {
          const fresh = makeConv();
          saveConvs([fresh]);
          setCurrentConvId(fresh.id);
          currentConvIdRef.current = fresh.id;
          setMessages([makeGreeting()]);
          idRef.current = 2;
          historyRef.current = [];
          return [fresh];
        }
      }
      return updated;
    });
  }, []);

  const activeVoice = VOICES.find((v) => v.id === voice);

  /* ---- labels du mode vocal ---- */
  const vmLabel = vmListening
    ? (vmText ? 'Je t\'écoute…' : 'En attente de ta voix…')
    : vmStatus === 'processing'
      ? 'Traitement en cours…'
      : 'DJOBI TOTO écoute…';

  return (
    <React.Fragment>
      {/* ===== SIDEBAR HISTORIQUE ===== */}
      <div className={'history-panel' + (sidebarOpen ? ' open' : '')}>
        <div className="hp-head">
          <button className="new-chat-btn" onClick={newChat}>
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Nouveau chat
          </button>
          <button className="hp-collapse" onClick={() => setSidebarOpen(false)} aria-label="Fermer">
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>
        <div className="hp-list">
          {conversations.map(conv => (
            <div key={conv.id}
              className={'hp-item' + (conv.id === currentConvId ? ' active' : '')}
              onClick={() => loadConv(conv.id)}>
              <div className="hp-item-body">
                <div className="hp-title">{conv.title}</div>
                <div className="hp-date">{formatRelDate(conv.lastAt)}</div>
              </div>
              <button className="hp-del" onClick={(e) => deleteConv(e, conv.id)} aria-label="Supprimer">
                <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ===== INTERFACE DESKTOP PRINCIPALE ===== */}
      <div className="chat-app">

        {/* ---- Panneau conversation (gauche / centre) ---- */}
        <div className="chat-panel">

          {/* En-tête du chat */}
          <div className="chat-header">
            <div className="ava">
              <img src={activeVoice && activeVoice.img ? activeVoice.img : 'assets/img/voix-cyborg.png'} alt="" />
            </div>
            <div>
              <div className="agent-name">DJOBI TOTO</div>
              <div className="agent-sub">En ligne · répond en quelques secondes</div>
            </div>
            <span className="voice-pill">Voix : {activeVoice ? activeVoice.name : '—'}</span>
            {!sidebarOpen && (
              <button className="hp-open-btn" onClick={() => setSidebarOpen(true)} aria-label="Historique">
                <svg viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              </button>
            )}
          </div>

          {/* Zone de messages */}
          <div className="messages">
            {messages.map((m) => (
              <Message key={m.id} m={m} playing={playingId === m.id} onReplay={replay} />
            ))}
            {typing ? (<div className="typing"><i></i><i></i><i></i></div>) : null}
            <div ref={msgEnd}></div>
          </div>

          {/* Composer */}
          <div className="composer">
            <div className="composer-row">
              <button className={'mic-btn' + (vmListening ? ' recording' : '')} onClick={startVoice} aria-label="Mode vocal">
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
              <button>
                <svg viewBox="0 0 24 24"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5"></path></svg>
                Pièce jointe
              </button>
              <button onClick={() => onPreview(activeVoice)}>
                <svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm6-3a6 6 0 0 1-12 0M12 18v3"></path></svg>
                Voix : {activeVoice ? activeVoice.name : '—'}
              </button>
              <button>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z"></path></svg>
                Paramètres
              </button>
            </div>
          </div>
        </div>

        {/* ---- Panneau paramètres (droite) ---- */}
        <aside className={'settings-panel' + (ctxOpen ? ' open' : '')}>

          <div className="panel-section">
            <div className="panel-title">Voix de l'agent</div>
            {VOICES.map((v) => (
              <VoiceCard key={v.id} v={v} active={voice === v.id} onSelect={setVoice} onPreview={onPreview} />
            ))}
          </div>

          <div className="panel-section">
            <div className="panel-title">Langue d'entrée</div>
            <div className="pills">
              {INPUT_LANGS.map((l) => (
                <button key={l} className={'pill' + (inputLang === l ? ' active' : '')} onClick={() => setInputLang(l)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-title">Modèle IA</div>
            <div className="pills">
              <button
                className={'pill' + (mode === 'gratuit' ? ' active' : '')}
                onClick={() => setMode('gratuit')}
                title="Claude Haiku — rapide, gratuit">
                Gratuit
              </button>
              <button
                className={'pill premium' + (mode === 'premium' ? ' active' : '')}
                onClick={() => setMode('premium')}
                title="Notre Mistral mooré fine-tuné — mooré authentique">
                Premium mooré
              </button>
            </div>
            <div className="model-hint">
              {mode === 'gratuit' ? 'Claude Haiku · réponse ~2s' : 'Mistral mooré fine-tuné · réponse ~4s'}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-title">Pour commencer</div>
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

      {/* Backdrop + bouton mobile */}
      <div className={'ctx-backdrop' + (ctxOpen ? ' open' : '')} onClick={() => setCtxOpen(false)}></div>
      <button className="ctx-toggle" onClick={() => setCtxOpen((o) => !o)} aria-label="Options">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="2.4" rx="1.2"></rect>
          <rect x="3" y="10.8" width="18" height="2.4" rx="1.2"></rect>
          <rect x="3" y="16.6" width="18" height="2.4" rx="1.2"></rect>
        </svg>
      </button>

      {/* ===== VOICE MODE — overlay plein écran ===== */}
      <div className={'voicemode' + (vmOpen ? ' open' : '')}>
        <svg className="voicemode__pattern" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="100%" height="100%" fill="url(#strip-ivory)"></rect>
        </svg>
        <div className="vm-transcript">
          {vmText || ''}
          {vmOpen ? <span className="cursor"></span> : null}
        </div>
        <VoiceBlob active={vmListening} />
        <div className="vm-label">{vmLabel}</div>
        <button className="vm-stop" onClick={stopVoice}>
          <span className="sq"></span>
          {vmListening ? 'Arrêter' : 'Traitement…'}
        </button>
      </div>

    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<AgentApp />);
