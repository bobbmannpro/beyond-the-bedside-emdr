import { useState, useEffect, useRef } from "react";

// ─── Audio (module-level, no hooks) ──────────────────────────────
let _ctx = null;

function unlockAudio() {
  try {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    const silent = _ctx.createBuffer(1, 1, _ctx.sampleRate);
    const src = _ctx.createBufferSource();
    src.buffer = silent;
    src.connect(_ctx.destination);
    src.start(0);
    _ctx.resume();
  } catch (e) {}
}

function beep(side) {
  if (!_ctx) return;
  try {
    if (_ctx.state === "suspended") _ctx.resume();
    const osc  = _ctx.createOscillator();
    const gain = _ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = side === "left" ? 360 : 420;
    gain.gain.setValueAtTime(0.8, _ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(_ctx.destination);
    osc.start(_ctx.currentTime);
    osc.stop(_ctx.currentTime + 0.41);
  } catch (e) {}
}

// ─── Ambient Music ───────────────────────────────────────────────
let _ambient = null;

function startAmbient() {
  if (!_ctx || _ambient) return;
  const ctx = _ctx;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 4);
  master.connect(ctx.destination);

  const layers = [
    { freq: 174.0, type: "sine",     gain: 0.6 },
    { freq: 174.6, type: "sine",     gain: 0.4 },
    { freq: 261.6, type: "sine",     gain: 0.35 },
    { freq: 349.2, type: "sine",     gain: 0.25 },
    { freq:  87.0, type: "sine",     gain: 0.5  },
  ];

  const oscs = layers.map(({ freq, type, gain }) => {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(master);
    osc.start();
    return osc;
  });

  // Slow breath LFO on master gain (0.08 → 0.16 every ~8s)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.12;
  lfoGain.gain.value  = 0.04;
  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);
  lfo.start();

  _ambient = { oscs: [...oscs, lfo], master };
}

function stopAmbient() {
  if (!_ambient || !_ctx) return;
  const { oscs, master } = _ambient;
  master.gain.setValueAtTime(master.gain.value, _ctx.currentTime);
  master.gain.linearRampToValueAtTime(0, _ctx.currentTime + 3);
  setTimeout(() => {
    oscs.forEach(o => { try { o.stop(); } catch (e) {} });
    _ambient = null;
  }, 3200);
}

