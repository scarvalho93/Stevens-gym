import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── DATA ──────────────────────────────────────────────────────────────────────

const PROGRAMME = [
  { week: 1, date: "23 Feb", rounds: 3, duration: "~45 min", focus: "Build the base", notes: "Easy pace. Get comfortable with the flow.", exercises: ["500m Ski Erg","500m Run","20 Wall Balls","15 Burpees Broad Jump","100m Farmers Carry","15 Walking Lunges"] },
  { week: 2, date: "2 Mar",  rounds: 3, duration: "~45 min", focus: "Consistency",    notes: "Same structure. Push the runs slightly harder.", exercises: ["500m Ski Erg","500m Run","20 Wall Balls","15 Burpees Broad Jump","100m Farmers Carry","15 Walking Lunges"] },
  { week: 3, date: "9 Mar",  rounds: 3, duration: "~50 min", focus: "Volume up",      notes: "Increase reps on burpees & lunges. Up wall ball weight if possible.", exercises: ["500m Ski Erg","500m Run","20 Wall Balls","20 Burpees Broad Jump","100m Farmers Carry","20 Walking Lunges"] },
  { week: 4, date: "16 Mar", rounds: 4, duration: "~55 min", focus: "Add a round",    notes: "4 rounds now. Allow yourself an extra 10 mins today.", exercises: ["500m Ski Erg","500m Run","20 Wall Balls","20 Burpees Broad Jump","100m Farmers Carry","15 Walking Lunges"] },
  { week: 5, date: "23 Mar", rounds: 4, duration: "~55 min", focus: "Strength endurance", notes: "Back to race-standard 25 burpees. Focus on not slowing down in round 4.", exercises: ["500m Ski Erg","500m Run","20 Wall Balls","25 Burpees Broad Jump","100m Farmers Carry","20 Walking Lunges"] },
  { week: 6, date: "30 Mar", rounds: 4, duration: "~55 min", focus: "Race pace",      notes: "Treat this like race day. Time yourself. No slacking on transitions.", exercises: ["500m Ski Erg","500m Run","20 Wall Balls","25 Burpees Broad Jump","100m Farmers Carry","20 Walking Lunges"] },
  { week: 7, date: "6 Apr",  rounds: 3, duration: "~45 min", focus: "Taper begins",   notes: "Back to 3 rounds. Keep intensity but protect the body.", exercises: ["500m Ski Erg","500m Run","20 Wall Balls","15 Burpees Broad Jump","100m Farmers Carry","15 Walking Lunges"] },
  { week: 8, date: "13 Apr", rounds: 2, duration: "~30 min", focus: "Race week shakeout", notes: "Light & sharp. Stay loose. HYROX on 16th April — you're ready!", exercises: ["500m Ski Erg","500m Run","15 Wall Balls","10 Burpees Broad Jump","100m Farmers Carry"] },
];

const FOCUS_COLORS = {
  "Build the base": "#60a5fa", "Consistency": "#a78bfa", "Volume up": "#fb923c",
  "Add a round": "#f87171", "Strength endurance": "#ef4444", "Race pace": "#dc2626",
  "Taper begins": "#34d399", "Race week shakeout": "#10b981",
};

const HYROX_EXERCISES = ["Wall Balls","Farmers Carry (first leg)","Farmers Carry (second leg)","Lunge Bag","Ski Erg","Rowing"];

const SEED_SESSIONS = [
  {
    id: 1, date: "2026-02-22", type: "Sunday Hyrox", totalTime: "49:42", rounds: 3,
    weights: { "Wall Balls": "9", "Farmers Carry (first leg)": "32", "Farmers Carry (second leg)": "24", "Lunge Bag": "20", "Ski Erg": "", "Rowing": "" },
    notes: "Box jump to burpee variation. Strong first session — Week 1.", exercises: [],
  },
  {
    id: 2, date: "2026-02-22", type: "Strength", totalTime: "—", rounds: 1,
    weights: {},
    notes: "Steven solo — chest, legs, arms",
    exercises: [
      { name: "Bench Press", sets: [{ reps: 12, weight: "60kg", note: null }, { reps: 9, weight: "65kg", note: null }, { reps: 8, weight: "65kg", note: null }] },
      { name: "Pull Ups", sets: [{ reps: 10, weight: "bodyweight", note: null }, { reps: 10, weight: "bodyweight", note: null }, { reps: 8, weight: "bodyweight", note: null }] },
      { name: "Squats", sets: [{ reps: 8, weight: "85kg", note: null }, { reps: 10, weight: "85kg", note: null }, { reps: 8, weight: "95kg", note: "nursing sore leg" }] },
      { name: "Seated Leg Curls", sets: [{ reps: 10, weight: "50kg", note: null }] },
      { name: "Skullcrushers (incline, dumbbell)", sets: [{ reps: 15, weight: "10kg", note: null }, { reps: 15, weight: "10kg", note: null }, { reps: 15, weight: "10kg", note: null }] },
      { name: "Dumbbell Lateral Raises", sets: [{ reps: 15, weight: "10kg", note: null }, { reps: 12, weight: "10kg", note: null }, { reps: 12, weight: "10kg", note: null }] },
      { name: "Chest Press Machine", sets: [{ reps: 10, weight: "60kg", note: null }, { reps: 10, weight: "60kg", note: null }, { reps: 10, weight: "60kg", note: null }] },
    ],
  },
];

