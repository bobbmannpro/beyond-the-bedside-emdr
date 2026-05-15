import { useState, useEffect, useRef, useCallback } from "react";

function useTone(enabled) {
  const ctxRef = useRef(null);

  const unlock = useCallback(() => {
    if (ctxRef.current) { ctxRef.current.resume(); return; }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Silent buffer trick — required to unlock audio on iOS Safari
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    ctx.resume();
    ctxRef.current = ctx;
  }, []);

  const play = useCallback((side) => {
    if (!enabled || !ctxRef.current) return;
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") { ctx.resume(); return; }
    try {
      const osc   = ctx.createOscillator();
      const gain  = ctx.createGain();
      const pan   = ctx.createStereoPanner();
      osc.type = "sine";
      osc.frequency.value = side === "left" ? 396 : 417;
      pan.pan.value = side === "left" ? -0.8 : 0.8;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.03);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(pan);
      pan.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } catch(e) {}
  }, [enabled]);

  return { play, unlock };
}

const PROTOCOLS = [
  {
    id: "safe-place", category: "Stabilization", title: "Safe Place & Resourcing",
    duration: "18 min", description: "Build an internal anchor before processing begins. Recommended starting point for all users.",
    phases: [
      { name: "Grounding", duration: 60, instruction: "Close your eyes or soften your gaze downward. Take three slow breaths. Notice where your body meets the chair — the weight, the pressure, the contact. You don't have to do anything right now except arrive here.", bilateral: false },
      { name: "Safe Place Visualization", duration: 90, instruction: "Bring to mind a place — real or imagined — where you feel completely safe. It might be a room, a landscape, a memory. Let the image form without forcing it. Notice what you see, what you hear, what the air feels like.", bilateral: false },
      { name: "Bilateral Anchoring", duration: 120, instruction: "Hold that safe place in mind. Notice the feeling it brings in your body. Let that sensation strengthen as the bilateral stimulation begins. You're simply associating this feeling with safety.", bilateral: true, sets: 6, speed: "slow" },
      { name: "Deepening", duration: 90, instruction: "Let the image become more vivid. Add detail — color, texture, temperature. If your mind drifts, gently return. There's no right way to do this. Just notice.", bilateral: true, sets: 4, speed: "slow" },
      { name: "Resource Installation", duration: 60, instruction: "Give this place a word or phrase — a cue you can return to anytime. Say it silently now. Feel the connection between the word and the safety it holds.", bilateral: false },
      { name: "Integration", duration: 60, instruction: "Take a slow breath. Let the image fade gently. Notice how your body feels now compared to when you started. Rest here for a moment before returning.", bilateral: false },
    ]
  },
  {
    id: "post-shift", category: "Acute Trauma", title: "Post-Shift Processing",
    duration: "25 min", description: "For use within hours of a difficult shift. Helps the nervous system begin releasing acute distress.",
    phases: [
      { name: "Arrival & Check-In", duration: 60, instruction: "You made it through. Whatever happened today, you're here now. Take a breath. Before we begin, just notice what you're carrying — not to analyze it, just to acknowledge it's there.", bilateral: false },
      { name: "Body Scan", duration: 90, instruction: "Scan slowly from the top of your head down. Where is the tension? Where does your body feel the day most? Just notice. You don't have to fix anything yet.", bilateral: false },
      { name: "Identify the Target", duration: 60, instruction: "Let one image, moment, or feeling from today come forward — the one that's most present. You don't have to name it out loud. Just hold it lightly in awareness.", bilateral: false },
      { name: "Bilateral Processing", duration: 150, instruction: "Hold that moment in mind — just the edges of it, whatever feels manageable. Notice what comes up as the stimulation begins. Thoughts, sensations, emotions, nothing at all — all of it is fine. Just notice and let it move.", bilateral: true, sets: 8, speed: "medium" },
      { name: "Check & Continue", duration: 120, instruction: "What's present now? Has anything shifted — even slightly? Hold whatever is there and continue. You're helping your nervous system complete what it started.", bilateral: true, sets: 6, speed: "medium" },
      { name: "Containment", duration: 90, instruction: "Imagine placing whatever remains into a container. It can look like anything. The container is strong and secure. What's inside stays inside until you choose to return to it.", bilateral: false },
      { name: "Close & Ground", duration: 60, instruction: "Return to your breath. Feel your feet on the floor. Look around the room slowly. You've done something important for yourself today.", bilateral: false },
    ]
  },
  {
    id: "moral-injury", category: "Cumulative", title: "Moral Injury & Chronic Load",
    duration: "35 min", description: "For the weight that accumulates over months and years — systemic conflict, helplessness, ethical exhaustion.",
    phases: [
      { name: "Grounding", duration: 90, instruction: "This session is for what accumulates — not any single day, but the weight of many. Place both feet flat on the floor. Take three breaths. You don't have to carry anything in this room.", bilateral: false },
      { name: "Acknowledging the Load", duration: 90, instruction: "Let yourself recognize, without judgment, how much you've been holding. The decisions made under impossible constraints. The gap between the care you wanted to give and what the system allowed. You didn't fail. You were failed.", bilateral: false },
      { name: "Body Location", duration: 60, instruction: "Where in your body does this live? The chest? The shoulders? The jaw? Place a hand there if that feels right. Your body has been trying to carry something that was never meant to live there.", bilateral: false },
      { name: "Bilateral Processing — Round 1", duration: 180, instruction: "Hold the general sense of the burden — not any specific event, just the weight of it. As the stimulation begins, let whatever surfaces come without editing.", bilateral: true, sets: 10, speed: "medium" },
      { name: "Bilateral Processing — Round 2", duration: 150, instruction: "Notice where you are now. Hold what's present and continue. You're not trying to resolve anything today — just begin to loosen what's been held too tight for too long.", bilateral: true, sets: 8, speed: "slow" },
      { name: "Adaptive Belief", duration: 90, instruction: "What would it mean to believe: 'I did the best I could with what I had.' Let that statement sit. Notice your body's response to it. Even partial belief counts.", bilateral: true, sets: 4, speed: "slow" },
      { name: "Integration", duration: 90, instruction: "Whatever shifted today — even a fraction — is real. This work doesn't happen all at once. Come back when you're ready. For now, breathe. Ground. You showed up for yourself today.", bilateral: false },
    ]
  },
  {
    id: "grief", category: "Grief", title: "Patient Loss & Bereavement",
    duration: "28 min", description: "Space for grief that healthcare culture often doesn't allow. You were allowed to care. You are allowed to grieve.",
    phases: [
      { name: "Permission", duration: 90, instruction: "Before anything else: you are allowed to grieve. Whatever you're carrying about this loss — it doesn't make you unprofessional. It means you're human. Take a breath and let that be true.", bilateral: false },
      { name: "Honoring", duration: 90, instruction: "Let an image of this person — or the sense of them — come gently to mind. Not the end, but who they were. What do you want to hold about them?", bilateral: false },
      { name: "Feeling the Grief", duration: 60, instruction: "Where is the grief in your body right now? Let yourself feel it without trying to manage it. You've been managing it. This is your time not to.", bilateral: false },
      { name: "Bilateral Processing", duration: 150, instruction: "Hold the grief — the love that's in it, the loss that's in it — and let the bilateral stimulation begin. Follow wherever it takes you. Cry if you need to. Breathe when you can.", bilateral: true, sets: 8, speed: "slow" },
      { name: "Continuing Bonds", duration: 120, instruction: "What do you want to carry forward from knowing this person? Grief doesn't end — it transforms. What form do you want it to take?", bilateral: true, sets: 5, speed: "slow" },
      { name: "Closing Ritual", duration: 90, instruction: "Take a moment to say whatever you need to say — silently or aloud. You don't need to be done grieving. You just need to know you can set it down for now.", bilateral: false },
    ]
  },
];