// ─── Protocols ───────────────────────────────────────────────────
const PROTOCOLS = [
  {
    id: "safe-place", category: "Stabilization", title: "Safe Place & Resourcing",
    duration: "18 min", description: "Build an internal anchor before processing begins. The recommended starting point — complete this before any trauma-processing session.",
    phases: [
      { name: "Arrival", duration: 60, bilateral: false, instruction: "Close your eyes or soften your gaze. Take three slow breaths — in through the nose, out through the mouth. Notice the weight of your body in the chair. You don't have to do anything right now except arrive here." },
      { name: "Safe Place", duration: 90, bilateral: false, instruction: "Let a place come to mind — real or imagined — where you feel completely safe and at ease. A room, a landscape, a memory. Don't force it. Let whatever comes, come. Begin to notice what you see there." },
      { name: "Sensory Detail", duration: 60, bilateral: false, instruction: "Stay in your safe place. What do you hear? What's the temperature? Is there a smell — grass, salt air, woodsmoke? Let the scene fill in around you. The more detail, the stronger the anchor." },
      { name: "Bilateral Anchoring", duration: 120, bilateral: true, sets: 6, speed: "slow", instruction: "Hold the image and the feeling it gives you. Notice where that feeling lives in your body — warmth, ease, steadiness. Let it grow as the bilateral stimulation begins. You're linking this feeling to safety." },
      { name: "Deepening", duration: 90, bilateral: true, sets: 4, speed: "slow", instruction: "Let the image become even more vivid. If your mind drifts, gently return. There's no right way. Notice what it feels like to be safe — just that." },
      { name: "Cue Word", duration: 60, bilateral: false, instruction: "Give your safe place a single word or short phrase. Something that captures it. Say it silently. Notice how your body responds. This word is yours now — you can return here anytime." },
      { name: "Close", duration: 60, bilateral: false, instruction: "Take a slow breath. Let the image fade gently. Notice how your body feels now compared to when you started. Rest here a moment before you return." },
    ]
  },
  {
    id: "post-shift", category: "Acute Trauma", title: "Post-Shift Processing",
    duration: "24 min", description: "For use within hours of a difficult shift. Helps the nervous system begin releasing acute stress before it consolidates.",
    phases: [
      { name: "Arrival", duration: 60, bilateral: false, instruction: "You made it through. Whatever the shift brought, you're here now — outside it. Take a breath. Before anything else, just acknowledge that you're carrying something. You don't have to name it yet." },
      { name: "Body Check", duration: 90, bilateral: false, instruction: "Scan slowly from head to feet. Where is the shift still living in your body? Jaw? Chest? Shoulders? Gut? Just notice without trying to change anything. Your body has been holding the day. This is the beginning of putting it down." },
      { name: "Identify the Moment", duration: 60, bilateral: false, instruction: "Let one image, moment, or feeling from today come forward — whichever is most present. You don't have to speak it or analyze it. Just hold it lightly at the edges. What number between 0 and 10 captures how disturbing it feels right now?" },
      { name: "Processing — Round 1", duration: 150, bilateral: true, sets: 8, speed: "medium", instruction: "Hold the edges of that moment — just enough to keep it in awareness. As the stimulation begins, notice what comes up: thoughts, images, sensations, or nothing at all. All of it is fine. Just notice and let it move." },
      { name: "Check In", duration: 60, bilateral: false, instruction: "What's present now? Has anything shifted — even slightly? What number would you give the disturbance now? You don't have to be done. Just notice where you are." },
      { name: "Processing — Round 2", duration: 120, bilateral: true, sets: 6, speed: "medium", instruction: "Hold whatever remains and continue. You're helping your nervous system complete what it started today. Let whatever comes, come." },
      { name: "Containment", duration: 90, bilateral: false, instruction: "Imagine a container — strong, sealed, yours. Place whatever remains inside it. You're not dismissing it. You're choosing when to return to it. The container holds it until you're ready." },
      { name: "Ground & Close", duration: 60, bilateral: false, instruction: "Feel your feet on the floor. Look slowly around the room. Take a breath. You've done something important — you chose not to carry this alone into the rest of your night." },
    ]
  },
  {
    id: "moral-injury", category: "Cumulative", title: "Moral Injury & Chronic Load",
    duration: "35 min", description: "For what accumulates over years — the gap between the care you wanted to give and what the system allowed. Ethical exhaustion. Helplessness. The weight of what couldn't be changed.",
    phases: [
      { name: "Ground", duration: 90, bilateral: false, instruction: "Place both feet flat on the floor. Take three slow breaths. This session is for the weight that doesn't come from one shift — it comes from many. From years. You don't have to carry it in this room." },
      { name: "Name the Load", duration: 90, bilateral: false, instruction: "Let yourself recognize, without judgment, how much you've been holding. The decisions made under impossible constraints. The care you wanted to give that the system didn't allow. The moments you had to choose between bad and worse. You didn't fail. You were placed in situations designed to produce exactly this weight." },
      { name: "Body Location", duration: 60, bilateral: false, instruction: "Where does this live in your body? The chest — that tight, heavy feeling? The shoulders you can't fully drop? Place a hand there if it feels right. Your body has been storing something that was never meant to live there permanently." },
      { name: "Processing — Round 1", duration: 180, bilateral: true, sets: 10, speed: "medium", instruction: "Hold the general sense of the burden — not any single moment, just the accumulated weight of it. As the stimulation begins, let whatever surfaces come without editing. Anger, grief, numbness, nothing — all of it is information." },
      { name: "Processing — Round 2", duration: 150, bilateral: true, sets: 8, speed: "slow", instruction: "Notice where you are. Hold what's present and continue. You're not trying to resolve anything today. You're beginning to loosen what's been held too tight, for too long." },
      { name: "Adaptive Belief", duration: 90, bilateral: true, sets: 4, speed: "slow", instruction: "What would it mean to truly believe: 'I did what I could with what I had, in a system that asked too much.' Let that sit. Not to excuse anything — to release you from carrying what was never entirely yours. Notice your body's response, even if it's partial." },
      { name: "Integration", duration: 90, bilateral: false, instruction: "Whatever shifted today — even a fraction — is real and it matters. This isn't resolved in one session. But you showed up for yourself, which is more than the system ever asked you to do for yourself. Breathe. Ground. Come back when you're ready." },
    ]
  },
  {
    id: "grief", category: "Grief", title: "Patient Loss & Grief",
    duration: "28 min", description: "For the grief that healthcare culture often has no space for. You were allowed to care. You are allowed to grieve.",
    phases: [
      { name: "Permission", duration: 90, bilateral: false, instruction: "Before anything else: you are allowed to feel this. Whatever you're carrying about this loss — it doesn't make you unprofessional or weak. It means you were present with another human being. That is not a liability. Take a breath and let that be true." },
      { name: "Remember Them", duration: 90, bilateral: false, instruction: "Let an image of this person come gently to mind — not the end, but who they were. A moment with them. Something they said, or the way they looked at you, or simply their presence. What do you want to hold about them?" },
      { name: "Feel It", duration: 60, bilateral: false, instruction: "Where is the grief in your body right now? Let yourself feel it without managing it. You've been managing it. For this session, you don't have to. This is your time." },
      { name: "Processing", duration: 150, bilateral: true, sets: 8, speed: "slow", instruction: "Hold the grief — the love that's in it, the loss that's in it — and let the bilateral stimulation begin. Follow wherever it takes you. Cry if you need to. Breathe when you can. There's nothing to do but feel it." },
      { name: "What You Carry Forward", duration: 120, bilateral: true, sets: 5, speed: "slow", instruction: "Grief doesn't end — it transforms. What do you want to carry forward from knowing this person? What did they leave in you? Let that come into focus as the stimulation continues." },
      { name: "Closing", duration: 90, bilateral: false, instruction: "Take a moment to say whatever needs to be said — silently or aloud. You don't need to be finished grieving. You just need to know you can set it down for now, and that it will be here when you return." },
    ]
  },
  {
    id: "burnout", category: "Cumulative", title: "Burnout & Compassion Fatigue",
    duration: "30 min", description: "For when caring itself has become exhausting. When you feel distant from patients, numb to suffering, or like you have nothing left to give.",
    phases: [
      { name: "Ground", duration: 60, bilateral: false, instruction: "Sit quietly. Take three breaths. You don't have to be okay right now. You don't have to perform recovery. This session is for what happens when giving everything, for too long, starts to cost you yourself." },
      { name: "Acknowledge the Depletion", duration: 90, bilateral: false, instruction: "Compassion fatigue is not a character flaw. It is a physiological response to sustained empathic engagement without adequate recovery. Your nervous system is doing exactly what a nervous system does when it runs out of resources. What you're feeling is real, and it makes sense." },
      { name: "What's Been Lost", duration: 90, bilateral: false, instruction: "What did you used to feel that you don't anymore? Curiosity? Connection? The satisfaction of helping? Let yourself acknowledge what's missing — not with shame, but as information. You can't refill something you won't look at." },
      { name: "Processing — Round 1", duration: 150, bilateral: true, sets: 8, speed: "medium", instruction: "Hold the sense of depletion — the flatness, the distance, the going-through-the-motions feeling. As the stimulation begins, let whatever comes surface. There's no wrong response." },
      { name: "Processing — Round 2", duration: 120, bilateral: true, sets: 6, speed: "slow", instruction: "Stay with what's present. You're not trying to manufacture feeling. You're creating the conditions for it to return on its own terms, in its own time." },
      { name: "Toward Restoration", duration: 90, bilateral: true, sets: 4, speed: "slow", instruction: "What is one small thing that has ever restored you — even briefly? A walk, a conversation, silence, food, sleep, something you used to love. Let that come to mind. Notice if there's any flicker of something in your body — even faint." },
      { name: "Close", duration: 60, bilateral: false, instruction: "Recovery from burnout is not a single act. It's a long, often nonlinear process. But it starts with moments like this one — choosing to turn toward yourself with the same care you've given to others. Breathe. You're allowed to matter too." },
    ]
  },
];