// ── STORAGE ───────────────────────────────────────────────────────────────────

async function loadData(key) {
  try {
    const r = await window.storage.get(key);
    return r && r.value ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function saveData(key, value) {
  try {
    const r = await window.storage.set(key, JSON.stringify(value));
    return !!r;
  } catch { return false; }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function timeToSeconds(t) {
  if (!t || t === "—") return null;
  const p = t.split(":").map(Number);
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return null;
}

async function parseWithAI(text) {
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: "Parse this gym session into JSON. Return ONLY valid JSON, no markdown.\n\nNotes:\n" + text + "\n\nStructure:\n{\"type\":\"Strength\",\"date\":\"" + today + "\",\"totalTime\":\"—\",\"rounds\":1,\"notes\":\"one line summary\",\"exercises\":[{\"name\":\"exercise name\",\"sets\":[{\"reps\":10,\"weight\":\"60kg\",\"note\":null}]}]}"
      }]
    })
  });
  if (!res.ok) throw new Error("API " + res.status);
  const data = await res.json();
  const raw = data.content[0].text.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

// ── ICONS ─────────────────────────────────────────────────────────────────────

const IRunning = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}><path d="M13 4a1 1 0 100-2 1 1 0 000 2zM7 21l2-6 3 3 3-4 4 2M5 12l2-4 4 2 2-4"/></svg>;
const IList    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
const IVoice   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>;
const IEdit    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IPlan    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const ITrophy  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M8 21h8M12 17v4M17 9a5 5 0 01-10 0V4h10v5z"/></svg>;

// ── SESSIONS TAB ──────────────────────────────────────────────────────────────