const SPEEDS = { slow: 2200, medium: 1600, fast: 1100 };

// ─── BilateralDot ────────────────────────────────────────────────
function BilateralDot({ active, speed = "medium", sets = 6, onComplete, onTone }) {
  const [pos, setPos] = useState(0);
  const [rep, setRep] = useState(0);
  const totalReps = sets * 2;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) { setPos(0); setRep(0); return; }
    timerRef.current = setInterval(() => {
      setPos(p => {
        const next = p === 0 ? 1 : 0;
        onTone?.(next === 0 ? "left" : "right");
        return next;
      });
      setRep(r => {
        const next = r + 1;
        if (next >= totalReps) { clearInterval(timerRef.current); onComplete?.(); }
        return next;
      });
    }, SPEEDS[speed]);
    return () => clearInterval(timerRef.current);
  }, [active, speed, totalReps]);

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
        <circle cx={24} cy={24} r={20} fill="none" stroke="#7C9885" strokeWidth={2} strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`} strokeLinecap="round" transform="rotate(-90 24 24)" style={{ transition: "stroke-dashoffset 1s linear" }} />
        <text x={24} y={28} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={11} fontFamily="monospace">{m}:{String(s).padStart(2,"0")}</text>
      </svg>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em" }}>{pct < 100 ? `${pct}% complete` : "phase complete"}</div>
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
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [bilateralDone, setBilateralDone] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const { play: playTone, unlock: unlockAudio } = useTone(audioEnabled);
  const phase = protocol.phases[phaseIdx];
  const isLast = phaseIdx === protocol.phases.length - 1;

  const advance = useCallback(() => {
    if (isLast) { setCompleted(true); setRunning(false); return; }
    setPhaseIdx(i => i + 1);
    setRunning(false); setBilateralDone(false); setTimerDone(false);
  }, [isLast]);

  useEffect(() => {
    if (!running) return;
    if (phase.bilateral && bilateralDone && timerDone) advance();
    if (!phase.bilateral && timerDone) advance();
  }, [bilateralDone, timerDone, running, phase, advance]);

  const canAdvance = phase.bilateral ? (bilateralDone && timerDone) : timerDone;

  const btnBase = { fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", cursor: "pointer", borderRadius: 3, padding: "18px 0" };

  if (completed) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 32, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(124,152,133,0.15)", border: "1px solid rgba(124,152,133,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✓</div>
      <div>
        <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 28, fontWeight: 300, marginBottom: 16 }}>Session Complete</div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, maxWidth: 400, lineHeight: 1.75, marginBottom: 8 }}>Take your time returning. Sit quietly for a few minutes before moving on.</div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontStyle: "italic", fontFamily: "Georgia, serif", marginTop: 16 }}>"You showed up for yourself today."</div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => { setPhaseIdx(0); setRunning(false); setBilateralDone(false); setTimerDone(false); setCompleted(false); }} style={{ ...btnBase, color: "#7C9885", background: "rgba(124,152,133,0.1)", border: "1px solid rgba(124,152,133,0.3)", padding: "12px 24px" }}>Repeat Session</button>
        <button onClick={onBack} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 24px" }}>Back to Library</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
        <button onClick={onBack} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
        <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>{protocol.title}</div>
        <button onClick={() => setAudioEnabled(a => !a)} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: audioEnabled ? "#7C9885" : "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer" }}>
          {audioEnabled ? "🎧 audio on" : "🔇 audio off"}
        </button>
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
          <div style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Bilateral Stimulation — use headphones for full effect</div>
          <BilateralDot active={running} speed={phase.speed} sets={phase.sets} onTone={playTone} onComplete={() => setBilateralDone(true)} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
        <PhaseTimer duration={phase.duration} active={running} onComplete={() => setTimerDone(true)} />
        {running && !canAdvance && <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>in progress</div>}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {!running ? (
          <button onClick={() => { unlockAudio(); setRunning(true); setBilateralDone(false); setTimerDone(false); }}
            style={{ ...btnBase, flex: 1, background: "rgba(124,152,133,0.15)", border: "1px solid rgba(124,152,133,0.4)", color: "#7C9885" }}>
            {phaseIdx === 0 ? "Begin Session" : "Begin Phase"}
          </button>
        ) : (
          <button onClick={() => { setRunning(false); setBilateralDone(false); setTimerDone(false); }}
            style={{ ...btnBase, flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
            Pause
          </button>
        )}
        {(canAdvance || (!running && phaseIdx > 0)) && (
          <button onClick={advance} style={{ ...btnBase, padding: "18px 28px", background: isLast ? "rgba(124,152,133,0.2)" : "transparent", border: "1px solid rgba(124,152,133,0.3)", color: "#7C9885" }}>
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
function playTestTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const silent = ctx.createBufferSource();
    silent.buffer = buf; silent.connect(ctx.destination); silent.start(0);
    ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
  } catch(e) { alert("Audio error: " + e.message); }
}

export default function EMDRApp() {
  const [view, setView] = useState("home");
  const [activeProtocol, setActiveProtocol] = useState(null);
  const startSession = (p) => { setActiveProtocol(p); setView("session"); };

  const navBtn = (v, label) => (
    <button key={v} onClick={() => { setView(v); setActiveProtocol(null); }}
      style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", padding: "8px 14px", borderRadius: 3, cursor: "pointer", border: "1px solid", transition: "all 0.2s", borderColor: view === v ? "rgba(124,152,133,0.4)" : "transparent", background: view === v ? "rgba(124,152,133,0.1)" : "transparent", color: view === v ? "#7C9885" : "rgba(255,255,255,0.35)" }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050608", color: "#F4EFE7", fontFamily: "Inter, system-ui, sans-serif", fontWeight: 300 }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(5,6,8,0.92)", position: "sticky", top: 0, zIndex: 50, flexWrap: "wrap", gap: 12 }}>
        <div onClick={() => { setView("home"); setActiveProtocol(null); }} style={{ fontFamily: "Georgia, serif", fontSize: 15, cursor: "pointer" }}>
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

        {/* HOME */}
        {view === "home" && (
          <div>
            <div style={{ paddingBottom: 56, borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 64 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.28em", color: "#7C9885", marginBottom: 24 }}>Evidence-Based Trauma Processing</div>
              <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 300, fontSize: "clamp(40px, 6vw, 80px)", lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: 28 }}>EMDR<br /><em style={{ color: "#7C9885" }}>Therapy</em></h1>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 16, maxWidth: "52ch", lineHeight: 1.75 }}>Eye Movement Desensitization and Reprocessing is a clinically validated therapy for trauma, moral injury, and occupational stress — rebuilt here for healthcare workers.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 64 }}>
              {[
                { icon: "◎", title: "Bilateral Stimulation", desc: "On-screen dot tracking with synchronized tones. Use headphones for full left/right audio effect." },
                { icon: "◌", title: "Phased Protocols", desc: "Each session follows the structured EMDR model — stabilization through integration — at your pace." },
                { icon: "⟳", title: "Clinician-Specific", desc: "Sessions designed around the specific traumas healthcare workers carry — not generic stress content." },
                { icon: "◈", title: "Live + Self-Guided", desc: "On-demand guided sessions or scheduled Zoom sessions with an EMDR-certified therapist." },
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
              <button onClick={playTestTone} style={{ padding: "16px 32px", fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", cursor: "pointer", borderRadius: 3 }}>🔊 Test Audio</button>
            </div>
          </div>
        )}

        {/* LIBRARY */}
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

        {/* SESSION */}
        {view === "session" && activeProtocol && (
          <SessionPlayer protocol={activeProtocol} onBack={() => { setView("library"); setActiveProtocol(null); }} />
        )}

        {/* LIVE */}
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
