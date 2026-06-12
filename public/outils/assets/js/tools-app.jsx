/* global React, ReactDOM */
const { useState, useRef, useEffect, useCallback } = React;

const LANGS = ['Français', 'Mooré', 'Dioula', 'Fulfulde'];

const PHRASES = [
  { 'Français': "Bonjour, comment allez-vous ?",            'Mooré': "Ne y windga, y kibare ?",       'Dioula': "I ni ce, i ka kɛnɛ ?",          'Fulfulde': "Jam waali, no mbaɗaa ?" },
  { 'Français': "Où se trouve le centre de santé ?",        'Mooré': "Laafi yiri bee yɛɛnẽ ?",         'Dioula': "Dɔgɔtɔrɔso bɛ min ?",            'Fulfulde': "Hol to safrirde woni ?" },
  { 'Français': "Quand faut-il commencer les semis ?",      'Mooré': "Wakat bʋg la d na bʋde ?",       'Dioula': "Tuma jumɛn na danni daminɛ ?",   'Fulfulde': "Hombo aawa fuɗɗetee ?" },
  { 'Français': "Combien coûte ce sac de riz ?",            'Mooré': "Mui bʋʋrã ligdi yaa wãn ?",      'Dioula': "Malo bɔrɔ in songo ye joli ye ?", 'Fulfulde': "No foti ɓolol maaro ?" },
  { 'Français': "Merci beaucoup pour ton aide.",            'Mooré': "Barka wʋsgo ne f sõngre.",       'Dioula': "I ni ce kosɛbɛ i ka dɛmɛ la.",   'Fulfulde': "A jaaraama no feewi e ballal maa." },
  { 'Français': "Que la paix soit sur ta famille.",         'Mooré': "Laafi be yãmb zakã.",            'Dioula': "Hɛrɛ ka to i ka du la.",         'Fulfulde': "Jam wonu e galle maa." },
];

const TTS_VOICES = [
  { id: 'djobi', name: 'Djobi',    lang: 'Mooré · neutre',  img: 'assets/img/voix-cyborg.png', slot: 'tts-2' },
  { id: 'salim', name: 'Salimata', lang: 'Dioula',          img: '',                           slot: 'tts-3' },
  { id: 'aicha', name: 'Aïcha',    lang: 'Fulfulde',        img: '',                           slot: 'tts-4' },
  { id: 'noaga', name: 'Noaga',    lang: 'Français',        img: '',                           slot: 'tts-5', coming: true },
  { id: 'rama',  name: 'Ramata',   lang: 'Mooré · clair',   img: '',                           slot: 'tts-6', coming: true },
];

const TTS_API  = 'https://hfdjobii-djobi-tts-demo.hf.space';
const VOICE_MAP = { djobi: 'Djobi (Voix 1)', salim: 'Salimata (Voix 2)', aicha: 'Aicha (Voix 3)' };

const TRANSCRIPT_SAMPLE =
  "Bonjour, je voudrais savoir comment préparer la solution de réhydratation pour mon enfant qui a la diarrhée, et quand il faut aller au centre de santé.";

function speak(text, rate, pitch, onend) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = rate || 0.95; u.pitch = pitch == null ? 1 : pitch;
    if (onend) u.onend = onend;
    window.speechSynthesis.speak(u);
  } catch (e) { if (onend) setTimeout(onend, 1500); }
}

/* ============================================================
   TOOL 1 — Traduction
   ============================================================ */