const SPEEDS = { slow: 2200, medium: 1600, fast: 1100 };

// ─── BilateralDot ────────────────────────────────────────────────
function BilateralDot({ active, speed = "medium", sets = 6, onComplete, audioEnabled }) {
  const [pos, setPos]   = useState(0);
  const [rep, setRep]   = useState(0);
  const timerRef        = useRef(null);
  const stateRef        = useRef({ pos: 0, rep: 0 });
  const totalReps       = sets * 2;

  useEffect(() => {
    stateRef.current = { pos: 0, rep: 0 };
    if (!active) { setPos(0); setRep(0); return; }
    timerRef.current = setInterval(() => {
      const nextPos = stateRef.current.pos === 0 ? 1 : 0;
      const nextRep = stateRef.current.rep + 1;
      stateRef.current = { pos: nextPos, rep: nextRep };
      setPos(nextPos);
      setRep(nextRep);
      if (audioEnabled) beep(nextPos === 0 ? "left" : "right");
      if (nextRep >= totalReps) { clearInterval(timerRef.current); onComplete?.(); }
    }, SPEEDS[speed]);
    return () => clearInterval(timerRef.current);
  }, [active, speed, totalReps, audioEnabled]);

  const pct = Math.min(100, Math.round((rep / totalReps) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, height: 72, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 24, right: 24, height: 1, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #a8c4ae, #7C9885)", boxShadow: "0 0 18px rgba(124,152,133,0.6)", left: pos === 0 ? 20 : "calc(100% - 42px)", transition: `left ${SPEEDS[speed] * 0.85}ms cubic-bezier(0.45, 0, 0.55, 1)`, top: "50%", transform: "translateY(-50%)" }} />
      </div>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#7C9885", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em" }}>
          <span>SET {Math.ceil(rep / 2)} / {sets}</span><span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── PhaseTimer ──────────────────────────────────────────────────
function PhaseTimer({ duration, active, onComplete }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);
  useEffect(() => { setElapsed(0); }, [duration]);
  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= duration) { clearInterval(ref.current); onComplete?.(); return duration; }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [active, duration]);
  const remaining = duration - elapsed;
  const m = Math.floor(remaining / 60), s = remaining % 60;
  const pct = Math.min(100, Math.round((elapsed / duration) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width={48} height={48} viewBox="0 0 48 48">
        <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
        <circle cx={24} cy={24} r={20} fill="none" stroke="#7C9885" strokeWidth={2}
          strokeDasharray={`${2 * Math.PI * 20}`}
          strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`}
          strokeLinecap="round" transform="rotate(-90 24 24)"
          style={{ transition: "stroke-dashoffset 1s linear" }} />
        <text x={24} y={28} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={11} fontFamily="monospace">
          {m}:{String(s).padStart(2, "0")}
        </text>
      </svg>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em" }}>
        {pct < 100 ? `${pct}% complete` : "phase complete"}
      </div>
    </div>
  );
}

// ─── ProtocolCard ────────────────────────────────────────────────
function ProtocolCard({ p, onStart }) {
  const categoryColors = { Stabilization: "#7C9885", "Acute Trauma": "#b87d6e", Cumulative: "#8a7eb8", Grief: "#7a9db8" };
  const color = categoryColors[p.category] || "#7C9885";
  const [hover, setHover] = useState(false);
  return (
    <div onClick={() => onStart(p)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${hover ? "rgba(124,152,133,0.3)" : "rgba(255,255,255,0.08)"}`, padding: "32px 28px", cursor: "pointer", borderRadius: 4, transition: "all 0.25s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.22em", color }}>{p.category}</span>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em" }}>{p.duration}</span>
      </div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontStyle: "italic", fontWeight: 300, marginBottom: 12, lineHeight: 1.2 }}>{p.title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{p.description}</div>
      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 10, color, letterSpacing: "0.18em" }}>
        <span>BEGIN SESSION</span><span>→</span>
      </div>
    </div>
  );
}