function SessionsTab({ sessions, onDelete }) {
  const [expanded, setExpanded] = useState(null);
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h2 className="text-2xl font-black text-white">ALL SESSIONS</h2>
        <p className="text-gray-500 text-sm">{sessions.length} logged</p>
      </div>
      {sorted.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
          <p className="text-gray-400">No sessions yet — use Voice or Quick Log!</p>
        </div>
      ) : sorted.map(s => (
        <div key={s.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <button className="w-full text-left px-5 py-4 flex justify-between items-start"
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
            <div>
              <div className="text-white font-black">{s.type}</div>
              <div className="text-gray-500 text-xs mt-0.5">{s.date} · {s.rounds} round{s.rounds !== 1 ? "s" : ""}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-green-400 font-black text-xl">{s.totalTime}</div>
              <span className="text-gray-600 text-xs">{expanded === s.id ? "▲" : "▼"}</span>
            </div>
          </button>
          {expanded === s.id && (
            <div className="border-t border-gray-800">
              {s.notes ? <div className="px-5 py-3 border-b border-gray-800"><p className="text-xs text-gray-500 italic">"{s.notes}"</p></div> : null}
              {Object.entries(s.weights || {}).some(([,v]) => v) && (
                <div className="px-5 py-4 grid grid-cols-3 gap-2 border-b border-gray-800">
                  {Object.entries(s.weights).filter(([,v]) => v).map(([k,v]) => (
                    <div key={k} className="bg-black rounded-lg p-2 text-center">
                      <div className="text-white font-bold text-sm">{v}kg</div>
                      <div className="text-gray-600 text-xs truncate">{k.replace(" (first leg)"," L1").replace(" (second leg)"," L2")}</div>
                    </div>
                  ))}
                </div>
              )}
              {(s.exercises || []).length > 0 && (
                <div className="px-5 py-4 space-y-4 border-b border-gray-800">
                  {s.exercises.map((ex, i) => (
                    <div key={i}>
                      <p className="text-white font-bold text-sm mb-2">{ex.name}</p>
                      <div className="space-y-1">
                        {(ex.sets || []).map((set, j) => (
                          <div key={j} className="flex items-center gap-3 text-xs">
                            <span className="text-gray-600 w-10">Set {j+1}</span>
                            {set.reps && <span className="text-gray-300">{set.reps} reps</span>}
                            {set.weight && <span className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded">{set.weight}</span>}
                            {set.note && <span className="text-gray-500 italic">{set.note}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {s.id !== 1 && s.id !== 2 && (
                <div className="px-5 py-3 flex justify-end">
                  <button onClick={() => onDelete(s.id)} className="text-xs text-gray-700 hover:text-red-400">Delete</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── VOICE / IMPORT TAB ────────────────────────────────────────────────────────

function VoiceTab({ onSave }) {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("idle");
  const [parsed, setParsed] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef(null);
  const finalRef = useRef("");

  const voiceSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startVoice = () => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setErrorMsg("Voice not supported on this browser. Please type instead."); return; }
      finalRef.current = "";
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-GB";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + " ";
          else interim += e.results[i][0].transcript;
        }
        setTranscript(finalRef.current + interim);
      };
      rec.onerror = (e) => {
        setRecording(false);
        const msg = e.error === "not-allowed"
          ? "Mic permission denied. Please allow microphone access."
          : "Mic error: " + e.error;
        setErrorMsg(msg);
      };
      rec.onend = () => setRecording(false);
      recognitionRef.current = rec;
      rec.start();
      setRecording(true);
      setErrorMsg("");
      setTranscript("");
    } catch (e) {
      setErrorMsg("Could not start mic: " + e.message);
    }
  };

  const stopVoice = () => {
    try { recognitionRef.current && recognitionRef.current.stop(); } catch {}
    setRecording(false);
  };

  const handleParse = async () => {
    if (!transcript.trim()) return;
    setStatus("parsing");
    setErrorMsg("");
    try {
      const result = await parseWithAI(transcript);
      setParsed(result);
      setStatus("preview");
    } catch (e) {
      const fallback = {
        type: "Strength", date: new Date().toISOString().split("T")[0],
        totalTime: "—", rounds: 1, notes: transcript.trim().slice(0, 500), exercises: [],
      };
      setParsed(fallback);
      setStatus("preview");
      setErrorMsg("AI parse failed — your raw notes will be saved as the session summary.");
    }
  };

  const handleSave = async () => {
    setStatus("saving");
    try {
      const session = {
        id: Date.now(),
        date: parsed.date || new Date().toISOString().split("T")[0],
        type: parsed.type || "Strength",
        totalTime: parsed.totalTime || "—",
        rounds: parsed.rounds || 1,
        notes: parsed.notes || "",
        weights: {},
        exercises: parsed.exercises || [],
      };
      await onSave(session);
      setStatus("saved");
      setTranscript(""); setParsed(null); setErrorMsg("");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      setStatus("preview");
      setErrorMsg("Save failed — try again.");
    }
  };

  const reset = () => { setStatus("idle"); setParsed(null); setErrorMsg(""); };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-2xl font-black text-white">VOICE LOG</h2>
        <p className="text-gray-500 text-sm">Speak or paste — AI will structure it</p>
      </div>

      {(status === "idle" || status === "error") && (
        <div className="space-y-4">
          {voiceSupported && (
            <div className="flex flex-col items-center py-4">
              <button
                onClick={recording ? stopVoice : startVoice}
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl active:scale-95 transition-transform mb-3"
                style={{ background: recording ? "#ef4444" : "#00ff87", color: "#000" }}>
                {recording ? "⏹" : "🎙️"}
              </button>
              <p className="text-sm font-bold" style={{ color: recording ? "#ef4444" : "#00ff87" }}>
                {recording ? "Listening... tap to stop" : "Tap to speak your session"}
              </p>
              {recording && (
                <div className="flex gap-1.5 mt-3 items-end h-6">
                  {[14,20,10,18,12,22,8].map((h, i) => (
                    <div key={i} className="w-1.5 rounded-full bg-green-400 opacity-80" style={{ height: h + "px" }} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 w-full mt-5">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-600">or type / paste below</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
            </div>
          )}

          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={"Paste your Apple Notes workout here...\n\ne.g.\n1. Bench press\n12x60kg; 9x65kg; 8x65kg\n\n2. Squats\n85kg x8, 85kg x10, 95kg x8"}
            rows={8}
            className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none resize-none"
            style={{ borderColor: recording ? "#ef4444" : undefined }}
          />

          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

          <button onClick={handleParse} disabled={!transcript.trim()}
            className="w-full py-4 rounded-2xl font-black text-black text-lg disabled:opacity-40"
            style={{ background: "#00ff87" }}>
            PARSE WITH AI ✦
          </button>
        </div>
      )}

      {status === "parsing" && (
        <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center">
          <div className="text-4xl mb-4">✦</div>
          <p className="text-green-400 font-black">Reading your session...</p>
        </div>
      )}

      {status === "preview" && parsed && (
        <div className="space-y-4">
          {errorMsg && <p className="text-yellow-400 text-sm">{errorMsg}</p>}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center">
              <div>
                <div className="text-white font-black">{parsed.type}</div>
                <div className="text-gray-500 text-xs">{parsed.date}</div>
              </div>
              <span className="text-xs text-green-400 border border-green-800 rounded px-2 py-0.5 font-bold">PREVIEW</span>
            </div>
            {parsed.notes && (
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-gray-400 text-sm italic">"{parsed.notes}"</p>
              </div>
            )}
            <div className="px-5 py-4 space-y-4">
              {(parsed.exercises || []).length === 0 && (
                <p className="text-gray-500 text-sm">Raw notes saved — no structured exercises detected.</p>
              )}
              {(parsed.exercises || []).map((ex, i) => (
                <div key={i}>
                  <p className="text-white font-bold text-sm mb-2">{ex.name}</p>
                  <div className="space-y-1">
                    {(ex.sets || []).map((set, j) => (
                      <div key={j} className="flex items-center gap-3 text-xs">
                        <span className="text-gray-600 w-10">Set {j+1}</span>
                        {set.reps && <span className="text-gray-300">{set.reps} reps</span>}
                        {set.weight && <span className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded">{set.weight}</span>}
                        {set.note && <span className="text-gray-500 italic">{set.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={reset} className="py-3 rounded-2xl font-black text-gray-400 text-sm border border-gray-700">← REDO</button>
            <button onClick={handleSave} className="py-3 rounded-2xl font-black text-black text-sm" style={{ background: "#00ff87" }}>SAVE ✓</button>
          </div>
        </div>
      )}

      {status === "saving" && (
        <div className="bg-gray-900 rounded-2xl p-12 text-center">
          <p className="text-green-400 font-black animate-pulse">Saving...</p>
        </div>
      )}

      {status === "saved" && (
        <div className="bg-gray-900 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3">✓</div>
          <p className="text-green-400 font-black text-xl">Saved!</p>
          <p className="text-gray-500 text-sm mt-1">Check Sessions tab</p>
        </div>
      )}
    </div>
  );
}

// ── QUICK LOG TAB ─────────────────────────────────────────────────────────────

function QuickLogTab({ onSave }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [sessionType, setSessionType] = useState("Strength");
  const [exercises, setExercises] = useState([{ name: "", sets: [{ weight: "", reps: "" }] }]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const addExercise = () => setExercises(e => [...e, { name: "", sets: [{ weight: "", reps: "" }] }]);
  const removeExercise = (i) => setExercises(e => e.filter((_, idx) => idx !== i));
  const updateName = (i, v) => setExercises(e => e.map((ex, idx) => idx === i ? { ...ex, name: v } : ex));
  const addSet = (i) => setExercises(e => e.map((ex, idx) => idx === i ? { ...ex, sets: [...ex.sets, { weight: "", reps: "" }] } : ex));
  const removeSet = (i, j) => setExercises(e => e.map((ex, idx) => idx === i ? { ...ex, sets: ex.sets.filter((_, si) => si !== j) } : ex));
  const updateSet = (i, j, f, v) => setExercises(e => e.map((ex, idx) => idx === i ? { ...ex, sets: ex.sets.map((s, si) => si === j ? { ...s, [f]: v } : s) } : ex));

  const submit = async () => {
    setError("");
    const filled = exercises.filter(ex => ex.name.trim()).map(ex => ({
      name: ex.name.trim(),
      sets: ex.sets.filter(s => s.reps || s.weight).map(s => ({
        reps: s.reps ? parseInt(s.reps) : null,
        weight: s.weight ? s.weight + "kg" : null,
        note: null,
      }))
    }));
    if (filled.length === 0) { setError("Add at least one exercise."); return; }
    const session = {
      id: Date.now(), date, type: sessionType, totalTime: "—", rounds: 1,
      notes: filled.map(e => e.name).join(", "), weights: {}, exercises: filled,
    };
    try {
      await onSave(session);
      setSaved(true);
      setExercises([{ name: "", sets: [{ weight: "", reps: "" }] }]);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Save failed — try again."); }
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-2xl font-black text-white">QUICK LOG</h2>
        <p className="text-gray-500 text-sm">Log exercises, sets, weight and reps</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400" />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Type</label>
          <select value={sessionType} onChange={e => setSessionType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400">
            <option>Strength</option><option>Cardio</option><option>Sunday Hyrox</option><option>Mixed</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {exercises.map((ex, i) => (
          <div key={i} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <input value={ex.name} onChange={e => updateName(i, e.target.value)}
                placeholder="Exercise name (e.g. Bench Press)"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-green-400" />
              {exercises.length > 1 && (
                <button onClick={() => removeExercise(i)} className="text-gray-600 hover:text-red-400 px-2">✕</button>
              )}
            </div>
            <div className="px-4 pb-2">
              <div className="grid grid-cols-12 gap-1 mb-1 px-1">
                <span className="col-span-1 text-xs text-gray-600">#</span>
                <span className="col-span-5 text-xs text-gray-500 uppercase tracking-wider">Weight kg</span>
                <span className="col-span-5 text-xs text-gray-500 uppercase tracking-wider">Reps</span>
              </div>
              {ex.sets.map((s, j) => (
                <div key={j} className="grid grid-cols-12 gap-1 mb-1.5 items-center">
                  <span className="col-span-1 text-xs text-gray-600 text-center">{j+1}</span>
                  <input type="number" value={s.weight} placeholder="kg" onChange={e => updateSet(i, j, "weight", e.target.value)}
                    className="col-span-5 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-green-400" />
                  <input type="number" value={s.reps} placeholder="reps" onChange={e => updateSet(i, j, "reps", e.target.value)}
                    className="col-span-5 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-green-400" />
                  {ex.sets.length > 1 && (
                    <button onClick={() => removeSet(i, j)} className="col-span-1 text-gray-700 hover:text-red-400 text-xs text-center">✕</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex border-t border-gray-800">
              <button onClick={() => addSet(i)} className="flex-1 py-2.5 text-xs text-gray-500 hover:text-green-400 transition-colors border-r border-gray-800">
                + Add Set
              </button>
              <button
                onClick={() => {
                  const last = ex.sets[ex.sets.length - 1];
                  if (last) setExercises(e => e.map((ex2, idx) => idx === i ? { ...ex2, sets: [...ex2.sets, { ...last }] } : ex2));
                }}
                disabled={ex.sets.length === 0}
                className="flex-1 py-2.5 text-xs text-gray-500 hover:text-green-400 transition-colors disabled:opacity-30"
                title="Copy last set">
                ↩ Repeat last
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addExercise} className="w-full py-3 rounded-2xl text-sm font-bold border border-gray-700 text-gray-400 hover:border-green-400 hover:text-green-400 transition-colors">
        + Add Exercise
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={submit}
        className="w-full py-4 rounded-2xl font-black text-black text-lg active:scale-95"
        style={{ background: saved ? "#10b981" : "#00ff87" }}>
        {saved ? "✓ SAVED!" : "SAVE SESSION"}
      </button>
    </div>
  );
}

// ── PROGRAMME TAB ─────────────────────────────────────────────────────────────

function ProgrammeTab() {
  const [expanded, setExpanded] = useState(null);
  const daysLeft = Math.max(0, Math.ceil((new Date("2026-04-16") - new Date()) / 86400000));

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-white">PROGRAMME</h2>
          <p className="text-gray-500 text-sm">8-week Hyrox prep</p>
        </div>
        <div className="text-right">
          <div className="text-green-400 font-black text-2xl">{daysLeft}</div>
          <div className="text-gray-500 text-xs">days to race</div>
        </div>
      </div>
      <div className="space-y-2">
        {PROGRAMME.map((w, i) => {
          const color = FOCUS_COLORS[w.focus] || "#00ff87";
          return (
            <div key={i} className="rounded-2xl overflow-hidden border border-gray-800" style={{ background: expanded === i ? "#111" : "#0d0d0d" }}>
              <button className="w-full text-left px-5 py-4 flex items-center gap-4" onClick={() => setExpanded(expanded === i ? null : i)}>
                <div className="text-center w-10">
                  <div className="text-xs text-gray-600">WK</div>
                  <div className="text-xl font-black text-white">{w.week}</div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-white">{w.date}</div>
                  <div className="text-xs mt-0.5" style={{ color }}>{w.focus}</div>
                </div>
                <div className="text-xs text-gray-500">{w.rounds}× · {w.duration}</div>
                <span className="text-gray-600 text-sm">{expanded === i ? "▲" : "▼"}</span>
              </button>
              {expanded === i && (
                <div className="px-5 pb-5 border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-3">1k Run Warmup then {w.rounds}× through:</p>
                  <div className="space-y-2 mb-4">
                    {w.exercises.map((ex, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: color + "22", color }}>{j+1}</div>
                        <span className="text-sm text-gray-300">{ex}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-black rounded-xl p-3"><p className="text-xs text-gray-400">💬 {w.notes}</p></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl p-5 text-center" style={{ background: "#00ff8710", border: "1px solid #00ff8730" }}>
        <div className="text-3xl mb-1">🏁</div>
        <div className="font-black text-white">HYROX RACE DAY</div>
        <div className="text-green-400 font-bold">16 April 2026</div>
      </div>
    </div>
  );
}

// ── PBs TAB ───────────────────────────────────────────────────────────────────

function PBsTab({ sessions }) {
  const [manualPR, setManualPR] = useState({ name: "", value: "", unit: "kg", date: "" });
  const [manualPRs, setManualPRs] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadData("manual_prs").then(d => { if (d) setManualPRs(d); }); }, []);

  const hyrox = sessions.filter(s => s.type === "Sunday Hyrox");
  const bestTime = hyrox.reduce((b, s) => {
    const secs = timeToSeconds(s.totalTime);
    if (!secs) return b;
    if (!b || secs < b.secs) return { time: s.totalTime, date: s.date, secs };
    return b;
  }, null);

  const weightPRs = HYROX_EXERCISES.map(ex => {
    const best = hyrox.filter(s => s.weights?.[ex] && parseFloat(s.weights[ex]) > 0)
      .reduce((b, s) => { const v = parseFloat(s.weights[ex]); return (!b || v > b.value) ? { value: v, date: s.date } : b; }, null);
    return { name: ex, best };
  }).filter(x => x.best);

  const savePR = async () => {
    if (!manualPR.name || !manualPR.value) return;
    const updated = [...manualPRs, { ...manualPR, id: Date.now() }];
    setManualPRs(updated);
    await saveData("manual_prs", updated);
    setManualPR({ name: "", value: "", unit: "kg", date: "" });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const deletePR = async (id) => {
    const updated = manualPRs.filter(p => p.id !== id);
    setManualPRs(updated);
    await saveData("manual_prs", updated);
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-2xl font-black text-white">PERSONAL BESTS</h2>
        <p className="text-gray-500 text-sm">Your best performances</p>
      </div>
      {bestTime && (
        <div className="rounded-2xl p-5 border" style={{ background: "#00ff8710", borderColor: "#00ff8740" }}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Best Hyrox Time</p>
          <div className="text-4xl font-black text-green-400">{bestTime.time}</div>
          <div className="text-gray-500 text-xs mt-1">{bestTime.date}</div>
        </div>
      )}
      {weightPRs.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Weight PBs</p>
          <div className="space-y-3">
            {weightPRs.map(({ name, best }) => (
              <div key={name} className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">{name}</span>
                <div><span className="text-white font-black">{best.value}kg</span><span className="text-gray-600 text-xs ml-2">{best.date}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {manualPRs.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Other PRs</p>
          <div className="space-y-3">
            {manualPRs.map(pr => (
              <div key={pr.id} className="flex justify-between items-center">
                <div><span className="text-gray-300 text-sm">{pr.name}</span>{pr.date && <span className="text-gray-600 text-xs ml-2">{pr.date}</span>}</div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-black">{pr.value} {pr.unit}</span>
                  <button onClick={() => deletePR(pr.id)} className="text-gray-700 hover:text-red-400 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Add PR manually</p>
        <div className="space-y-3">
          <input placeholder="e.g. 5k Run, Max Deadlift..." value={manualPR.name}
            onChange={e => setManualPR(p => ({ ...p, name: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400" />
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Value" value={manualPR.value} onChange={e => setManualPR(p => ({ ...p, value: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400" />
            <select value={manualPR.unit} onChange={e => setManualPR(p => ({ ...p, unit: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400">
              <option>kg</option><option>min</option><option>mm:ss</option><option>reps</option><option>m</option>
            </select>
            <input type="date" value={manualPR.date} onChange={e => setManualPR(p => ({ ...p, date: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400" />
          </div>
          <button onClick={savePR} className="w-full py-3 rounded-xl font-black text-black text-sm"
            style={{ background: saved ? "#10b981" : "#00ff87" }}>
            {saved ? "✓ SAVED" : "ADD PR"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RUNNING TAB ───────────────────────────────────────────────────────────────

function calcPace(distKm, timeStr) {
  if (!distKm || !timeStr || timeStr === "—") return null;
  const parts = timeStr.split(":").map(Number);
  let mins = 0;
  if (parts.length === 2) mins = parts[0] + parts[1] / 60;
  if (parts.length === 3) mins = parts[0] * 60 + parts[1] + parts[2] / 60;
  if (!mins) return null;
  const paceDecimal = mins / parseFloat(distKm);
  const paceMin = Math.floor(paceDecimal);
  const paceSec = Math.round((paceDecimal - paceMin) * 60);
  return paceMin + ":" + String(paceSec).padStart(2, "0") + " /km";
}

function RunningTab({ onSave }) {
  const today = new Date().toISOString().split("T")[0];
  const [tab, setTab] = useState("log");
  const [form, setForm] = useState({ date: today, distance: "", time: "", notes: "", type: "Easy Run" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [stravaToken, setStravaToken] = useState("");
  const [stravaRefreshToken, setStravaRefreshToken] = useState("");
  const [stravaRuns, setStravaRuns] = useState([]);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaError, setStravaError] = useState("");

  const pace = calcPace(form.distance, form.time);

  const submitRun = async () => {
    setError("");
    if (!form.distance || !form.time) { setError("Add distance and time."); return; }
    const session = {
      id: Date.now(),
      date: form.date,
      type: form.type,
      totalTime: form.time,
      rounds: 1,
      notes: [form.notes, pace ? "Pace: " + pace : null].filter(Boolean).join(" · "),
      weights: {},
      exercises: [],
      runData: { distance: parseFloat(form.distance), time: form.time, pace, type: form.type },
    };
    try {
      await onSave(session);
      setSaved(true);
      setForm({ date: today, distance: "", time: "", notes: "", type: "Easy Run" });
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Save failed — try again."); }
  };

  const VERCEL_URL = "https://stevens-gym-wqqz.vercel.app";
  const STRAVA_CLIENT_ID = "204822";

  const connectStrava = () => {
    const redirect = VERCEL_URL + "/running";
    window.location.href = "https://www.strava.com/oauth/authorize?client_id=" + STRAVA_CLIENT_ID + "&response_type=code&redirect_uri=" + encodeURIComponent(redirect) + "&approval_prompt=auto&scope=activity:read_all";
  };

  const exchangeStravaToken = async (code) => {
    setStravaLoading(true);
    setStravaError("");
    try {
      const res = await fetch("/api/strava-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, grant_type: "authorization_code" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token exchange failed");
      setStravaToken(data.access_token);
      setStravaRefreshToken(data.refresh_token);
      localStorage.setItem("strava_access_token", data.access_token);
      localStorage.setItem("strava_refresh_token", data.refresh_token);
      localStorage.setItem("strava_token_expiry", data.expires_at);
      setStravaError("");
    } catch(e) {
      setStravaError("Failed: " + e.message);
    }
    setStravaLoading(false);
  };

  const refreshStravaToken = async () => {
    const refreshToken = localStorage.getItem("strava_refresh_token");
    if (!refreshToken) return false;
    try {
      const res = await fetch("/api/strava-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStravaToken(data.access_token);
      localStorage.setItem("strava_access_token", data.access_token);
      localStorage.setItem("strava_token_expiry", data.expires_at);
      return data.access_token;
    } catch { return false; }
  };

  const fetchStrava = async () => {
    setStravaLoading(true);
    setStravaError("");
    try {
      let token = stravaToken || localStorage.getItem("strava_access_token");
      const expiry = localStorage.getItem("strava_token_expiry");
      if (expiry && Date.now() / 1000 > parseInt(expiry) - 300) {
        token = await refreshStravaToken();
      }
      if (!token) { setStravaError("Not connected to Strava — tap Connect."); setStravaLoading(false); return; }
      const res = await fetch("/api/strava-activities", {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) throw new Error("Strava error " + res.status);
      const runs = await res.json();
      setStravaRuns(runs.map(a => ({
        id: a.id, name: a.name, date: a.date, distance: a.distance,
        time: Math.floor(a.moving_time / 60) + ":" + String(a.moving_time % 60).padStart(2, "0"),
        pace: calcPace(a.distance, Math.floor(a.moving_time / 60) + ":" + String(a.moving_time % 60).padStart(2, "0")),
        elevGain: a.total_elevation_gain,
        heartRate: a.average_heartrate,
      })));
      if (runs.length === 0) setStravaError("No recent runs found.");
    } catch(e) {
      setStravaError(e.message);
    }
    setStravaLoading(false);
  };

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const savedToken = localStorage.getItem("strava_access_token");
    if (savedToken) { setStravaToken(savedToken); const rt = localStorage.getItem("strava_refresh_token"); if (rt) setStravaRefreshToken(rt); }
    if (code) {
      window.history.replaceState({}, "", window.location.pathname);
      exchangeStravaToken(code);
    }
  }, []);

  const importStravaRun = async (run) => {
    const session = {
      id: Date.now(),
      date: run.date,
      type: "Run",
      totalTime: run.time,
      rounds: 1,
      notes: run.name + (run.pace ? " · Pace: " + run.pace : "") + (run.heartRate ? " · HR: " + run.heartRate + "bpm" : ""),
      weights: {},
      exercises: [],
      runData: { distance: parseFloat(run.distance), time: run.time, pace: run.pace, type: "Run" },
    };
    await onSave(session);
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-2xl font-black text-white">RUNNING</h2>
        <p className="text-gray-500 text-sm">Log manually or import from Strava</p>
      </div>

      <div className="flex gap-2">
        {["log", "strava"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: tab === t ? "#00ff87" : "#111", color: tab === t ? "#000" : "#6b7280", border: "1px solid " + (tab === t ? "#00ff87" : "#374151") }}>
            {t === "log" ? "Manual Log" : "Strava"}
          </button>
        ))}
      </div>

      {tab === "log" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400">
                <option>Easy Run</option><option>Tempo Run</option><option>Intervals</option><option>Long Run</option><option>Race</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Distance (km)</label>
              <input type="number" step="0.1" value={form.distance} placeholder="5.2"
                onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Time (mm:ss or h:mm:ss)</label>
              <input value={form.time} placeholder="25:30"
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400" />
            </div>
          </div>

          {pace && (
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#00ff8715", border: "1px solid #00ff8730" }}>
              <span className="text-gray-400 text-sm">Avg Pace</span>
              <span className="text-green-400 font-black text-2xl">{pace}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="How did it feel? Route?" rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400 resize-none" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={submitRun}
            className="w-full py-4 rounded-2xl font-black text-black text-lg active:scale-95"
            style={{ background: saved ? "#10b981" : "#00ff87" }}>
            {saved ? "✓ RUN SAVED!" : "SAVE RUN"}
          </button>
        </div>
      )}

      {tab === "strava" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-3">
            <p className="text-white font-bold text-sm">Strava</p>
            {stravaToken ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-black rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-sm">✓</span>
                    <span className="text-gray-300 text-sm font-bold">Connected to Strava</span>
                  </div>
                  <button onClick={() => { setStravaToken(""); setStravaRefreshToken(""); localStorage.removeItem("strava_access_token"); localStorage.removeItem("strava_refresh_token"); localStorage.removeItem("strava_token_expiry"); setStravaRuns([]); }}
                    className="text-gray-600 text-xs hover:text-red-400">Disconnect</button>
                </div>
                <button onClick={fetchStrava} disabled={stravaLoading}
                  className="w-full py-3 rounded-xl font-black text-black text-sm disabled:opacity-50"
                  style={{ background: "#00ff87" }}>
                  {stravaLoading ? "Loading..." : "FETCH RECENT RUNS 🏃"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-500 text-xs">Connect your Strava account to import runs automatically.</p>
                <button onClick={connectStrava}
                  className="w-full py-3 rounded-xl font-black text-sm"
                  style={{ background: "#FC4C02", color: "white" }}>
                  🔗 Connect with Strava
                </button>
              </div>
            )}
            {stravaError && <p className="text-red-400 text-xs">{stravaError}</p>}
          </div>

          {stravaRuns.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Recent Runs from Strava</p>
              {stravaRuns.map(run => (
                <div key={run.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-bold text-sm">{run.name}</p>
                      <p className="text-gray-500 text-xs">{run.date}</p>
                    </div>
                    <button onClick={() => importStravaRun(run)}
                      className="text-xs font-bold px-3 py-1 rounded-lg"
                      style={{ background: "#00ff8720", color: "#00ff87", border: "1px solid #00ff8440" }}>
                      Import
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black rounded-lg p-2 text-center">
                      <div className="text-white font-bold">{run.distance}km</div>
                      <div className="text-gray-600 text-xs">Distance</div>
                    </div>
                    <div className="bg-black rounded-lg p-2 text-center">
                      <div className="text-white font-bold">{run.time}</div>
                      <div className="text-gray-600 text-xs">Time</div>
                    </div>
                    <div className="bg-black rounded-lg p-2 text-center">
                      <div className="text-green-400 font-bold">{run.pace}</div>
                      <div className="text-gray-600 text-xs">Pace</div>
                    </div>
                  </div>
                  {(run.heartRate || run.elevGain) && (
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {run.heartRate && <span>❤️ {run.heartRate}bpm avg</span>}
                      {run.elevGain && <span>↑ {run.elevGain}m elevation</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

export default function GymHub() {
  const [tab, setTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData("stevens_sessions").then(d => {
      if (d && d.length > 0) {
        const hasSeeds = d.find(s => s.id === 1) && d.find(s => s.id === 2);
        if (hasSeeds) {
          setSessions(d);
        } else {
          // Merge seeds with any extra sessions that aren't seeds
          const extras = d.filter(s => s.id !== 1 && s.id !== 2);
          setSessions([...SEED_SESSIONS, ...extras]);
        }
      } else {
        setSessions(SEED_SESSIONS);
      }
      setLoaded(true);
    });
  }, []);

  const saveSession = async (session) => {
    const updated = [...sessions, session];
    setSessions(updated);
    await saveData("stevens_sessions", updated);
    return true;
  };

  const deleteSession = async (id) => {
    if (id === 1 || id === 2) return;
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    await saveData("stevens_sessions", updated);
  };

  if (!loaded) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-green-400 font-black text-xl animate-pulse">LOADING...</div>
    </div>
  );

  const tabs = [
    { id: "sessions",  label: "Sessions", Icon: IList },
    { id: "voice",     label: "Voice",    Icon: IVoice },
    { id: "quicklog",  label: "Quick",    Icon: IEdit },
    { id: "running",   label: "Running",  Icon: IRunning },
    { id: "programme", label: "Plan",     Icon: IPlan },
    { id: "pbs",       label: "PBs",      Icon: ITrophy },
  ];

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="sticky top-0 z-10 bg-black border-b border-gray-900 px-5 py-4 flex justify-between items-center">
        <div>
          <div className="text-xs text-green-400 font-bold tracking-widest uppercase">Steven's Gym</div>
          <div className="text-xl font-black tracking-tight leading-none">HYROX PLAN</div>
        </div>
        <div className="text-xs text-gray-500">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</div>
      </div>

      <div className="px-5 pt-5 max-w-lg mx-auto">
        {tab === "sessions"  && <SessionsTab sessions={sessions} onDelete={deleteSession} />}
        {tab === "voice"     && <VoiceTab onSave={saveSession} />}
        {tab === "quicklog"  && <QuickLogTab onSave={saveSession} />}
        {tab === "running"   && <RunningTab onSave={saveSession} />}
        {tab === "programme" && <ProgrammeTab />}
        {tab === "pbs"       && <PBsTab sessions={sessions} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-900 px-2">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-3"
              style={{ color: tab === id ? "#00ff87" : "#4b5563" }}>
              <Icon />
              <span className="text-xs font-bold">{label}</span>
              {tab === id && <div className="w-1 h-1 rounded-full bg-green-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