function Translation() {
  const [srcLang, setSrcLang] = useState('Français');
  const [tgtLang, setTgtLang] = useState('Mooré');
  const [src, setSrc] = useState(PHRASES[0]['Français']);
  const [out, setOut] = useState('');
  const [typing, setTyping] = useState(false);
  const [note, setNote] = useState(false);
  const typeRef = useRef(0);

  const runType = useCallback((full) => {
    typeRef.current++;
    const tok = typeRef.current;
    setTyping(true); setOut('');
    let i = 0;
    const tick = () => {
      if (tok !== typeRef.current) return;
      i++; setOut(full.slice(0, i));
      if (i < full.length) setTimeout(tick, 28);
      else setTyping(false);
    };
    setTimeout(tick, 120);
  }, []);

  const translate = useCallback((text, sl, tl) => {
    const t = (text || '').trim().toLowerCase();
    const hit = PHRASES.find((p) => (p[sl] || '').trim().toLowerCase() === t);
    if (hit) { setNote(false); runType(hit[tl]); }
    else { setNote(true); setOut(''); typeRef.current++; setTyping(false); }
  }, [runType]);

  // translate on example/lang change (debounced for typing)
  useEffect(() => {
    const id = setTimeout(() => translate(src, srcLang, tgtLang), 500);
    return () => clearTimeout(id);
  }, [src, srcLang, tgtLang, translate]);

  const swap = () => {
    const ns = tgtLang, nt = srcLang;
    setSrcLang(ns); setTgtLang(nt);
    if (out) setSrc(out);
  };

  const exForLang = PHRASES.map((p) => p[srcLang]);

  return (
    <div className="tool-panel fadeslide">
      <div className="tr-grid">
        {/* source */}
        <div className="field-box">
          <div className="lang-select">
            <select value={srcLang} onChange={(e) => setSrcLang(e.target.value)}>
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <textarea className="tarea" value={src} maxLength={240}
            onChange={(e) => setSrc(e.target.value)} placeholder="Écris ou dicte ta phrase…"></textarea>
          <div className="row-actions">
            <button className="icon-btn" aria-label="Dicter"><svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm6-3a6 6 0 0 1-12 0M12 18v3"></path></svg></button>
            <button className="icon-btn" aria-label="Écouter" onClick={() => speak(src, 0.95, 1)}><svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"></path></svg></button>
            <button className="icon-btn" aria-label="Copier" onClick={() => navigator.clipboard && navigator.clipboard.writeText(src)}><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg></button>
            <span className="charcount">{src.length}/240</span>
          </div>
        </div>

        {/* swap */}
        <div className="tr-swap">
          <button className="swap-btn" onClick={swap} aria-label="Inverser les langues">
            <svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
          </button>
        </div>

        {/* target */}
        <div className="field-box">
          <div className="lang-select">
            <select value={tgtLang} onChange={(e) => setTgtLang(e.target.value)}>
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className={'tout' + (!out && !typing ? ' empty' : '')}>
            {out}{typing ? <span className="cursor"></span> : null}
            {!out && !typing ? (note ? "Choisis une phrase d'exemple ci-dessous pour la démo." : "La traduction apparaît ici.") : null}
          </div>
          <button className="listen-local" onClick={() => out && speak(out, 0.9, 1)}>
            <svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM16 9a4 4 0 0 1 0 6"></path></svg>
            Écouter avec une voix locale
          </button>
        </div>
      </div>

      <div className="examples">
        <div className="lbl">Phrases courantes</div>
        <div className="ex-chips">
          {exForLang.map((ph, i) => (
            <button key={i} className="ex-chip" onClick={() => setSrc(ph)}>{ph}</button>
          ))}
        </div>
      </div>
      <p className="demo-note">Démo — traductions indicatives, à valider par un locuteur natif.</p>
    </div>
  );
}

/* ============================================================
   TOOL 2 — Transcription
   ============================================================ */
function Transcription() {
  const [stage, setStage] = useState('idle'); // idle | processing | done
  const [revealed, setRevealed] = useState(0);
  const [fmt, setFmt] = useState('.txt');
  const [over, setOver] = useState(false);
  const words = TRANSCRIPT_SAMPLE.split(' ');
  const guard = useRef(0);

  const start = () => {
    guard.current++;
    const tok = guard.current;
    setStage('processing'); setRevealed(0);
    let i = 0;
    const tick = () => {
      if (tok !== guard.current) return;
      i++; setRevealed(i);
      if (i < words.length) setTimeout(tick, 140);
      else setStage('done');
    };
    setTimeout(tick, 700);
  };

  return (
    <div className="tool-panel fadeslide">
      {stage === 'idle' ? (
        <div className="drop-wrap">
          <div className={'dropzone' + (over ? ' over' : '')}
            onClick={start}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); start(); }}>
            <div className="dz-ic"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></svg></div>
            <div className="dz-main">Dépose un fichier audio ou appuie pour enregistrer</div>
            <div className="dz-sub">MP3 · WAV · M4A · OGG</div>
          </div>
          <div className="dz-or">— ou —</div>
          <button className="rec-btn" onClick={start}><span className="rdot"></span> Enregistrer maintenant</button>
        </div>
      ) : (
        <div className="transcript-result">
          <div className="tr-wave">
            {Array.from({ length: 48 }).map((_, i) => (
              <i key={i} className={(stage === 'processing' && i < (revealed / words.length) * 48) ? 'on' : ''}></i>
            ))}
          </div>
          <div className="transcript-text">
            {words.map((w, i) => {
              const cls = i < revealed - 1 ? 'done' : (i === revealed - 1 ? 'cur' : 'pending');
              return <span key={i} className={'w ' + cls}>{w} </span>;
            })}
          </div>
          <div className="dl-row">
            <span style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Format</span>
            <div className="format-pills">
              {['.txt', '.docx', '.pdf'].map((f) => (
                <button key={f} className={'fmt' + (fmt === f ? ' active' : '')} onClick={() => setFmt(f)}>{f}</button>
              ))}
            </div>
            <button className="dl-btn" disabled={stage !== 'done'} style={{ opacity: stage === 'done' ? 1 : 0.5 }}>
              <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"></path></svg>
              Télécharger {fmt}
            </button>
          </div>
        </div>
      )}
      <p className="demo-note">Démo — transcription simulée d'un échantillon audio.</p>
    </div>
  );
}

/* ============================================================
   TOOL 3 — Lecture à voix haute
   ============================================================ */