// ─── SessionPlayer ───────────────────────────────────────────────
function SessionPlayer({ protocol, onBack }) {
  const [phaseIdx, setPhaseIdx]       = useState(0);
  const [running, setRunning]         = useState(false);
  const [bilateralDone, setBilateral] = useState(false);
  const [timerDone, setTimerDone]     = useState(false);
  const [completed, setCompleted]     = useState(false);
  const [audioEnabled, setAudio]      = useState(true);
  const [voiceEnabled, setVoice]      = useState(true);
  const voiceEnabledRef               = useRef(true);
  const ttsVoiceRef                   = useRef(null);

  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = [
        "Samantha", "Karen", "Moira", "Tessa", "Victoria",
        "Google US English", "Microsoft Zira", "Microsoft Jenny",
        "Alice", "Fiona", "Serena",
      ];
      for (const name of preferred) {
        const match = voices.find(v => v.name.includes(name));
        if (match) { ttsVoiceRef.current = match; return; }
      }
      // Fall back to any English voice that isn't obviously male
      const maleNames = /David|James|Mark|Alex|Daniel|Fred|Ralph|Bruce|Tom|Aaron/i;
      ttsVoiceRef.current =
        voices.find(v => v.lang.startsWith("en") && !maleNames.test(v.name)) ||
        voices.find(v => v.lang.startsWith("en")) ||
        null;
    };
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const speak = (text) => {
    if (!voiceEnabledRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (ttsVoiceRef.current) u.voice = ttsVoiceRef.current;
    u.rate   = 0.82;
    u.pitch  = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  useEffect(() => () => { stopSpeaking(); stopAmbient(); }, []);

  const phase  = protocol.phases[phaseIdx];
  const isLast = phaseIdx === protocol.phases.length - 1;

  const advance = () => {
    stopSpeaking();
    if (isLast) { setCompleted(true); setRunning(false); return; }
    setPhaseIdx(i => i + 1);
    setRunning(false); setBilateral(false); setTimerDone(false);
  };

  useEffect(() => {
    if (!running) return;
    if (phase.bilateral && bilateralDone && timerDone) advance();
    if (!phase.bilateral && timerDone) advance();
  }, [bilateralDone, timerDone, running]);

  const canAdvance = phase.bilateral ? (bilateralDone && timerDone) : timerDone;
  const btn = { fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", cursor: "pointer", borderRadius: 3, padding: "18px 0" };

  if (completed) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 32, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(124,152,133,0.15)", border: "1px solid rgba(124,152,133,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✓</div>
      <div>
        <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 28, fontWeight: 300, marginBottom: 16 }}>Session Complete</div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, maxWidth: 400, lineHeight: 1.75 }}>Take your time returning. Sit quietly for a few minutes before moving on.</div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontStyle: "italic", fontFamily: "Georgia, serif", marginTop: 16 }}>"You showed up for yourself today."</div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => { setPhaseIdx(0); setRunning(false); setBilateral(false); setTimerDone(false); setCompleted(false); }}
          style={{ ...btn, color: "#7C9885", background: "rgba(124,152,133,0.1)", border: "1px solid rgba(124,152,133,0.3)", padding: "12px 24px" }}>Repeat Session</button>
        <button onClick={onBack}
          style={{ ...btn, color: "rgba(255,255,255,0.4)", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 24px" }}>Back to Library</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
        <button onClick={onBack} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
        <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>{protocol.title}</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => setVoice(v => !v)} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: voiceEnabled ? "#7C9885" : "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer" }}>
            {voiceEnabled ? "voice on" : "voice off"}
          </button>
          <button onClick={() => setAudio(a => !a)} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: audioEnabled ? "#7C9885" : "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer" }}>
            {audioEnabled ? "tones on" : "tones off"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 40 }}>
        {protocol.phases.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < phaseIdx ? "#7C9885" : i === phaseIdx ? "rgba(124,152,133,0.5)" : "rgba(255,255,255,0.08)", transition: "background 0.4s" }} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "baseline" }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.22em", color: "#7C9885" }}>Phase {phaseIdx + 1} of {protocol.phases.length}</span>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em" }}>{phase.name.toUpperCase()}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "40px 36px", borderRadius: 4, marginBottom: 40, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 300, fontSize: "clamp(17px, 2vw, 21px)", lineHeight: 1.65, color: "rgba(244,239,231,0.92)" }}>
        {phase.instruction}
      </div>

      {phase.bilateral && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Bilateral Stimulation — headphones recommended</div>
          <BilateralDot
            active={running}
            speed={phase.speed}
            sets={phase.sets}
            audioEnabled={audioEnabled}
            onComplete={() => setBilateral(true)}
          />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
        <PhaseTimer duration={phase.duration} active={running} onComplete={() => setTimerDone(true)} />
        {running && !canAdvance && <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>in progress</div>}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {!running ? (
          <button onClick={() => { unlockAudio(); startAmbient(); beep("left"); speak(phase.instruction); setRunning(true); setBilateral(false); setTimerDone(false); }}
            style={{ ...btn, flex: 1, background: "rgba(124,152,133,0.15)", border: "1px solid rgba(124,152,133,0.4)", color: "#7C9885" }}>
            {phaseIdx === 0 ? "Begin Session" : "Begin Phase"}
          </button>
        ) : (
          <button onClick={() => { stopSpeaking(); stopAmbient(); setRunning(false); setBilateral(false); setTimerDone(false); }}
            style={{ ...btn, flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
            Pause
          </button>
        )}
        {(canAdvance || !running) && (
          <button onClick={advance}
            style={{ ...btn, padding: "18px 28px", background: isLast ? "rgba(124,152,133,0.2)" : "transparent", border: "1px solid rgba(124,152,133,0.3)", color: "#7C9885" }}>
            {isLast ? "Complete" : "Next →"}
          </button>
        )}
      </div>

      <div style={{ marginTop: 40, padding: "16px 20px", borderLeft: "2px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)", fontSize: 12, lineHeight: 1.65 }}>
        If you feel overwhelmed at any point, pause and return to the grounding instruction from Phase 1. You are in control of this session.
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function EMDRApp() {
  const [view, setView]               = useState("home");
  const [activeProtocol, setProtocol] = useState(null);

  const startSession = (p) => { setProtocol(p); setView("session"); };

  const navBtn = (v, label) => (
    <button key={v} onClick={() => { setView(v); setProtocol(null); }}
      style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", padding: "8px 14px", borderRadius: 3, cursor: "pointer", border: "1px solid", transition: "all 0.2s", borderColor: view === v ? "rgba(124,152,133,0.4)" : "transparent", background: view === v ? "rgba(124,152,133,0.1)" : "transparent", color: view === v ? "#7C9885" : "rgba(255,255,255,0.35)" }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050608", color: "#F4EFE7", fontFamily: "Inter, system-ui, sans-serif", fontWeight: 300 }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(5,6,8,0.92)", position: "sticky", top: 0, zIndex: 50, flexWrap: "wrap", gap: 12 }}>
        <div onClick={() => { setView("home"); setProtocol(null); }} style={{ fontFamily: "Georgia, serif", fontSize: 15, cursor: "pointer" }}>
          Beyond <span style={{ color: "#7C9885" }}>·</span> The Bedside
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", marginLeft: 12, textTransform: "uppercase" }}>EMDR</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {navBtn("home", "Home")}
          {navBtn("library", "Sessions")}
          {navBtn("live", "Live Therapy")}
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 100px" }}>

        {view === "home" && (
          <div>
            <div style={{ paddingBottom: 56, borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 64 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.28em", color: "#7C9885", marginBottom: 24 }}>Evidence-Based Trauma Processing</div>
              <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 300, fontSize: "clamp(40px, 6vw, 80px)", lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: 28 }}>EMDR<br /><em style={{ color: "#7C9885" }}>Therapy</em></h1>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 16, maxWidth: "52ch", lineHeight: 1.75 }}>Eye Movement Desensitization and Reprocessing is a clinically validated therapy for trauma, moral injury, and occupational stress — rebuilt here for healthcare workers.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 64 }}>
              {[
                { icon: "◎", title: "Bilateral Stimulation", desc: "On-screen dot tracking with alternating tones. Use headphones for the full left/right bilateral effect." },
                { icon: "◌", title: "Phased Protocols", desc: "Each session follows the EMDR model — stabilization through integration — at your own pace." },
                { icon: "⟳", title: "Clinician-Specific", desc: "Sessions designed around what healthcare workers actually carry — not generic stress content." },
                { icon: "◈", title: "Live + Self-Guided", desc: "On-demand guided sessions or scheduled sessions with an EMDR-certified therapist." },
              ].map((f, i) => (
                <div key={i} style={{ background: "#050608", padding: "36px 28px" }}>
                  <div style={{ fontSize: 20, color: "#7C9885", marginBottom: 16 }}>{f.icon}</div>
                  <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18, marginBottom: 10 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>{f.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => setView("library")} style={{ padding: "16px 32px", fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", background: "rgba(124,152,133,0.15)", border: "1px solid rgba(124,152,133,0.4)", color: "#7C9885", cursor: "pointer", borderRadius: 3 }}>Browse Sessions →</button>
              <button onClick={() => setView("live")} style={{ padding: "16px 32px", fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", cursor: "pointer", borderRadius: 3 }}>Book Live Therapy</button>
              <button onClick={() => { unlockAudio(); beep("left"); setTimeout(() => beep("right"), 400); }}
                style={{ padding: "16px 32px", fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", cursor: "pointer", borderRadius: 3 }}>
                Test Audio
              </button>
            </div>
          </div>
        )}

        {view === "library" && !activeProtocol && (
          <div>
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.28em", color: "#7C9885", marginBottom: 20 }}>Self-Guided</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontWeight: 300, fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-0.02em", marginBottom: 16 }}>Session Library</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, maxWidth: "56ch", lineHeight: 1.7 }}>If you're new to EMDR, begin with <em>Safe Place & Resourcing</em>. Complete it at least once before using trauma-processing protocols.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {PROTOCOLS.map(p => <ProtocolCard key={p.id} p={p} onStart={startSession} />)}
            </div>
          </div>
        )}

        {view === "session" && activeProtocol && (
          <SessionPlayer protocol={activeProtocol} onBack={() => { setView("library"); setProtocol(null); }} />
        )}

        {view === "live" && (
          <div>
            <div style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.28em", color: "#7C9885", marginBottom: 20 }}>Zoom Sessions</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontWeight: 300, fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-0.02em", marginBottom: 16 }}>Live EMDR with a Certified Therapist</h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, maxWidth: "52ch", lineHeight: 1.75 }}>50-minute sessions with EMDR-certified therapists matched to your clinical specialty. HIPAA-compliant. No prior therapy required.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 56 }}>
              {[
                { name: "Dr. Mara Chen", spec: "ICU / Critical Care", avail: "Mon · Wed · Fri", sessions: "420+", note: "Specializes in cumulative trauma and moral injury in critical care nurses and physicians." },
                { name: "James Okafor, LCSW", spec: "Emergency Medicine", avail: "Tue · Thu · Sat", sessions: "310+", note: "Former paramedic. Fluent in acute stress patterns of ER and prehospital providers." },
                { name: "Dr. Priya Nair", spec: "Oncology · Hospice", avail: "Mon · Tue · Thu", sessions: "560+", note: "Focused on grief, disenfranchised loss, and the weight of end-of-life care." },
                { name: "Sofia Reyes, LPC", spec: "Residents & New Grads", avail: "Wed · Fri · Sat", sessions: "290+", note: "Specialized in imposter syndrome, shame reprocessing, and medical education stress." },
              ].map((t, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "32px 26px", borderRadius: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(124,152,133,0.15)", border: "1px solid rgba(124,152,133,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontSize: 16, color: "#7C9885" }}>{t.name[0]}{t.name.split(" ").pop()[0]}</div>
                    <div>
                      <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 16 }}>{t.name}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#7C9885", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2 }}>{t.spec}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, marginBottom: 20 }}>{t.note}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 20 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t.avail}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t.sessions} sessions</span>
                  </div>
                  <button style={{ width: "100%", padding: "12px 0", fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", background: "rgba(124,152,133,0.08)", border: "1px solid rgba(124,152,133,0.25)", color: "#7C9885", cursor: "pointer", borderRadius: 3 }}>Request Session</button>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "40px 36px", borderRadius: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, textAlign: "center" }}>
                {[{ label: "Single Session", price: "$120", note: "Pay per session" }, { label: "4-Session Bundle", price: "$95", note: "Per session · Save 21%" }, { label: "Enterprise Credits", price: "Custom", note: "Pre-purchased for staff" }].map((p, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>{p.label}</div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 300, letterSpacing: "-0.02em" }}>{p.price}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>{p.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