function ReadAloud() {
  const [voice, setVoice]     = useState('djobi');
  const [text, setText]       = useState("Yʋʋmd koom na n niẽ beoogo. Tũm-tũmd fãa segd n gũ a koodo. DJOBI TOTO na n karem-a-la ne a buud-goamã, tɩ ned fãa wʋm.");
  const [rate, setRate]       = useState(1.0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg]   = useState('');
  const audioRef = useRef(null);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
    setLoading(false);
  }, []);

  const playTTS = useCallback(async (textToPlay, voiceId) => {
    stopCurrent();
    setErrMsg('');
    const voiceName = VOICE_MAP[voiceId] || 'Djobi (Voix 1)';
    setLoading(true);
    try {
      const submitRes = await fetch(`${TTS_API}/gradio_api/call/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [textToPlay, voiceName] }),
      });
      if (!submitRes.ok) throw new Error(`Erreur serveur (${submitRes.status})`);
      const { event_id } = await submitRes.json();

      const streamRes = await fetch(`${TTS_API}/gradio_api/call/synthesize/${event_id}`);
      const reader    = streamRes.body.getReader();
      const decoder   = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const parsed = JSON.parse(line.slice(5));
            if (Array.isArray(parsed) && parsed[0]?.url) {
              const audio = new Audio(parsed[0].url);
              audioRef.current  = audio;
              audio.playbackRate = rate;
              setLoading(false);
              setPlaying(true);
              audio.onended = () => { setPlaying(false); audioRef.current = null; };
              audio.play();
              return;
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      setErrMsg('Synthèse échouée — réessaie dans quelques secondes.');
      console.error('[TTS]', e);
    } finally {
      setLoading(false);
    }
  }, [rate, stopCurrent]);

  const toggle = useCallback(() => {
    if (playing || loading) { stopCurrent(); return; }
    if (!text.trim()) return;
    playTTS(text.trim(), voice);
  }, [playing, loading, text, voice, playTTS, stopCurrent]);

  useEffect(() => () => stopCurrent(), [stopCurrent]);

  const busy = playing || loading;

  return (
    <div className="tool-panel fadeslide">
      <div className="tts-voices">
        {TTS_VOICES.map((v) => (
          <div key={v.id}
            className={'tts-voice' + (voice === v.id ? ' active' : '') + (v.coming ? ' coming' : '')}
            onClick={() => !v.coming && setVoice(v.id)}
            style={v.coming ? { opacity: 0.45, cursor: 'default', position: 'relative' } : {}}>
            {v.coming && (
              <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, fontWeight: 700, background: 'var(--accent, #8B3A0F)', color: '#fff', borderRadius: 4, padding: '2px 6px', zIndex: 2 }}>Bientôt</span>
            )}
            <image-slot id={v.slot} shape="rounded" radius="14" fit="cover" src={v.img || undefined}
              placeholder={'[ ' + v.slot.toUpperCase().replace('-', '_') + ' ]'}></image-slot>
            <div className="nm">{v.name}</div>
            <div className="lg">{v.lang}</div>
            <button className="pp" aria-label={'Prévisualiser ' + v.name}
              disabled={v.coming}
              onClick={(e) => { e.stopPropagation(); if (!v.coming) { setVoice(v.id); playTTS('Ne y windga.', v.id); } }}>
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
            </button>
          </div>
        ))}
      </div>

      <textarea className="tts-text" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Colle ou écris le texte à lire…"></textarea>

      {errMsg && <p style={{ color: '#c0392b', fontSize: 13, margin: '4px 0 0' }}>{errMsg}</p>}

      <div className="tts-controls">
        <div className="slider-block">
          <div className="sl-top"><span>Vitesse lecture</span><b>{rate.toFixed(2)}×</b></div>
          <input className="sl" type="range" min="0.5" max="1.6" step="0.05" value={rate}
            onChange={(e) => { setRate(parseFloat(e.target.value)); if (audioRef.current) audioRef.current.playbackRate = parseFloat(e.target.value); }} />
        </div>
      </div>

      <div className="tts-play-row">
        <button className="tts-play" onClick={toggle} aria-label={busy ? 'Arrêter' : 'Lire'}
          style={loading ? { opacity: 0.7 } : {}}>
          {playing
            ? <svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>
            : loading
              ? <svg viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}><path d="M12 2a10 10 0 0 1 10 10" fill="none" strokeWidth="2.5" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>}
        </button>
        <div className={'tts-bigwave' + (busy ? ' on' : '')}>
          {Array.from({ length: 18 }).map((_, i) => <i key={i}></i>)}
        </div>
      </div>
      <p className="demo-note">{loading ? 'Génération en cours (~2 s)…' : 'Synthèse vocale mooré — XTTS v2 fine-tuné par Djobi Toto.'}</p>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
function ToolsApp() {
  const [tab, setTab] = useState('trad');
  const TABS = [
    { id: 'trad', label: 'Traduction' },
    { id: 'trans', label: 'Transcription' },
    { id: 'tts', label: 'Lecture à voix haute' },
  ];
  return (
    <React.Fragment>
      <div className="tools-head">
        <p className="eyebrow">Au quotidien</p>
        <h1>Outils.</h1>
        <p>Trois manières d'utiliser DJOBI TOTO, dans ta langue.</p>
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'trad' ? <Translation key="trad" /> : null}
      {tab === 'trans' ? <Transcription key="trans" /> : null}
      {tab === 'tts' ? <ReadAloud key="tts" /> : null}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<ToolsApp />);
