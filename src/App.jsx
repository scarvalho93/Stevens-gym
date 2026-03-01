import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

var SUPA_URL = "https://iahdjfqfuamxeqwcvmjz.supabase.co";
var SUPA_KEY = "sb_publishable_-Rk_LL2AyeDC5S-ZzqMSrg_EG9jwFF1";
var sb = createClient(SUPA_URL, SUPA_KEY);

var C = {
  bg:"#080808", surface:"#111", surface2:"#181818", border:"#252525",
  text:"#f0ebe3", muted:"#888", faint:"#444", accent:"#d4f53c",
  accentDim:"#d4f53c12", danger:"#ff3b2f", orange:"#FC4C02", green:"#22c55e", purple:"#a78bfa",
};
var F = "'Inter','Helvetica Neue','Arial',sans-serif";

// ── DB ──────────────────────────────────────────────────────────────────────
async function dbLoad(userId, key) {
  var r = await sb.from("user_data").select("value").eq("user_id", userId).eq("key", key).single();
  return (r.error || !r.data) ? null : r.data.value;
}
async function dbSave(userId, key, value) {
  await sb.from("user_data").upsert(
    { user_id: userId, key, value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  );
}

// ── AI ───────────────────────────────────────────────────────────────────────
function callAI(messages, system) {
  return fetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system: system || "" })
  }).then(r => { if (!r.ok) throw new Error("API " + r.status); return r.json(); })
    .then(d => d.content.map(b => b.text || "").join(""));
}

// ── VOICE ────────────────────────────────────────────────────────────────────
function speakEL(text) {
  return fetch("/api/elevenlabs", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId: "2UMI2FME0FFUFMlUoRER" })
  }).then(r => { if (!r.ok) throw new Error("Voice " + r.status); return r.blob(); })
    .then(blob => { var a = new Audio(URL.createObjectURL(blob)); a.play(); return a; });
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function toSecs(t) {
  if (!t || t === "--") return null;
  var p = t.split(":").map(Number);
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return null;
}
function calcPace(km, time) {
  var p = time.split(":").map(Number);
  var m = p.length === 2 ? p[0] + p[1] / 60 : p[0] * 60 + p[1] + p[2] / 60;
  var pace = m / parseFloat(km);
  return Math.floor(pace) + ":" + String(Math.round((pace % 1) * 60)).padStart(2, "0") + "/km";
}
function prgPct(tgt, cur) {
  if (!cur || !tgt) return 0;
  var sT = toSecs(tgt), sC = toSecs(cur);
  if (sT && sC) return Math.min(100, Math.round((sT / sC) * 100));
  var n = parseFloat(cur), t = parseFloat(tgt);
  if (!isNaN(n) && !isNaN(t) && t > 0) return Math.min(100, Math.round((n / t) * 100));
  return 0;
}
function fmtDur(d) {
  if (!d || d === "--") return null;
  var s = toSecs(d); if (!s) return null;
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? h + "h " + m + "m" : m + "m";
}
function totalMins(t) { var s = toSecs(t); if (!s) return null; return Math.round(s / 60) + " min"; }
function getToday() { return new Date().toISOString().split("T")[0]; }
function getMonday() {
  var d = new Date(), day = d.getDay(), diff = d.getDate() - (day === 0 ? 6 : day - 1);
  return new Date(new Date().setDate(diff)).toISOString().split("T")[0];
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000));
}
function weeksUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24 * 7)));
}
function parseJsonSafe(str) {
  try { return JSON.parse(str.replace(/```json|```/g, "").trim()); } catch (e) { return null; }
}

// ── PRE-BUILT PLANS ──────────────────────────────────────────────────────────
var PREBUILT = {
  "Couch to 5K": {
    emoji: "🏃", weeks: 8, desc: "Go from zero to running 5K without stopping.",
    plan: [
      { week:1, focus:"Walk/Run Intervals", date:"Wk 1", rounds:3, duration:"30", notes:"Alternate 60s run, 90s walk. Repeat 8x.", exercises:["5 min warm-up walk","8x (60s run / 90s walk)","5 min cool-down walk"] },
      { week:2, focus:"Build the Run", date:"Wk 2", rounds:3, duration:"30", notes:"Longer run intervals now.", exercises:["5 min warm-up walk","6x (90s run / 2 min walk)","5 min cool-down walk"] },
      { week:3, focus:"First 3-Minute Runs", date:"Wk 3", rounds:3, duration:"30", notes:"You've got this — 3 minute runs!", exercises:["5 min warm-up","2x (90s run / 90s walk / 3 min run / 3 min walk)","5 min cool-down"] },
      { week:4, focus:"Longer Intervals", date:"Wk 4", rounds:3, duration:"35", notes:"Push through — halfway there.", exercises:["5 min warm-up","3 min run / 90s walk / 5 min run / 2.5 min walk / 3 min run","5 min cool-down"] },
      { week:5, focus:"First 20-Minute Run", date:"Wk 5", rounds:3, duration:"40", notes:"Day 3: run 20 mins non-stop.", exercises:["5 min warm-up","20 min continuous run","5 min cool-down"] },
      { week:6, focus:"Building to 25 Mins", date:"Wk 6", rounds:3, duration:"40", notes:"Almost there. Keep the pace easy.", exercises:["5 min warm-up","25 min continuous run","5 min cool-down"] },
      { week:7, focus:"25-Minute Runs", date:"Wk 7", rounds:3, duration:"40", notes:"Consistency is key this week.", exercises:["5 min warm-up","25 min run","5 min cool-down"] },
      { week:8, focus:"5K Week 🎉", date:"Wk 8", rounds:3, duration:"45", notes:"Run your first 5K. You've earned it.", exercises:["5 min warm-up","30 min run (your 5K!)","5 min cool-down"] },
    ]
  },
  "Half Marathon": {
    emoji: "🏅", weeks: 12, desc: "12 weeks to your first half marathon.",
    plan: [
      { week:1, focus:"Aerobic Base", date:"Wk 1", rounds:4, duration:"45", notes:"Easy effort only. Build the habit.", exercises:["Easy 5K run","Post-run stretching 10 mins"] },
      { week:2, focus:"Build Mileage", date:"Wk 2", rounds:4, duration:"50", notes:"Add 10% distance this week.", exercises:["Easy 6K run","Strides x4 after run"] },
      { week:3, focus:"First Long Run", date:"Wk 3", rounds:4, duration:"60", notes:"Long run day: 10K at easy pace.", exercises:["Easy 10K long run","Recovery walk 10 mins"] },
      { week:4, focus:"Tempo Introduction", date:"Wk 4", rounds:4, duration:"55", notes:"One tempo run this week.", exercises:["Easy 5K warm-up","Tempo 3K","Easy 2K cool-down"] },
      { week:5, focus:"Long Run 12K", date:"Wk 5", rounds:4, duration:"70", notes:"Longest run yet. Keep it easy.", exercises:["12K long run","Post-run stretch 15 mins"] },
      { week:6, focus:"Speed Work", date:"Wk 6", rounds:4, duration:"55", notes:"4x1K intervals at 5K pace.", exercises:["Warm-up 2K","4x1K intervals (90s rest)","Cool-down 2K"] },
      { week:7, focus:"Long Run 14K", date:"Wk 7", rounds:4, duration:"80", notes:"Big week. Fuel and sleep well.", exercises:["14K long run","Recovery walk"] },
      { week:8, focus:"Race Simulation", date:"Wk 8", rounds:4, duration:"75", notes:"Run 10K at goal race pace.", exercises:["Warm-up 2K","10K at race pace","Cool-down 2K"] },
      { week:9, focus:"Long Run 17K", date:"Wk 9", rounds:4, duration:"100", notes:"Peak long run. Practise race nutrition.", exercises:["17K long run","Race pace last 3K"] },
      { week:10, focus:"Peak Week", date:"Wk 10", rounds:4, duration:"80", notes:"Highest volume week. Trust the process.", exercises:["Long run 18K","Tempo run 8K","Easy recovery runs"] },
      { week:11, focus:"Taper Begins", date:"Wk 11", rounds:3, duration:"50", notes:"Reduce volume. Keep sharpness.", exercises:["Easy 8K","Strides x4"] },
      { week:12, focus:"Race Week 🏅", date:"Wk 12", rounds:2, duration:"30", notes:"Stay loose. Trust your training.", exercises:["Easy 3K Tuesday","Rest + race day"] },
    ]
  },
  "Beginner Strength": {
    emoji: "💪", weeks: 8, desc: "Build foundational strength from scratch.",
    plan: [
      { week:1, focus:"Learn the Movements", date:"Wk 1", rounds:3, duration:"45", notes:"Focus on form over weight.", exercises:["Goblet Squat 3x12","Push-Ups 3x10","Dumbbell Row 3x10 each","Plank 3x30s"] },
      { week:2, focus:"Add Load", date:"Wk 2", rounds:3, duration:"45", notes:"Increase weight slightly if form is good.", exercises:["Goblet Squat 3x12","Push-Ups 3x12","Dumbbell Row 3x12","Dead Bug 3x10"] },
      { week:3, focus:"Upper Body Push", date:"Wk 3", rounds:3, duration:"50", notes:"Chest and shoulders focus.", exercises:["Bench Press 4x10","Overhead Press 3x10","Lateral Raises 3x15","Tricep Dips 3x12"] },
      { week:4, focus:"Lower Body", date:"Wk 4", rounds:3, duration:"50", notes:"Legs and glutes.", exercises:["Barbell Squat 4x10","Romanian Deadlift 3x10","Leg Press 3x12","Calf Raises 4x15"] },
      { week:5, focus:"Upper Body Pull", date:"Wk 5", rounds:3, duration:"50", notes:"Back and biceps.", exercises:["Pull-Ups or Lat Pulldown 4x8","Barbell Row 3x10","Face Pulls 3x15","Bicep Curls 3x12"] },
      { week:6, focus:"Full Body Power", date:"Wk 6", rounds:3, duration:"55", notes:"Compound movements only.", exercises:["Deadlift 4x6","Bench Press 4x8","Barbell Row 4x8","Overhead Press 3x8"] },
      { week:7, focus:"Volume Week", date:"Wk 7", rounds:4, duration:"60", notes:"More sets this week. Push hard.", exercises:["Squat 5x8","Bench Press 5x8","Deadlift 3x5","Pull-Ups 4x8"] },
      { week:8, focus:"Test Your Strength", date:"Wk 8", rounds:3, duration:"55", notes:"Find your working maxes.", exercises:["Squat 3RM test","Bench Press 3RM test","Deadlift 3RM test"] },
    ]
  },
  "Weight Loss": {
    emoji: "🔥", weeks: 12, desc: "Sustainable fat loss through training and nutrition.",
    plan: [
      { week:1, focus:"Build the Habit", date:"Wk 1", rounds:3, duration:"40", notes:"Consistency first.", exercises:["20 min cardio (walk/jog/bike)","Circuit: Squats 3x15, Push-Ups 3x10, Rows 3x10","Plank 3x30s"] },
      { week:2, focus:"Add Intensity", date:"Wk 2", rounds:4, duration:"45", notes:"Slightly harder this week.", exercises:["25 min cardio","Circuit: Squats 3x15, Lunges 3x12, Push-Ups 3x12","Plank 3x40s"] },
      { week:3, focus:"HIIT Introduction", date:"Wk 3", rounds:4, duration:"45", notes:"One HIIT session this week.", exercises:["HIIT: 20s on / 10s off x 8 rounds","Steady cardio 20 mins x 2 sessions","Strength circuit"] },
      { week:4, focus:"Strength + Cardio", date:"Wk 4", rounds:4, duration:"50", notes:"More muscle = more burn.", exercises:["Deadlift 3x12","Bench Press 3x12","20 min steady cardio","HIIT 15 mins"] },
      { week:5, focus:"Push the Cardio", date:"Wk 5", rounds:4, duration:"50", notes:"30 min cardio sessions now.", exercises:["30 min run/bike/row","Full body strength 3x12","HIIT finisher 10 mins"] },
      { week:6, focus:"Mid-Point Check", date:"Wk 6", rounds:4, duration:"50", notes:"How's progress? Adjust nutrition if needed.", exercises:["30 min cardio","Full body strength","Active recovery walk"] },
      { week:7, focus:"Increase Strength", date:"Wk 7", rounds:4, duration:"55", notes:"Heavier weights, fewer reps.", exercises:["Squat 4x8","Deadlift 4x8","Upper body 4x10","25 min cardio"] },
      { week:8, focus:"HIIT Focus", date:"Wk 8", rounds:4, duration:"50", notes:"2x HIIT sessions this week.", exercises:["HIIT 20 mins x2","Strength 3x10","30 min steady cardio"] },
      { week:9, focus:"Peak Volume", date:"Wk 9", rounds:5, duration:"55", notes:"Biggest training week. Fuel well.", exercises:["5x sessions alternating strength and cardio","HIIT finisher on strength days"] },
      { week:10, focus:"Maintain Momentum", date:"Wk 10", rounds:4, duration:"55", notes:"Results are compounding.", exercises:["Full body strength 4x10","35 min cardio","2x HIIT"] },
      { week:11, focus:"Stay Consistent", date:"Wk 11", rounds:4, duration:"50", notes:"Habits locked in by now.", exercises:["Strength 4x10","30 min cardio","Active recovery"] },
      { week:12, focus:"Final Week 🔥", date:"Wk 12", rounds:4, duration:"50", notes:"Finish strong. Set next goals.", exercises:["Full body strength test","5K time trial","Progress check"] },
    ]
  }
};

// ── GOAL DEFAULTS BY GOAL TYPE ────────────────────────────────────────────────
var GOAL_DEFAULTS = {
  "Hyrox": [
    { name:"Race Time", target:"", current:"", unit:"mm:ss", category:"Hyrox" },
    { name:"Farmers Carry (each hand)", target:"", current:"", unit:"kg", category:"Hyrox" },
  ],
  "Marathon / Running": [
    { name:"5K Time", target:"", current:"", unit:"mm:ss", category:"Running" },
    { name:"10K Time", target:"", current:"", unit:"mm:ss", category:"Running" },
    { name:"Weekly Distance", target:"", current:"", unit:"km", category:"Running" },
  ],
  "Strength & Muscle": [
    { name:"Bench Press 1RM", target:"", current:"", unit:"kg", category:"Strength" },
    { name:"Squat 1RM", target:"", current:"", unit:"kg", category:"Strength" },
    { name:"Deadlift 1RM", target:"", current:"", unit:"kg", category:"Strength" },
  ],
  "Weight Loss": [
    { name:"Target Weight", target:"", current:"", unit:"kg", category:"Body" },
    { name:"Daily Calories", target:"", current:"", unit:"kcal", category:"Nutrition" },
  ],
  "General Fitness": [
    { name:"Weekly Sessions", target:"4", current:"", unit:"sessions", category:"Fitness" },
  ],
};

// ── AI PLAN GENERATORS ────────────────────────────────────────────────────────
async function generateMyPlan(profile, transcript) {
  var prompt = "Create a personalised training programme as a JSON array. Return ONLY valid JSON, no markdown:\n[{\"week\":1,\"focus\":\"\",\"date\":\"\",\"rounds\":3,\"duration\":\"45\",\"notes\":\"\",\"exercises\":[]}]\n\nMake it specific, progressive, and right for this athlete:\n" + JSON.stringify(profile) + "\n\nConversation:\n" + transcript.slice(0, 2000);
  var result = await callAI([{ role:"user", content:prompt }], "Return only a valid JSON array. No markdown. No backticks.");
  return parseJsonSafe(result) || [];
}

async function generateHyroxPlan(profile, raceDate) {
  var weeks = weeksUntil(raceDate);
  if (!weeks || weeks < 1) return [];
  var prompt = "Create a Hyrox training programme for " + weeks + " weeks until race on " + raceDate + ". Return ONLY valid JSON array:\n[{\"week\":1,\"focus\":\"\",\"date\":\"\",\"rounds\":3,\"duration\":\"45\",\"notes\":\"\",\"exercises\":[]}]\n\nStructure: base → volume → race pace → taper → race week.\nInclude: Ski Erg, Burpee Broad Jump, Rowing, Farmers Carry (max 24kg each), Sandbag Lunges (max 30kg), Wall Balls (max 9kg), Running.\nFitness: " + (profile.fitnessLevel || "intermediate") + ", days/week: " + (profile.daysPerWeek || 3) + ". Always specify weights in exercises.";
  var result = await callAI([{ role:"user", content:prompt }], "Return only a valid JSON array. No markdown. No backticks.");
  return parseJsonSafe(result) || [];
}

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
function HR() { return <div style={{ height:1, background:C.border }} />; }

function Cap({ children, color, size, style }) {
  return <div style={{ fontSize:size||9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:color||C.muted, fontFamily:F, ...style }}>{children}</div>;
}

function Tag({ children, color }) {
  var col = color || C.accent;
  return <span style={{ display:"inline-block", padding:"2px 7px", fontSize:8, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:col, border:"1px solid "+col+"40", fontFamily:F }}>{children}</span>;
}

function Bar({ pct, color }) {
  return <div style={{ height:2, background:C.faint }}>
    <div style={{ height:2, width:Math.min(100, pct||0)+"%", background:color||C.accent, transition:"width .4s" }} />
  </div>;
}

function Btn({ children, onClick, disabled, outline, danger, full, small, style }) {
  var bg = danger ? "transparent" : outline ? "transparent" : disabled ? C.surface2 : C.accent;
  var col = danger ? C.danger : outline ? C.muted : disabled ? C.faint : "#000";
  var shadow = outline ? "inset 0 0 0 1px "+C.border : danger ? "inset 0 0 0 1px "+C.danger+"40" : "none";
  return <button onClick={onClick} disabled={disabled} style={{ padding:small?"6px 12px":"12px 18px", border:"none", cursor:disabled?"default":"pointer", fontFamily:F, fontSize:small?8:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", width:full?"100%":"auto", background:bg, color:col, boxShadow:shadow, ...style }}>{children}</button>;
}

function Inp({ value, onChange, placeholder, type, rows, onKeyDown, style }) {
  var base = { display:"block", width:"100%", boxSizing:"border-box", background:C.surface, border:"1px solid "+C.border, color:C.text, fontSize:14, fontFamily:F, padding:"10px 13px", outline:"none" };
  var st = { ...base, ...style };
  if (rows) return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{ ...st, resize:"none" }} />;
  return <input type={type||"text"} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} style={st} />;
}

function Sel({ value, onChange, children, style }) {
  return <select value={value} onChange={onChange} style={{ display:"block", width:"100%", boxSizing:"border-box", background:C.surface, border:"1px solid "+C.border, color:C.text, fontSize:13, fontFamily:F, padding:"10px 13px", outline:"none", appearance:"none", ...style }}>{children}</select>;
}

function Ring({ pct, primary, size }) {
  var p = pct || 0, sz = size || 48, col = primary || C.accent;
  var r = 18, circ = 2 * Math.PI * r, dash = Math.min((p / 100) * circ, circ);
  return <svg width={sz} height={sz} viewBox="0 0 48 48" style={{ flexShrink:0 }}>
    <circle cx="24" cy="24" r={r} fill="none" stroke={C.surface2} strokeWidth="4" />
    <circle cx="24" cy="24" r={r} fill="none" stroke={col} strokeWidth="4" strokeDasharray={dash+" "+circ} strokeLinecap="round" transform="rotate(-90 24 24)" />
    <text x="24" y="24" textAnchor="middle" dominantBaseline="central" style={{ fontSize:p>=100?7:8, fontWeight:700, fill:p>=100?col:C.text, fontFamily:F }}>{p>=100?"done":p+"%"}</text>
  </svg>;
}

function MsgContent({ text }) {
  var blocks = [];
  (text||"").trim().replace(/\n{3,}/g,"\n\n").split(/\n\n+/).forEach(b => {
    var tb = b.trim(); if (!tb) return;
    var lines = tb.split("\n").map(s=>s.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every(l=>/^[-*]\s/.test(l)) || lines.length===1) { blocks.push(tb); return; }
    lines.forEach(l => { if(l) blocks.push(l); });
  });
  function inline(str) {
    return str.split(/\*\*(.*?)\*\*/g).map((p,i) =>
      i%2===1 ? <strong key={i} style={{ fontWeight:800, color:C.text }}>{p}</strong> : p
    );
  }
  function renderBlock(block, bi) {
    var tr = block.trim(); if (!tr) return null;
    var lines = tr.split("\n").map(l=>l.trim()).filter(Boolean);
    if (/^###\s/.test(tr)) return <div key={bi} style={{ fontWeight:800, fontSize:11, color:C.accent, fontFamily:F, marginTop:12, marginBottom:5, letterSpacing:"0.1em", textTransform:"uppercase" }}>{tr.replace(/^###\s+/,"")}</div>;
    if (/^\*\*[^*]+\*\*[.:]?$/.test(tr)) return <div key={bi} style={{ fontWeight:800, fontSize:11, color:C.accent, fontFamily:F, marginTop:12, marginBottom:5, letterSpacing:"0.1em", textTransform:"uppercase" }}>{tr.replace(/^\*\*|\*\*[.:]?$/g,"")}</div>;
    var isList = lines.length >= 1 && lines.every(l=>/^[-*]\s/.test(l));
    if (isList) return <ul key={bi} style={{ margin:"4px 0 10px 0", padding:"0 0 0 16px", listStyle:"disc" }}>{lines.map((l,li)=><li key={li} style={{ marginBottom:5, fontSize:13, lineHeight:1.6, fontFamily:F, color:C.text }}>{inline(l.replace(/^[-*]\s+/,""))}</li>)}</ul>;
    return <p key={bi} style={{ margin:"0 0 9px 0", lineHeight:1.65, fontSize:13, fontFamily:F, color:C.text }}>{inline(tr)}</p>;
  }
  return <div>{blocks.map(renderBlock).filter(Boolean)}</div>;
}

// ── ECG PULSE CANVAS ──────────────────────────────────────────────────────────
function PulseCanvas() {
  var ref = useRef(null);
  useEffect(() => {
    var canvas = ref.current; if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W, H, off = 0, raf;
    function resize() {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    function ecgY(x, p) {
      var n = ((x + p) % W) / W, y = H / 2;
      if (n>.22&&n<.27) y -= Math.sin((n-.22)/.05*Math.PI)*4;
      else if (n>.30&&n<.31) y += 5;
      else if (n>.31&&n<.325) y -= ((n-.31)/.015)*26;
      else if (n>.325&&n<.34) y += ((n-.325)/.015)*15;
      else if (n>.34&&n<.355) y -= ((n-.34)/.015)*5;
      else if (n>.40&&n<.47) y -= Math.sin((n-.40)/.07*Math.PI)*8;
      return y;
    }
    function draw() {
      ctx.clearRect(0,0,W,H);
      ctx.save(); ctx.filter="blur(4px)"; ctx.strokeStyle="rgba(212,245,60,0.15)"; ctx.lineWidth=3;
      ctx.beginPath(); for(var x=0;x<=W;x++){var y=ecgY(x,off);x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);} ctx.stroke(); ctx.restore();
      ctx.strokeStyle="#d4f53c"; ctx.lineWidth=1.5;
      ctx.beginPath(); for(var x=0;x<=W;x++){var y=ecgY(x,off);x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);} ctx.stroke();
      var dx=(W*.6)%W, dy=ecgY(dx,off);
      ctx.beginPath(); ctx.arc(dx,dy,2.5,0,Math.PI*2); ctx.fillStyle="#d4f53c"; ctx.shadowColor="#d4f53c"; ctx.shadowBlur=10; ctx.fill(); ctx.shadowBlur=0;
      var fl=ctx.createLinearGradient(0,0,36,0); fl.addColorStop(0,"rgba(8,8,8,1)"); fl.addColorStop(1,"rgba(8,8,8,0)"); ctx.fillStyle=fl; ctx.fillRect(0,0,36,H);
      var fr=ctx.createLinearGradient(W-60,0,W,0); fr.addColorStop(0,"rgba(8,8,8,0)"); fr.addColorStop(1,"rgba(8,8,8,1)"); ctx.fillStyle=fr; ctx.fillRect(W-60,0,60,H);
      off=(off+0.7)%W; raf=requestAnimationFrame(draw);
    }
    resize(); window.addEventListener("resize", resize); draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ width:"100%", height:"100%", display:"block" }} />;
}

// ── ONBOARDING CHAT ───────────────────────────────────────────────────────────
function OnboardingChat({ userName, onComplete }) {
  var [msgs, setMsgs] = useState([]);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var [done, setDone] = useState(false);
  var [generating, setGenerating] = useState(false);
  var [genStatus, setGenStatus] = useState("");
  var scrollRef = useRef(null);

  var SYS = "You are a friendly expert personal trainer doing an initial assessment with " + userName + ". Have a natural back-and-forth conversation.\n\nCover these areas naturally (one or two at a time):\n1. Main goal — Hyrox, marathon/running, strength, weight loss, general fitness\n2. Current fitness level and training background\n3. Days per week and session length available\n4. Equipment — gym, home, outdoor\n5. Injuries or limitations\n6. Specific event or race — what and when (get the exact date)\n7. What's worked or not worked before\n\nBe warm, encouraging, conversational. Max 2-3 sentences. Sound like a real coach texting.\n\nWhen you have enough info (after 6-10 exchanges), end with exactly: [ASSESSMENT_COMPLETE]";

  useEffect(() => {
    setLoading(true);
    callAI([{ role:"user", content:"hi, just signed up" }], SYS).then(reply => {
      setMsgs([{ role:"assistant", content:reply.replace("[ASSESSMENT_COMPLETE]","").trim() }]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior:"smooth" }); }, [msgs, loading]);

  function send(text) {
    if (!text.trim() || loading || done) return;
    var updated = msgs.concat([{ role:"user", content:text.trim() }]);
    setMsgs(updated); setInput(""); setLoading(true);
    callAI(updated, SYS).then(reply => {
      var isComplete = reply.includes("[ASSESSMENT_COMPLETE]");
      var clean = reply.replace("[ASSESSMENT_COMPLETE]", "").trim();
      setMsgs(m => m.concat([{ role:"assistant", content:clean }]));
      setLoading(false);
      if (isComplete) { setDone(true); setTimeout(() => runGeneration(updated.concat([{ role:"assistant", content:clean }])), 800); }
    }).catch(() => setLoading(false));
  }

  async function runGeneration(conversation) {
    setGenerating(true);
    var transcript = conversation.map(m => m.role+": "+m.content).join("\n");
    setGenStatus("Analysing your assessment...");
    var profileStr = await callAI([{ role:"user", content:"Extract profile JSON. Return ONLY valid JSON:\n{\"goals\":[],\"fitnessLevel\":\"\",\"daysPerWeek\":3,\"sessionLength\":\"60 mins\",\"equipment\":[],\"injuries\":\"\",\"eventName\":\"\",\"eventDate\":\"\",\"age\":\"\",\"weight\":\"\"}\n\nConversation:\n"+transcript }], "Return only valid JSON. No markdown.").catch(() => "{}");
    var profile = parseJsonSafe(profileStr) || {};
    setGenStatus("Building your personalised plan...");
    var myPlan = await generateMyPlan(profile, transcript).catch(() => []);
    var hyroxPlan = [];
    var goals = (profile.goals||[]).map(g => g.toLowerCase());
    if (goals.some(g => g.includes("hyrox")) && profile.eventDate) {
      setGenStatus("Generating your Hyrox programme...");
      hyroxPlan = await generateHyroxPlan(profile, profile.eventDate).catch(() => []);
    }
    // Build goal targets from defaults
    var targets = [], id = 1;
    (profile.goals||[]).forEach(g => {
      var key = Object.keys(GOAL_DEFAULTS).find(k => g.toLowerCase().includes(k.toLowerCase().split(" ")[0]));
      if (key) GOAL_DEFAULTS[key].forEach(t => targets.push({ ...t, id: id++ }));
    });
    // Add race as competition
    var competitions = profile.eventDate ? [{ name: profile.eventName || "Race", date: profile.eventDate }] : [];
    setGenerating(false);
    onComplete({ profile, myPlan, hyroxPlan, targets, competitions });
  }

  if (generating) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:32, maxWidth:480, margin:"0 auto" }}>
      <div style={{ fontSize:36 }}>⚡</div>
      <div style={{ fontSize:18, fontWeight:800, color:C.text, fontFamily:F }}>Building your plan</div>
      <div style={{ fontSize:13, color:C.accent, fontFamily:F, textAlign:"center" }}>{genStatus}</div>
      <div style={{ width:"100%", maxWidth:300, height:2, background:C.border, marginTop:8 }}>
        <div style={{ height:2, background:C.accent, width:"60%", transition:"width 1s" }} />
      </div>
      <div style={{ fontSize:12, color:C.muted, fontFamily:F, textAlign:"center", lineHeight:1.6 }}>This takes about 30 seconds. Your personalised programme is being created.</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
      <div style={{ padding:"20px 20px 12px", borderBottom:"1px solid "+C.border, flexShrink:0 }}>
        <div style={{ fontSize:22, fontWeight:900, letterSpacing:"0.06em", color:C.text, fontFamily:F }}>PULSE</div>
        <Cap color={C.accent} style={{ marginTop:4 }}>Initial Assessment — tell us about yourself</Cap>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && <Cap style={{ marginBottom:4 }}>Coach</Cap>}
            <div style={{ maxWidth:"88%", padding:"12px 15px", background:m.role==="user"?C.accent:C.surface, color:m.role==="user"?"#000":C.text, border:"1px solid "+(m.role==="user"?C.accent:C.border), fontFamily:F, fontSize:14, lineHeight:1.65 }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}><Cap style={{ marginBottom:4 }}>Coach</Cap><div style={{ background:C.surface, border:"1px solid "+C.border, padding:"12px 15px", color:C.muted, fontFamily:F, fontSize:14 }}>...</div></div>}
        <div ref={scrollRef} />
      </div>
      {!done && (
        <div style={{ padding:"10px 20px 32px", borderTop:"1px solid "+C.border, background:C.bg, flexShrink:0 }}>
          <div style={{ display:"flex", gap:8 }}>
            <Inp value={input} onChange={e=>setInput(e.target.value)} placeholder="Type your answer..." style={{ flex:1 }} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);} }} />
            <button onClick={()=>send(input)} disabled={!input.trim()||loading} style={{ padding:"10px 16px", background:C.accent, border:"none", cursor:"pointer", fontFamily:F, fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#000", opacity:(!input.trim()||loading)?0.5:1, flexShrink:0 }}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WEEKLY CHECK-IN ───────────────────────────────────────────────────────────
function WeeklyCheckIn({ userId, userName, onComplete, onDismiss }) {
  var [msgs, setMsgs] = useState([]);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var [done, setDone] = useState(false);
  var scrollRef = useRef(null);
  var SYS = "You are a personal trainer doing a quick Monday check-in with "+userName+". Keep it brief — 3-4 exchanges max. Ask about last week, energy/soreness, anything to adjust. After enough info end with [CHECKIN_COMPLETE]. Be warm, 2 sentences max.";

  useEffect(() => {
    setLoading(true);
    callAI([{ role:"user", content:"Monday check-in" }], SYS).then(reply => {
      setMsgs([{ role:"assistant", content:reply.replace("[CHECKIN_COMPLETE]","").trim() }]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  function send(text) {
    if (!text.trim() || loading || done) return;
    var updated = msgs.concat([{ role:"user", content:text.trim() }]);
    setMsgs(updated); setInput(""); setLoading(true);
    callAI(updated, SYS).then(reply => {
      var isComplete = reply.includes("[CHECKIN_COMPLETE]");
      var clean = reply.replace("[CHECKIN_COMPLETE]","").trim();
      setMsgs(m => m.concat([{ role:"assistant", content:clean }]));
      setLoading(false);
      if (isComplete) setDone(true);
    }).catch(() => setLoading(false));
  }

  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:200, display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
      <div style={{ padding:"16px 20px", borderBottom:"1px solid "+C.border, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div><div style={{ fontSize:13, fontWeight:900, color:C.text, fontFamily:F }}>Weekly Check-In</div><Cap color={C.accent} style={{ marginTop:2 }}>Monday Reset</Cap></div>
        <button onClick={onDismiss} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:22, padding:0 }}>×</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && <Cap style={{ marginBottom:4 }}>Coach</Cap>}
            <div style={{ maxWidth:"88%", padding:"12px 15px", background:m.role==="user"?C.accent:C.surface, color:m.role==="user"?"#000":C.text, border:"1px solid "+(m.role==="user"?C.accent:C.border), fontFamily:F, fontSize:14, lineHeight:1.65 }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}><Cap style={{ marginBottom:4 }}>Coach</Cap><div style={{ background:C.surface, border:"1px solid "+C.border, padding:"12px 15px", color:C.muted, fontFamily:F, fontSize:14 }}>...</div></div>}
        <div ref={scrollRef} />
      </div>
      <div style={{ padding:"10px 20px 32px", borderTop:"1px solid "+C.border, background:C.bg, flexShrink:0 }}>
        {done ? (
          <Btn full onClick={() => { dbSave(userId,"last_checkin",getMonday()); onComplete(); }}>Done — Close Check-In</Btn>
        ) : (
          <div style={{ display:"flex", gap:8 }}>
            <Inp value={input} onChange={e=>setInput(e.target.value)} placeholder="How did last week go?" style={{ flex:1 }} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);} }} />
            <button onClick={()=>send(input)} disabled={!input.trim()||loading} style={{ padding:"10px 16px", background:C.accent, border:"none", cursor:"pointer", fontFamily:F, fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#000", opacity:(!input.trim()||loading)?0.5:1, flexShrink:0 }}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function SettingsOverlay({ user, profile, notifSettings, onClose, onUpdate, onNotifUpdate }) {
  var [section, setSection] = useState("profile");
  var [name, setName] = useState(profile.displayName||"");
  var [age, setAge] = useState(profile.age||"");
  var [weight, setWeight] = useState(profile.weight||"");
  var [eventName, setEventName] = useState(profile.eventName||"");
  var [eventDate, setEventDate] = useState(profile.eventDate||"");
  var [saved, setSaved] = useState(false);
  var [newPass, setNewPass] = useState(""); var [confirmPass, setConfirmPass] = useState("");
  var [passMsg, setPassMsg] = useState(""); var [passErr, setPassErr] = useState("");
  var [showNew, setShowNew] = useState(false); var [resetSent, setResetSent] = useState(false);

  function saveProfile() {
    onUpdate({ ...profile, displayName:name, age, weight, eventName, eventDate });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }
  async function changePassword() {
    setPassMsg(""); setPassErr("");
    if (!newPass || newPass.length < 6) { setPassErr("Minimum 6 characters."); return; }
    if (newPass !== confirmPass) { setPassErr("Passwords don't match."); return; }
    var res = await sb.auth.updateUser({ password:newPass });
    if (res.error) setPassErr(res.error.message); else { setPassMsg("Password updated!"); setNewPass(""); setConfirmPass(""); }
  }

  var pi = { display:"block", width:"100%", boxSizing:"border-box", background:C.surface, border:"1px solid "+C.border, color:C.text, fontSize:14, fontFamily:F, padding:"10px 44px 10px 13px", outline:"none" };
  var sections = [["profile","Profile"],["account","Account"],["notif","Notifications"],["apps","Apps"]];

  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:100, display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
      <div style={{ padding:"16px 20px", borderBottom:"1px solid "+C.border, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:900, letterSpacing:"0.1em", textTransform:"uppercase", color:C.text, fontFamily:F }}>Settings</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:22, padding:0, lineHeight:1 }}>×</button>
      </div>
      <div style={{ display:"flex", borderBottom:"1px solid "+C.border, flexShrink:0, overflowX:"auto" }}>
        {sections.map(s => (
          <button key={s[0]} onClick={()=>setSection(s[0])} style={{ flex:"0 0 auto", padding:"10px 14px", background:"none", border:"none", borderBottom:"2px solid "+(section===s[0]?C.accent:"transparent"), color:section===s[0]?C.accent:C.muted, fontSize:8, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", fontFamily:F, whiteSpace:"nowrap" }}>{s[1]}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
        {section==="profile" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:C.surface, border:"1px solid "+C.border, padding:"12px 14px" }}>
              <Cap style={{ marginBottom:4 }}>Training Goals</Cap>
              <div style={{ fontSize:13, color:C.accent, fontFamily:F, fontWeight:600, marginBottom:4 }}>{(profile.goals||[]).join(", ")||"Not set"}</div>
              <div style={{ fontSize:11, color:C.faint, fontFamily:F }}>Set during onboarding. Chat with your coach to update.</div>
            </div>
            <div><Cap style={{ marginBottom:6 }}>Display Name</Cap><Inp value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><Cap style={{ marginBottom:6 }}>Age</Cap><Inp type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g. 28" /></div>
              <div><Cap style={{ marginBottom:6 }}>Weight (kg)</Cap><Inp type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 80" /></div>
            </div>
            <div><Cap style={{ marginBottom:6 }}>Event / Race Name</Cap><Inp value={eventName} onChange={e=>setEventName(e.target.value)} placeholder="e.g. Hyrox London" /></div>
            <div><Cap style={{ marginBottom:6 }}>Event Date</Cap><input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} style={{ display:"block", width:"100%", boxSizing:"border-box", background:C.surface, border:"1px solid "+C.border, color:C.text, fontSize:14, fontFamily:F, padding:"10px 13px", outline:"none" }} /></div>
            <Btn onClick={saveProfile} full style={{ background:saved?C.green:C.accent }}>{saved?"Saved!":"Save Profile"}</Btn>
          </div>
        )}
        {section==="account" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ background:C.surface, border:"1px solid "+C.border, padding:14 }}><Cap style={{ marginBottom:4 }}>Email</Cap><div style={{ fontSize:14, color:C.text, fontFamily:F }}>{user.email}</div></div>
            <div>
              <Cap style={{ marginBottom:12 }}>Change Password</Cap>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ position:"relative" }}>
                  <input type={showNew?"text":"password"} value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="New password" style={pi} />
                  <button onClick={()=>setShowNew(!showNew)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:11, fontFamily:F, fontWeight:700, textTransform:"uppercase" }}>{showNew?"hide":"show"}</button>
                </div>
                <input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="Confirm new password" style={pi} />
                {passErr && <div style={{ fontSize:12, color:C.danger, fontFamily:F }}>{passErr}</div>}
                {passMsg && <div style={{ fontSize:12, color:C.green, fontFamily:F }}>{passMsg}</div>}
                <Btn onClick={changePassword} disabled={!newPass||!confirmPass} full>Update Password</Btn>
              </div>
            </div>
            <div style={{ borderTop:"1px solid "+C.border, paddingTop:20 }}>
              {resetSent ? <div style={{ fontSize:12, color:C.green, fontFamily:F }}>Reset email sent!</div> : <Btn outline onClick={async()=>{await sb.auth.resetPasswordForEmail(user.email);setResetSent(true);}} full>Send Reset Email</Btn>}
            </div>
            <div style={{ borderTop:"1px solid "+C.border, paddingTop:20 }}>
              <Btn danger onClick={()=>{sb.auth.signOut();onClose();}} full>Sign Out</Btn>
            </div>
          </div>
        )}
        {section==="notif" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.6, marginBottom:4 }}>Coach notifications appear as cards in your Coach tab.</div>
            {[["sunday","Sunday Week Summary","A review of how your week went every Sunday"],["nutrition","Nutrition Reminder","A nudge if you haven't logged food today"]].map(item => (
              <div key={item[0]} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 15px", background:C.surface, border:"1px solid "+C.border }}>
                <div style={{ flex:1, minWidth:0, paddingRight:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:F, marginBottom:3 }}>{item[1]}</div>
                  <div style={{ fontSize:11, color:C.muted, fontFamily:F }}>{item[2]}</div>
                </div>
                <button onClick={()=>onNotifUpdate(item[0],!notifSettings[item[0]])} style={{ width:42, height:24, borderRadius:12, background:notifSettings[item[0]]?C.accent:C.faint, border:"none", cursor:"pointer", position:"relative", flexShrink:0, transition:"background 0.2s" }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#000", position:"absolute", top:3, left:notifSettings[item[0]]?21:3, transition:"left 0.2s" }} />
                </button>
              </div>
            ))}
          </div>
        )}
        {section==="apps" && (
          <div style={{ background:C.surface, border:"1px solid "+C.border, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:F, marginBottom:6 }}>Strava</div>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:14 }}>Connect to import your runs automatically.</div>
            <button style={{ display:"block", width:"100%", padding:"12px", background:C.orange, border:"none", color:"#fff", fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", fontFamily:F }}>Connect with Strava</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  var [mode, setMode] = useState("login");
  var [email, setEmail] = useState(""); var [pass, setPass] = useState(""); var [name, setName] = useState("");
  var [err, setErr] = useState(""); var [loading, setLoading] = useState(false); var [showPass, setShowPass] = useState(false);

  async function doLogin() {
    setLoading(true); setErr("");
    var res = await sb.auth.signInWithPassword({ email:email.trim(), password:pass });
    if (res.error) { setErr(res.error.message); setLoading(false); return; }
    onAuth(res.data.user);
  }
  async function doSignup() {
    if (!name.trim()) { setErr("Enter your name."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setLoading(true); setErr("");
    var res = await sb.auth.signUp({ email:email.trim(), password:pass, options:{ data:{ display_name:name.trim() } } });
    if (res.error) { setErr(res.error.message); setLoading(false); return; }
    if (res.data.user && !res.data.session) setMode("confirm");
    else if (res.data.user) onAuth(res.data.user);
    setLoading(false);
  }

  if (mode==="confirm") return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
      <div style={{ width:"100%", maxWidth:360, textAlign:"center" }}>
        <div style={{ fontSize:32, fontWeight:900, color:C.accent, fontFamily:F, marginBottom:16 }}>Check your email</div>
        <div style={{ fontSize:14, color:C.muted, fontFamily:F, lineHeight:1.6 }}>Confirmation sent to <strong style={{ color:C.text }}>{email}</strong>. Click it then log in.</div>
        <button onClick={()=>setMode("login")} style={{ marginTop:24, background:"none", border:"none", color:C.muted, fontSize:12, cursor:"pointer", fontFamily:F, textDecoration:"underline" }}>Back to login</button>
      </div>
    </div>
  );

  var psi = { display:"block", width:"100%", boxSizing:"border-box", background:C.surface, border:"1px solid "+C.border, color:C.text, fontSize:14, fontFamily:F, padding:"10px 50px 10px 13px", outline:"none" };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
      <div style={{ width:"100%", maxWidth:360 }}>
        <div style={{ marginBottom:40 }}>
          <div style={{ fontSize:40, fontWeight:900, letterSpacing:"0.06em", color:C.text, fontFamily:F, lineHeight:1 }}>PULSE</div>
          <Cap color={C.muted} style={{ marginTop:8 }}>Train smarter. Race ready.</Cap>
        </div>
        <div style={{ display:"flex", marginBottom:24, borderBottom:"1px solid "+C.border }}>
          {[["login","Log In"],["signup","Sign Up"]].map(item => (
            <button key={item[0]} onClick={()=>{setMode(item[0]);setErr("");}} style={{ flex:1, padding:"10px 0", background:"none", border:"none", borderBottom:"2px solid "+(mode===item[0]?C.accent:"transparent"), color:mode===item[0]?C.accent:C.muted, fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", fontFamily:F }}>{item[1]}</button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode==="signup" && <div><Cap style={{ marginBottom:5 }}>Your Name</Cap><Inp value={name} onChange={e=>setName(e.target.value)} placeholder="First name" /></div>}
          <div><Cap style={{ marginBottom:5 }}>Email</Cap><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" onKeyDown={e=>{ if(e.key==="Enter") mode==="login"?doLogin():doSignup(); }} /></div>
          <div>
            <Cap style={{ marginBottom:5 }}>Password</Cap>
            <div style={{ position:"relative" }}>
              <input type={showPass?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder={mode==="signup"?"Minimum 6 characters":"Your password"} onKeyDown={e=>{ if(e.key==="Enter") mode==="login"?doLogin():doSignup(); }} style={psi} />
              <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:11, fontFamily:F, fontWeight:700, textTransform:"uppercase" }}>{showPass?"hide":"show"}</button>
            </div>
          </div>
          {err && <div style={{ fontSize:12, color:C.danger, fontFamily:F, padding:"8px 12px", background:C.danger+"15", border:"1px solid "+C.danger+"40" }}>{err}</div>}
          <Btn onClick={mode==="login"?doLogin:doSignup} disabled={loading||!email.trim()||!pass} full style={{ marginTop:4 }}>{loading?"...":(mode==="login"?"Log In":"Create Account")}</Btn>
          {mode==="login" && <button onClick={async()=>{ if(!email.trim()){setErr("Enter your email first.");return;} await sb.auth.resetPasswordForEmail(email.trim()); setErr("Password reset email sent!"); }} style={{ background:"none", border:"none", color:C.faint, fontSize:11, cursor:"pointer", fontFamily:F, textAlign:"center", padding:"4px 0" }}>Forgot password?</button>}
        </div>
      </div>
    </div>
  );
}

// ── HOME TAB ──────────────────────────────────────────────────────────────────
function HomeTab({ sessions, userProfile, competitions, onUpdateCompetitions }) {
  var goals = (userProfile && userProfile.goals) || [];
  var greeting = (() => { var h = new Date().getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; })();
  var displayName = (userProfile && userProfile.displayName) || "Athlete";
  var firstComp = competitions && competitions[0];
  var daysLeft = firstComp ? daysUntil(firstComp.date) : null;

  // Week context
  var weekSessions = sessions.filter(s => s.date >= getMonday());

  function addCompetition() {
    onUpdateCompetitions([...(competitions||[]), { name:"", date:"" }]);
  }
  function updateComp(i, field, val) {
    var updated = (competitions||[]).map((c,ci) => ci===i ? { ...c, [field]:val } : c);
    onUpdateCompetitions(updated);
  }
  function removeComp(i) {
    onUpdateCompetitions((competitions||[]).filter((_,ci) => ci!==i));
  }

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ padding:"22px 20px 0" }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:C.accent, marginBottom:6 }}>{greeting}</div>
        <div style={{ fontSize:26, fontWeight:900, letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:4 }}>Hey {displayName} 👋</div>
        <div style={{ fontSize:13, color:C.muted, lineHeight:1.5, paddingBottom:18 }}>
          {goals.length > 0 ? "Training for "+goals.join(" & ")+". Let's go." : "Welcome to Pulse. Let's get you training."}
        </div>
      </div>
      <div style={{ height:52, position:"relative", overflow:"hidden", borderTop:"1px solid "+C.border, borderBottom:"1px solid "+C.border, background:C.bg }}>
        <PulseCanvas />
        <div style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:C.accent, animation:"blink 1.2s ease-in-out infinite" }} />
          <span style={{ fontSize:10, fontWeight:700, color:C.accent }}>Active</span>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      <div style={{ display:"flex", borderBottom:"1px solid "+C.border }}>
        {[
          [sessions.length, "Sessions", C.accent],
          [weekSessions.length, "This week", C.text],
          [daysLeft !== null ? daysLeft : "—", "Days to race", daysLeft !== null ? C.accent : C.muted],
        ].map(([val, lbl, col]) => (
          <div key={lbl} style={{ flex:1, padding:"12px 0", textAlign:"center", borderRight:"1px solid "+C.border }}>
            <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.03em", lineHeight:1, color:col }}>{val}</div>
            <div style={{ fontSize:8, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted, marginTop:3 }}>{lbl}</div>
          </div>
        ))}
        <div style={{ flex:1, padding:"12px 0", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.03em", lineHeight:1 }}>{sessions.length > 0 ? sessions.slice(-1)[0].type.split(" ")[0] : "—"}</div>
          <div style={{ fontSize:8, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted, marginTop:3 }}>Last session</div>
        </div>
      </div>

      {/* Competitions */}
      <div style={{ borderBottom:"1px solid "+C.border }}>
        <div style={{ padding:"16px 20px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <Cap>Competitions</Cap>
          <button onClick={addCompetition} style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.accent, background:"none", border:"none", cursor:"pointer" }}>+ Add</button>
        </div>
        {(competitions||[]).length === 0 && (
          <div style={{ padding:"0 20px 16px", fontSize:12, color:C.faint, fontFamily:F }}>No competitions added yet. Tap + Add to set a race date.</div>
        )}
        {(competitions||[]).map((comp, i) => (
          <div key={i} style={{ margin:"0 20px 12px", background:C.surface, border:"1px solid "+C.border, borderLeft:"2px solid "+C.accent, padding:"12px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <input value={comp.name} onChange={e=>updateComp(i,"name",e.target.value)} placeholder="Competition name" style={{ background:"transparent", border:"none", borderBottom:"1px solid "+C.border, color:C.text, fontSize:13, fontWeight:700, fontFamily:F, outline:"none", flex:1, padding:"0 0 2px" }} />
              <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, marginLeft:10 }}>
                {comp.date && <div style={{ fontSize:20, fontWeight:900, color:C.accent, fontFamily:F }}>{daysUntil(comp.date)}<span style={{ fontSize:9, color:C.muted, marginLeft:2 }}>days</span></div>}
                <button onClick={()=>removeComp(i)} style={{ background:"none", border:"none", color:C.faint, cursor:"pointer", fontSize:16, padding:0 }}>×</button>
              </div>
            </div>
            <input type="date" value={comp.date} onChange={e=>updateComp(i,"date",e.target.value)} style={{ background:C.s2, border:"1px solid "+C.border, color:C.muted, fontSize:11, fontFamily:F, padding:"6px 10px", outline:"none", width:"100%", boxSizing:"border-box" }} />
          </div>
        ))}
      </div>

      {/* Coach nudge */}
      <div style={{ borderBottom:"1px solid "+C.border }}>
        <div style={{ padding:"16px 20px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <Cap>Coach</Cap>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 16px 16px", background:C.surface, borderTop:"1px solid "+C.border, borderLeft:"2px solid "+C.accent, margin:"0 20px 16px" }}>
          <div style={{ width:26, height:26, background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>⚡</div>
          <div>
            <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>
              {goals.includes("Hyrox") || goals.some(g=>g.toLowerCase().includes("hyrox"))
                ? '"Focus on consistent effort this week. Ask me anything about nutrition or your programme."'
                : '"Consistency is everything. What are you training today? I\'m here to help."'}
            </div>
            <button style={{ fontSize:9, fontWeight:700, color:C.accent, background:"none", border:"none", cursor:"pointer", padding:"6px 0 0", letterSpacing:"0.08em", textTransform:"uppercase" }}>Ask coach something →</button>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div style={{ paddingBottom:8 }}>
          <div style={{ padding:"16px 20px 10px" }}>
            <Cap>Recent Sessions</Cap>
          </div>
          {sessions.slice(-3).reverse().map((s, i) => (
            <div key={i} style={{ padding:"12px 20px", borderBottom:"1px solid "+C.border, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, fontFamily:F }}>{s.type}</div>
                <Cap style={{ marginTop:2 }}>{s.date}</Cap>
              </div>
              {s.totalTime && s.totalTime !== "--" && <div style={{ fontSize:16, fontWeight:900, color:C.accent, fontFamily:F }}>{s.totalTime}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SESSIONS TAB ──────────────────────────────────────────────────────────────
function SessionsTab({ sessions, onDelete }) {
  var [openId, setOpenId] = useState(null);
  var sorted = sessions.slice().sort((a,b) => b.date.localeCompare(a.date));
  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ padding:"28px 20px 20px" }}>
        <Cap>Training Log</Cap>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, marginTop:6 }}>
          <div style={{ fontSize:52, fontWeight:900, letterSpacing:"-0.04em", lineHeight:1, color:C.text, fontFamily:F }}>{sessions.length}</div>
          <div style={{ color:C.muted, fontSize:13, fontFamily:F }}>sessions logged</div>
        </div>
      </div>
      <HR />
      {sorted.length===0 && <div style={{ padding:"40px 20px", textAlign:"center", fontSize:13, color:C.muted, fontFamily:F }}>No sessions yet. Head to Train to log your first.</div>}
      {sorted.map(s => {
        var isOpen = openId===s.id, dur = fmtDur(s.duration), hasTime = s.totalTime && s.totalTime!=="--";
        return (
          <div key={s.id}>
            <button onClick={()=>setOpenId(isOpen?null:s.id)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:F, gap:12 }}>
              <div style={{ textAlign:"left", flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{s.type}</div>
                <Cap style={{ marginTop:3 }}>{s.date}{dur?" — "+dur:""} · {s.rounds} round{s.rounds!==1?"s":""}</Cap>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                {hasTime && <div style={{ fontSize:18, fontWeight:900, color:C.accent, fontFamily:F }}>{s.totalTime}</div>}
                {!hasTime && dur && <div style={{ fontSize:13, color:C.muted, fontFamily:F }}>{dur}</div>}
                <Cap color={C.faint}>{isOpen?"^":"v"}</Cap>
              </div>
            </button>
            {isOpen && (
              <div style={{ background:C.surface, borderTop:"1px solid "+C.border, borderBottom:"1px solid "+C.border, padding:"14px 20px" }}>
                {s.notes && <div style={{ color:C.muted, fontSize:13, fontStyle:"italic", marginBottom:12, fontFamily:F }}>"{s.notes}"</div>}
                {Object.keys(s.weights||{}).filter(k=>s.weights[k]).length>0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                    {Object.keys(s.weights).filter(k=>s.weights[k]).map(k => (
                      <div key={k} style={{ background:C.surface2, border:"1px solid "+C.border, padding:"8px 10px" }}>
                        <div style={{ fontSize:16, fontWeight:900, color:C.text, fontFamily:F }}>{s.weights[k]}<span style={{ fontSize:9, color:C.muted }}>kg</span></div>
                        <Cap style={{ marginTop:2 }}>{k}</Cap>
                      </div>
                    ))}
                  </div>
                )}
                {(s.exercises||[]).map((ex,i) => (
                  <div key={i} style={{ marginBottom:10 }}>
                    <Cap color={C.text} size={10} style={{ marginBottom:5 }}>{ex.name}</Cap>
                    {(ex.sets||[]).map((set,j) => (
                      <div key={j} style={{ display:"flex", gap:10, alignItems:"center", paddingBottom:5, borderBottom:"1px solid "+C.faint, marginBottom:5 }}>
                        <Cap color={C.faint}>S{j+1}</Cap>
                        {set.reps && <span style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:F }}>{set.reps} <span style={{ color:C.muted, fontWeight:400 }}>reps</span></span>}
                        {set.weight && <span style={{ background:C.surface2, border:"1px solid "+C.border, padding:"2px 8px", fontSize:11, color:C.muted, fontFamily:F }}>{set.weight}</span>}
                      </div>
                    ))}
                  </div>
                ))}
                {s.runData && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
                    {[["Dist",s.runData.distance+"km"],["Time",s.runData.time],["Pace",s.runData.pace||"--"]].map(item => (
                      <div key={item[0]} style={{ background:C.surface2, border:"1px solid "+C.border, padding:"8px 10px" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:item[0]==="Pace"?C.accent:C.text, fontFamily:F }}>{item[1]}</div>
                        <Cap>{item[0]}</Cap>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={()=>onDelete(s.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.faint, fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:F, padding:0, marginTop:4 }}>Delete</button>
              </div>
            )}
            <HR />
          </div>
        );
      })}
    </div>
  );
}

// ── TRAIN TAB ─────────────────────────────────────────────────────────────────
function TrainTab({ onSave }) {
  var [sub, setSub] = useState("strength");
  var [sDate, setSDate] = useState(getToday()); var [sType, setSType] = useState("Strength"); var [sDur, setSDur] = useState("");
  var [exs, setExs] = useState([{ name:"", sets:[{ weight:"", reps:"" }] }]);
  var [sSaved, setSSaved] = useState(false);
  var [hDate, setHDate] = useState(getToday()); var [hTime, setHTime] = useState(""); var [hRounds, setHRounds] = useState("3");
  var [hWB, setHWB] = useState(""); var [hFC, setHFC] = useState(""); var [hLunge, setHLunge] = useState(""); var [hSki, setHSki] = useState(""); var [hNotes, setHNotes] = useState("");
  var [hSaved, setHSaved] = useState(false);
  var [rDate, setRDate] = useState(getToday()); var [rType, setRType] = useState("Easy Run"); var [rDist, setRDist] = useState(""); var [rTime, setRTime] = useState(""); var [rNotes, setRNotes] = useState("");
  var [rSaved, setRSaved] = useState(false);
  var [otherType, setOtherType] = useState(""); var [otherDate, setOtherDate] = useState(getToday()); var [otherDur, setOtherDur] = useState(""); var [otherNotes, setOtherNotes] = useState("");
  var [otherSaved, setOtherSaved] = useState(false);

  function addEx() { setExs(e => e.concat([{ name:"", sets:[{ weight:"", reps:"" }] }])); }
  function remEx(i) { setExs(e => e.filter((_,x)=>x!==i)); }
  function setN(i,v) { setExs(e => e.map((ex,x) => x===i ? { ...ex, name:v } : ex)); }
  function addSet(i) { setExs(e => e.map((ex,x) => x===i ? { ...ex, sets:ex.sets.concat([{ weight:"", reps:"" }]) } : ex)); }
  function remSet(i,j) { setExs(e => e.map((ex,x) => x===i ? { ...ex, sets:ex.sets.filter((_,y)=>y!==j) } : ex)); }
  function upSet(i,j,f,v) { setExs(e => e.map((ex,x) => x===i ? { ...ex, sets:ex.sets.map((s,y) => y===j ? { ...s, [f]:v } : s) } : ex)); }

  function saveStrength() {
    var filled = exs.filter(ex=>ex.name.trim()).map(ex => ({ name:ex.name.trim(), sets:ex.sets.filter(s=>s.reps||s.weight).map(s=>({ reps:s.reps?parseInt(s.reps):null, weight:s.weight?s.weight+"kg":null })) }));
    if (!filled.length) return;
    onSave({ id:Date.now()+"", date:sDate, type:sType, totalTime:"--", duration:sDur||"--", rounds:1, notes:filled.map(e=>e.name).join(", "), weights:{}, exercises:filled })
      .then(() => { setSSaved(true); setExs([{ name:"", sets:[{ weight:"", reps:"" }] }]); setSDur(""); setTimeout(()=>setSSaved(false),2500); });
  }
  function saveHyrox() {
    if (!hTime) return;
    onSave({ id:Date.now()+"", date:hDate, type:"Hyrox Session", totalTime:hTime, duration:hTime, rounds:parseInt(hRounds)||3, notes:hNotes, weights:{ "Wall Balls":hWB, "Farmers Carry":hFC, "Lunge Bag":hLunge, "Ski Erg 500m":hSki }, exercises:[] })
      .then(() => { setHSaved(true); setHTime(""); setHWB(""); setHFC(""); setHLunge(""); setHSki(""); setHNotes(""); setTimeout(()=>setHSaved(false),2500); });
  }
  var rPace = null;
  if (rDist && rTime && rTime.includes(":")) { try { rPace = calcPace(rDist, rTime); } catch(e) {} }
  function saveRun() {
    if (!rDist || !rTime) return;
    onSave({ id:Date.now()+"", date:rDate, type:rType, totalTime:rTime, duration:rTime, rounds:1, notes:[rNotes, rPace?"Pace: "+rPace:null].filter(Boolean).join(" — "), weights:{}, exercises:[], runData:{ distance:parseFloat(rDist), time:rTime, pace:rPace } })
      .then(() => { setRSaved(true); setRDist(""); setRTime(""); setRNotes(""); setTimeout(()=>setRSaved(false),2500); });
  }
  function saveOther() {
    if (!otherType.trim()) return;
    onSave({ id:Date.now()+"", date:otherDate, type:otherType.trim(), totalTime:"--", duration:otherDur||"--", rounds:1, notes:otherNotes, weights:{}, exercises:[] })
      .then(() => { setOtherSaved(true); setOtherType(""); setOtherDur(""); setOtherNotes(""); setTimeout(()=>setOtherSaved(false),2500); });
  }

  var di = { display:"block", width:"100%", boxSizing:"border-box", background:C.surface, border:"1px solid "+C.border, color:C.text, fontSize:14, fontFamily:F, padding:"10px 13px", outline:"none" };
  var TABS_T = [["strength","Strength"],["hyrox","Hyrox"],["run","Run"],["other","Other"]];

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ padding:"28px 20px 16px" }}><Cap>Log Session</Cap><div style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.03em", color:C.text, marginTop:6, fontFamily:F }}>Train</div></div>
      <HR />
      <div style={{ display:"flex", borderBottom:"1px solid "+C.border, overflowX:"auto" }}>
        {TABS_T.map(([id,lbl]) => (
          <button key={id} onClick={()=>setSub(id)} style={{ flex:"0 0 auto", padding:"11px 18px", background:"none", border:"none", borderBottom:"2px solid "+(sub===id?C.accent:"transparent"), color:sub===id?C.accent:C.muted, fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", fontFamily:F, whiteSpace:"nowrap" }}>{lbl}</button>
        ))}
      </div>

      {sub==="strength" && (
        <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:12 }}>
          <div><Cap style={{ marginBottom:5 }}>Date</Cap><input type="date" value={sDate} onChange={e=>setSDate(e.target.value)} style={di} /></div>
          <div><Cap style={{ marginBottom:5 }}>Type</Cap><Sel value={sType} onChange={e=>setSType(e.target.value)}><option>Strength</option><option>Cardio</option><option>Mixed</option><option>Other</option></Sel></div>
          <div><Cap style={{ marginBottom:5 }}>Duration</Cap><Inp value={sDur} onChange={e=>setSDur(e.target.value)} placeholder="e.g. 1:00:00 (optional)" /></div>
          <HR />
          {exs.map((ex,i) => (
            <div key={i} style={{ background:C.surface, border:"1px solid "+C.border }}>
              <div style={{ padding:"10px 12px", display:"flex", gap:8, borderBottom:"1px solid "+C.border, alignItems:"center" }}>
                <Inp value={ex.name} onChange={e=>setN(i,e.target.value)} placeholder="Exercise name" style={{ flex:1 }} />
                {exs.length>1 && <button onClick={()=>remEx(i)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14, flexShrink:0 }}>×</button>}
              </div>
              <div style={{ padding:"8px 12px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"20px 1fr 1fr 20px", gap:8, marginBottom:6, alignItems:"center" }}><Cap color={C.faint}>#</Cap><Cap>kg</Cap><Cap>Reps</Cap><span /></div>
                {ex.sets.map((s,j) => (
                  <div key={j} style={{ display:"grid", gridTemplateColumns:"20px 1fr 1fr 20px", gap:8, marginBottom:6, alignItems:"center" }}>
                    <Cap color={C.faint} style={{ textAlign:"center" }}>{j+1}</Cap>
                    <Inp type="number" value={s.weight} placeholder="kg" onChange={e=>upSet(i,j,"weight",e.target.value)} />
                    <Inp type="number" value={s.reps} placeholder="reps" onChange={e=>upSet(i,j,"reps",e.target.value)} />
                    {ex.sets.length>1 ? <button onClick={()=>remSet(i,j)} style={{ background:"none", border:"none", color:C.faint, cursor:"pointer", fontSize:10 }}>×</button> : <span />}
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderTop:"1px solid "+C.border }}>
                <button onClick={()=>addSet(i)} style={{ padding:"8px 0", background:"none", border:"none", borderRight:"1px solid "+C.border, fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted, cursor:"pointer", fontFamily:F }}>+ Set</button>
                <button onClick={()=>setExs(e=>e.map((ex,x)=>x===i?{...ex,sets:ex.sets.concat([{...ex.sets[ex.sets.length-1]}])}:ex))} style={{ padding:"8px 0", background:"none", border:"none", fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted, cursor:"pointer", fontFamily:F }}>Repeat</button>
              </div>
            </div>
          ))}
          <Btn outline onClick={addEx} full>+ Add Exercise</Btn>
          <Btn onClick={saveStrength} full style={{ background:sSaved?C.green:C.accent }}>{sSaved?"Saved!":"Save Session"}</Btn>
        </div>
      )}

      {sub==="hyrox" && (
        <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:12 }}>
          <div><Cap style={{ marginBottom:5 }}>Date</Cap><input type="date" value={hDate} onChange={e=>setHDate(e.target.value)} style={di} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10 }}>
            <div><Cap style={{ marginBottom:5 }}>Total Time</Cap><Inp value={hTime} onChange={e=>setHTime(e.target.value)} placeholder="e.g. 47:32" /></div>
            <div><Cap style={{ marginBottom:5 }}>Rounds</Cap><Inp type="number" value={hRounds} onChange={e=>setHRounds(e.target.value)} /></div>
          </div>
          <Cap>Weights Used (kg)</Cap>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><Cap style={{ marginBottom:5 }}>Wall Balls (max 9kg)</Cap><Inp type="number" value={hWB} onChange={e=>setHWB(e.target.value)} placeholder="kg" /></div>
            <div><Cap style={{ marginBottom:5 }}>Farmers Carry (each)</Cap><Inp type="number" value={hFC} onChange={e=>setHFC(e.target.value)} placeholder="kg" /></div>
            <div><Cap style={{ marginBottom:5 }}>Lunge Bag (max 30kg)</Cap><Inp type="number" value={hLunge} onChange={e=>setHLunge(e.target.value)} placeholder="kg" /></div>
            <div><Cap style={{ marginBottom:5 }}>Ski Erg 500m time</Cap><Inp value={hSki} onChange={e=>setHSki(e.target.value)} placeholder="e.g. 2:10" /></div>
          </div>
          <div><Cap style={{ marginBottom:5 }}>Notes</Cap><Inp value={hNotes} onChange={e=>setHNotes(e.target.value)} placeholder="How did it feel?" rows={2} /></div>
          <Btn onClick={saveHyrox} disabled={!hTime} full style={{ background:hSaved?C.green:C.accent }}>{hSaved?"Saved!":"Save Session"}</Btn>
        </div>
      )}

      {sub==="run" && (
        <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:C.surface, border:"1px solid "+C.border, padding:16 }}>
            <Cap style={{ marginBottom:12 }}>Log Manually</Cap>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div><Cap style={{ marginBottom:5 }}>Date</Cap><input type="date" value={rDate} onChange={e=>setRDate(e.target.value)} style={di} /></div>
              <div><Cap style={{ marginBottom:5 }}>Run Type</Cap><Sel value={rType} onChange={e=>setRType(e.target.value)}><option>Easy Run</option><option>Tempo Run</option><option>Intervals</option><option>Long Run</option><option>5K Race</option><option>10K Race</option><option>Half Marathon</option><option>Marathon</option></Sel></div>
              <div><Cap style={{ marginBottom:5 }}>Distance (km)</Cap><Inp type="number" value={rDist} onChange={e=>setRDist(e.target.value)} placeholder="e.g. 5.0" /></div>
              <div><Cap style={{ marginBottom:5 }}>Time</Cap><Inp value={rTime} onChange={e=>setRTime(e.target.value)} placeholder="e.g. 25:30" /></div>
              {rPace && (
                <div style={{ background:C.accentDim, border:"1px solid "+C.accent+"30", padding:"12px 14px", display:"flex", justifyContent:"space-between" }}>
                  <div><Cap>Pace</Cap><div style={{ fontSize:20, fontWeight:900, color:C.accent, fontFamily:F, marginTop:2 }}>{rPace}</div></div>
                  <div style={{ textAlign:"right" }}><Cap>Total</Cap><div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:F, marginTop:2 }}>{totalMins(rTime)||rTime}</div></div>
                </div>
              )}
              <div><Cap style={{ marginBottom:5 }}>Notes</Cap><Inp value={rNotes} onChange={e=>setRNotes(e.target.value)} placeholder="Route, how it felt" rows={2} /></div>
              <Btn onClick={saveRun} disabled={!rDist||!rTime} full style={{ background:rSaved?C.green:C.accent }}>{rSaved?"Saved!":"Save Run"}</Btn>
            </div>
          </div>
          <div style={{ background:C.surface, border:"1px solid "+C.border, padding:20, textAlign:"center" }}>
            <div style={{ fontSize:26, marginBottom:8 }}>🏃</div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:5 }}>Connect Strava</div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:14, lineHeight:1.5 }}>Import your recent runs directly.</div>
            <button style={{ display:"block", width:"100%", padding:"12px", background:C.orange, border:"none", color:"#fff", fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", fontFamily:F }}>Connect with Strava</button>
          </div>
        </div>
      )}

      {sub==="other" && (
        <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:12 }}>
          <div><Cap style={{ marginBottom:5 }}>Activity Type</Cap><Inp value={otherType} onChange={e=>setOtherType(e.target.value)} placeholder="e.g. Padel, Pilates, Swimming, Yoga..." /></div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {["Padel","Pilates","Swimming","Yoga","Cycling","Mobility"].map(a => (
              <button key={a} onClick={()=>setOtherType(a)} style={{ padding:"5px 10px", background:"none", border:"1px solid "+C.border, color:C.muted, fontSize:9, fontWeight:600, cursor:"pointer", fontFamily:F }}>{a}</button>
            ))}
          </div>
          <div><Cap style={{ marginBottom:5 }}>Date</Cap><input type="date" value={otherDate} onChange={e=>setOtherDate(e.target.value)} style={di} /></div>
          <div><Cap style={{ marginBottom:5 }}>Duration</Cap><Inp value={otherDur} onChange={e=>setOtherDur(e.target.value)} placeholder="e.g. 45 mins" /></div>
          <div><Cap style={{ marginBottom:5 }}>Notes</Cap><Inp value={otherNotes} onChange={e=>setOtherNotes(e.target.value)} placeholder="How did it feel?" rows={2} /></div>
          <Btn onClick={saveOther} disabled={!otherType.trim()} full style={{ background:otherSaved?C.green:C.accent }}>{otherSaved?"Saved!":"Save Activity"}</Btn>
        </div>
      )}
    </div>
  );
}

// ── PLAN TAB ──────────────────────────────────────────────────────────────────
function PlanTab({ userId, onPlanUpdate, onLogSession, userProfile, plans, setPlans }) {
  var [pt, setPt] = useState("main");
  var [openW, setOpenW] = useState(null);
  var [completing, setCompleting] = useState(null);
  var [compTime, setCompTime] = useState(""); var [compNotes, setCompNotes] = useState("");
  var [doneWeeks, setDoneWeeks] = useState({});
  var [generatingHyrox, setGeneratingHyrox] = useState(false);

  var eventDate = (userProfile && userProfile.eventDate) || "";
  var eventName = (userProfile && userProfile.eventName) || "Race";
  var daysLeft = eventDate ? daysUntil(eventDate) : null;

  useEffect(() => { dbLoad(userId,"done_weeks").then(d => { if(d) setDoneWeeks(d); }); }, []);

  function persist(d) { setPlans(d); onPlanUpdate(d); }
  var cur = (plans && plans[pt]) || [];
  function isDone(i) { return !!doneWeeks[pt+"_"+i]; }

  function updateWeekDate(i, val) {
    var u = { ...plans }; u[pt] = cur.map((w,x) => x===i ? { ...w, date:val } : w); persist(u);
  }
  function removeWeek(i) {
    var u = { ...plans }; u[pt] = cur.filter((_,x)=>x!==i).map((w,x)=>({...w,week:x+1})); persist(u);
  }
  function completeWeek(w, i) {
    onLogSession({ id:Date.now()+"", date:getToday(), type:w.focus||"Session", totalTime:compTime||"--", duration:compTime||"--", rounds:w.rounds, notes:["Wk "+w.week+": "+w.focus, compNotes].filter(Boolean).join(" — "), weights:{}, exercises:[] }).then(() => {
      var nd = { ...doneWeeks }; nd[pt+"_"+i] = getToday();
      setDoneWeeks(nd); dbSave(userId,"done_weeks",nd);
      setCompleting(null); setCompTime(""); setCompNotes(""); setOpenW(null);
    });
  }
  async function buildHyroxPlan() {
    if (!eventDate) { alert("Set your race date in Settings first."); return; }
    setGeneratingHyrox(true);
    var plan = await generateHyroxPlan(userProfile||{}, eventDate).catch(()=>[]);
    var u = { ...plans, hyrox:plan };
    persist(u); setGeneratingHyrox(false); setPt("hyrox"); setOpenW(null);
  }
  function loadPrebuilt(key) {
    var prog = PREBUILT[key]; if (!prog) return;
    var u = { ...plans, main:prog.plan }; persist(u);
  }

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ padding:"28px 20px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div><Cap>Plans</Cap><div style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.03em", color:C.text, marginTop:6, fontFamily:F }}>Programme</div></div>
        {daysLeft !== null && <div style={{ textAlign:"right" }}><div style={{ fontSize:32, fontWeight:900, letterSpacing:"-0.04em", color:C.accent, fontFamily:F }}>{daysLeft}</div><Cap>days to {eventName}</Cap></div>}
      </div>
      <HR />
      <div style={{ display:"flex", borderBottom:"1px solid "+C.border, overflowX:"auto" }}>
        {[["main","My Plan"],["hyrox","Hyrox"],["custom","Custom"]].map(([id,lbl]) => (
          <button key={id} onClick={()=>{setPt(id);setOpenW(null);}} style={{ flex:"0 0 auto", padding:"11px 18px", background:"none", border:"none", borderBottom:"2px solid "+(pt===id?C.accent:"transparent"), color:pt===id?C.accent:C.muted, fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", fontFamily:F, whiteSpace:"nowrap" }}>{lbl}</button>
        ))}
      </div>

      {/* My Plan empty */}
      {pt==="main" && cur.length===0 && (
        <div style={{ padding:"16px 20px" }}>
          <div style={{ fontSize:13, color:C.muted, fontFamily:F, lineHeight:1.6, marginBottom:14 }}>Your AI-generated plan will appear here after onboarding. Or pick a pre-built programme:</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {Object.entries(PREBUILT).map(([key,prog]) => (
              <button key={key} onClick={()=>loadPrebuilt(key)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:C.surface, border:"1px solid "+C.border, cursor:"pointer", textAlign:"left", width:"100%" }}>
                <div style={{ fontSize:28, flexShrink:0 }}>{prog.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:F, marginBottom:3 }}>{key}</div>
                  <div style={{ fontSize:11, color:C.muted, fontFamily:F, marginBottom:4 }}>{prog.desc}</div>
                  <Cap>{prog.weeks} weeks</Cap>
                </div>
                <Cap color={C.accent} style={{ flexShrink:0 }}>→</Cap>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hyrox empty */}
      {pt==="hyrox" && cur.length===0 && (
        <div style={{ padding:"32px 20px", textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🏋️</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:F, marginBottom:8 }}>Hyrox Programme</div>
          <div style={{ fontSize:13, color:C.muted, fontFamily:F, lineHeight:1.6, marginBottom:16 }}>
            {eventDate ? "AI will build a "+weeksUntil(eventDate)+"-week programme for your "+eventDate+" race." : "Set your race date in Settings first."}
          </div>
          {eventDate ? <Btn onClick={buildHyroxPlan} disabled={generatingHyrox} full style={{ marginBottom:12 }}>{generatingHyrox?"Building...":"Generate Hyrox Programme"}</Btn> : <div style={{ fontSize:12, color:C.accent, fontFamily:F }}>⚙ Set race date in Settings</div>}
        </div>
      )}

      {/* Custom empty */}
      {pt==="custom" && cur.length===0 && (
        <div style={{ padding:"16px 20px" }}>
          <Cap style={{ marginBottom:12 }}>Pre-built programmes</Cap>
          <div style={{ border:"1px solid "+C.border }}>
            {Object.entries(PREBUILT).map(([key,prog],idx,arr) => (
              <button key={key} onClick={()=>{ var u={...plans,custom:prog.plan}; persist(u); }} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:C.surface, border:"none", borderBottom:idx<arr.length-1?"1px solid "+C.border:"none", cursor:"pointer", width:"100%", textAlign:"left" }}>
                <span style={{ fontSize:24 }}>{prog.emoji}</span>
                <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:F }}>{key}</div><div style={{ fontSize:11, color:C.muted, fontFamily:F }}>{prog.desc}</div><Cap style={{ marginTop:4 }}>{prog.weeks} weeks</Cap></div>
                <Cap color={C.accent}>→</Cap>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weeks list */}
      {cur.map((w,i) => (
        <div key={i} style={{ borderBottom:"1px solid "+C.border }}>
          <button onClick={()=>setOpenW(openW===i?null:i)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 20px", display:"flex", alignItems:"center", gap:12, fontFamily:F }}>
            <div style={{ width:32, textAlign:"center", flexShrink:0 }}>
              <Cap color={C.faint}>Wk</Cap>
              <div style={{ fontSize:22, fontWeight:900, color:isDone(i)?C.green:C.text, lineHeight:1.1, fontFamily:F }}>{w.week}</div>
            </div>
            <div style={{ flex:1, textAlign:"left", minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:F }}>{w.focus}</div>
                {isDone(i) && <Tag color={C.green}>Done</Tag>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }} onClick={e=>e.stopPropagation()}>
                <Cap>{w.rounds}x {w.duration}min</Cap>
                <input value={w.date||""} onChange={e=>updateWeekDate(i,e.target.value)} onClick={e=>e.stopPropagation()} placeholder="set date" style={{ background:"transparent", border:"none", borderBottom:"1px solid "+C.border, color:C.accent, fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:F, outline:"none", width:80, padding:"0 0 1px", cursor:"text" }} />
              </div>
            </div>
            <Cap color={C.faint}>{openW===i?"^":"v"}</Cap>
          </button>
          {openW===i && (
            <div style={{ background:C.surface, borderTop:"1px solid "+C.border, padding:"14px 20px" }}>
              {(w.exercises||[]).map((ex,j) => (
                <div key={j} style={{ display:"flex", gap:10, alignItems:"flex-start", paddingBottom:6, borderBottom:"1px solid "+C.faint, marginBottom:6 }}>
                  <div style={{ width:16, height:16, border:"1px solid "+C.border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Cap color={C.muted}>{j+1}</Cap></div>
                  <span style={{ fontSize:13, color:C.text, fontFamily:F }}>{ex}</span>
                </div>
              ))}
              {w.notes && <div style={{ background:C.surface2, border:"1px solid "+C.border, padding:"8px 12px", margin:"10px 0 12px" }}><span style={{ fontSize:13, color:C.muted, fontStyle:"italic", fontFamily:F }}>"{w.notes}"</span></div>}
              {completing===i ? (
                <div style={{ background:C.accentDim, border:"1px solid "+C.accent+"30", padding:12, marginBottom:10 }}>
                  <Cap color={C.accent} style={{ marginBottom:8 }}>Log As Complete</Cap>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <Inp value={compTime} onChange={e=>setCompTime(e.target.value)} placeholder="Duration e.g. 47:32" />
                    <Inp value={compNotes} onChange={e=>setCompNotes(e.target.value)} placeholder="How did it go?" rows={2} />
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <Btn outline onClick={()=>setCompleting(null)}>Cancel</Btn>
                      <Btn onClick={()=>completeWeek(w,i)}>Save to Log</Btn>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                  <Btn outline small>Edit</Btn>
                  <Btn small onClick={()=>setCompleting(i)} style={{ background:isDone(i)?C.surface2:C.accent, color:isDone(i)?C.muted:"#000", boxShadow:isDone(i)?"inset 0 0 0 1px "+C.border:"none" }}>{isDone(i)?"Done":"Complete"}</Btn>
                  <Btn danger small onClick={()=>removeWeek(i)}>Remove</Btn>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {cur.length > 0 && (
        <div style={{ padding:"14px 20px", display:"flex", gap:10 }}>
          <Btn outline full onClick={()=>{}}>+ Add Week</Btn>
          {pt==="hyrox" && eventDate && <Btn outline onClick={()=>{var u={...plans,hyrox:[]};persist(u);setTimeout(buildHyroxPlan,100);}} disabled={generatingHyrox}>{generatingHyrox?"...":"Regen"}</Btn>}
          {pt==="main" && <Btn outline onClick={()=>{var u={...plans,main:[]};persist(u);}}>Change</Btn>}
        </div>
      )}

      {eventDate && (
        <div style={{ margin:"4px 20px 20px", background:C.accentDim, border:"1px solid "+C.accent+"30", padding:"14px 18px" }}>
          <Tag>Race Day</Tag>
          <div style={{ fontSize:18, fontWeight:900, color:C.text, marginTop:8, fontFamily:F }}>{eventDate}</div>
          <Cap style={{ marginTop:3 }}>{eventName}</Cap>
        </div>
      )}
    </div>
  );
}

// ── GOALS TAB ─────────────────────────────────────────────────────────────────
function GoalsTab({ userId, initialTargets }) {
  var [targets, setTargets] = useState(initialTargets||[]);
  var [showAddFor, setShowAddFor] = useState(null);
  var [newT, setNewT] = useState({ name:"", target:"", current:"", unit:"kg" });

  useEffect(() => { dbLoad(userId,"targets").then(d => { if(d) setTargets(d); }); }, []);
  useEffect(() => { if (initialTargets && initialTargets.length && !targets.length) setTargets(initialTargets); }, [initialTargets]);

  function persist(d) { setTargets(d); dbSave(userId,"targets",d); }
  function removeTarget(id) { persist(targets.filter(t=>t.id!==id)); }
  function updateField(id, field, val) { persist(targets.map(t=>t.id===id?{...t,[field]:val}:t)); }
  function addTarget(cat) {
    if (!newT.name || !newT.target) return;
    persist(targets.concat([{ ...newT, id:Date.now(), category:cat }]));
    setShowAddFor(null); setNewT({ name:"", target:"", current:"", unit:"kg" });
  }

  var cats = []; targets.forEach(t => { if (!cats.includes(t.category)) cats.push(t.category); });
  function catColor(cat) {
    if (cat==="Hyrox") return C.accent;
    if (cat==="Strength") return C.green;
    if (cat==="Running") return C.orange;
    if (cat==="Body") return C.purple;
    return C.accent;
  }
  var inpStyle = { background:C.surface2, border:"1px solid "+C.border, color:C.text, fontSize:13, fontWeight:700, fontFamily:F, padding:"5px 8px", outline:"none", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ padding:"28px 20px 16px" }}><Cap>2026 Targets</Cap><div style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.03em", color:C.text, marginTop:6, fontFamily:F }}>Goals</div></div>
      <HR />
      {targets.length===0 && <div style={{ padding:"40px 20px", textAlign:"center", fontSize:13, color:C.muted, fontFamily:F, lineHeight:1.6 }}>No goals yet. Complete onboarding to generate targets, or add below.</div>}
      {cats.map(cat => {
        var col = catColor(cat);
        return <div key={cat}>
          <div style={{ padding:"10px 20px 8px", background:C.surface2, borderBottom:"1px solid "+C.border }}><Cap color={col} size={10}>{cat}</Cap></div>
          {targets.filter(t=>t.category===cat).map(target => {
            var pct = prgPct(target.target, target.current);
            return <div key={target.id} style={{ borderBottom:"1px solid "+C.border }}>
              <div style={{ padding:"12px 20px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:F }}>{target.name}</div>
                    <Cap color={C.muted}>{target.unit}</Cap>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                    <div><Cap style={{ marginBottom:3 }}>Target</Cap><input value={target.target||""} onChange={e=>updateField(target.id,"target",e.target.value)} placeholder="target" style={{ ...inpStyle, color:col, background:C.faint }} /></div>
                    <div><Cap style={{ marginBottom:3 }}>Current</Cap><input value={target.current||""} onChange={e=>updateField(target.id,"current",e.target.value)} placeholder={target.unit} style={inpStyle} /></div>
                  </div>
                  {target.current && (
                    <div style={{ marginBottom:6 }}>
                      <Bar pct={pct} color={pct>=100?col:col+"88"} />
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                        <Cap color={pct>=100?col:C.faint}>{pct>=100?"Target reached! 🎉":pct+"% there"}</Cap>
                        <Cap color={C.faint}>{target.current} → {target.target} {target.unit}</Cap>
                      </div>
                    </div>
                  )}
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <button onClick={()=>removeTarget(target.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.faint, fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:F, padding:0 }}>remove</button>
                  </div>
                </div>
                <Ring pct={pct} primary={col} />
              </div>
            </div>;
          })}
          {showAddFor===cat ? (
            <div style={{ padding:"14px 20px", background:C.surface, borderBottom:"1px solid "+C.border }}>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
                  <Inp value={newT.name} onChange={e=>setNewT(n=>({...n,name:e.target.value}))} placeholder="Goal name" />
                  <Sel value={newT.unit} onChange={e=>setNewT(n=>({...n,unit:e.target.value}))}>
                    <option>kg</option><option>mm:ss</option><option>h:mm:ss</option><option>km</option><option>/km</option><option>reps</option><option>mins</option><option>kcal</option><option>sessions</option><option>bpm</option>
                  </Sel>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <Inp value={newT.target} onChange={e=>setNewT(n=>({...n,target:e.target.value}))} placeholder="Target value" />
                  <Inp value={newT.current||""} onChange={e=>setNewT(n=>({...n,current:e.target.value}))} placeholder="Current (optional)" />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <Btn outline onClick={()=>setShowAddFor(null)}>Cancel</Btn>
                  <Btn onClick={()=>addTarget(cat)} disabled={!newT.name||!newT.target}>Add</Btn>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding:"10px 20px", borderBottom:"1px solid "+C.border }}>
              <button onClick={()=>{setShowAddFor(cat);setNewT({name:"",target:"",current:"",unit:"kg"});}} style={{ background:"none", border:"none", color:C.muted, fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", fontFamily:F, padding:0 }}>+ Add goal in {cat}</button>
            </div>
          )}
        </div>;
      })}
      <div style={{ padding:"16px 20px" }}>
        <Cap style={{ marginBottom:8 }}>New Category</Cap>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          {["Hyrox","Strength","Running","Body","Nutrition","Performance","Other"].filter(c=>!cats.includes(c)).map(c => (
            <button key={c} onClick={()=>{setShowAddFor(c);setNewT({name:"",target:"",current:"",unit:"kg"});}} style={{ padding:"6px 12px", background:"none", border:"1px solid "+C.border, color:C.muted, fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", fontFamily:F }}>{c}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Inp placeholder="Custom category..." style={{ flex:1 }} value={""} onChange={()=>{}} />
        </div>
      </div>
    </div>
  );
}

// ── COACH TAB ─────────────────────────────────────────────────────────────────
function CoachTab({ sessions, userName, userId, userProfile, notifSettings }) {
  var [nutLog, setNutLog] = useState([]);
  var [cals, setCals] = useState(""); var [protein, setProtein] = useState(""); var [carbs, setCarbs] = useState(""); var [fat, setFat] = useState("");
  var [nutSaved, setNutSaved] = useState(false); var [showNutForm, setShowNutForm] = useState(false);
  var [sundayDismissed, setSundayDismissed] = useState(false); var [nutritionDismissed, setNutritionDismissed] = useState(false);
  var goals = (userProfile && userProfile.goals) || [];
  var [msgs, setMsgs] = useState([{ role:"assistant", content:"Hey " + userName + "." + (goals.length?" I know you're training for "+goals.join(" and ")+".":" Let's talk training.") + " Ask me anything about nutrition, fuelling, or your programme." }]);
  var [input, setInput] = useState(""); var [loading, setLoading] = useState(false);
  var [speaking, setSpeaking] = useState(false); var [listening, setListening] = useState(false); var [voiceOn, setVoiceOn] = useState(true);
  var scrollRef = useRef(null); var recognitionRef = useRef(null);

  var isSunday = new Date().getDay() === 0;
  var todayNut = nutLog.find(e => e.date === getToday());
  var showSundayCard = notifSettings.sunday && isSunday && !sundayDismissed;
  var showNutritionCard = notifSettings.nutrition && !todayNut && !nutritionDismissed;

  useEffect(() => {
    dbLoad(userId,"nut_log").then(d => { if(d) setNutLog(d); });
    dbLoad(userId,"voice_on").then(d => { if(d!==null) setVoiceOn(d); });
  }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  function saveNutrition() {
    if (!cals) return;
    var entry = { id:Date.now(), date:getToday(), cals, protein, carbs, fat };
    var newLog = nutLog.filter(e=>e.date!==getToday()).concat([entry]);
    setNutLog(newLog); dbSave(userId,"nut_log",newLog);
    setNutSaved(true); setShowNutForm(false); setTimeout(()=>setNutSaved(false),2000);
  }

  function sendMessage(text) {
    if (!text.trim() || loading) return;
    var updated = msgs.concat([{ role:"user", content:text.trim() }]);
    setMsgs(updated); setInput(""); setLoading(true);
    var sessSum = sessions.slice(-5).map(s=>s.date+": "+s.type+" "+(s.notes||"")).join("\n");
    var nutSum = nutLog.slice(-3).map(e=>e.date+": "+e.cals+"kcal P:"+e.protein+"g").join("\n");
    var profileSum = userProfile ? "Age:"+(userProfile.age||"?")+", Weight:"+(userProfile.weight||"?")+"kg, Goals:"+(userProfile.goals||[]).join(", ")+", Level:"+(userProfile.fitnessLevel||"unknown")+(userProfile.eventName?", Event:"+userProfile.eventName+" on "+userProfile.eventDate:"") : "";
    var system = "You are a personal trainer and sports nutritionist coaching "+userName+".\n\nATHLETE: "+profileSum+"\n\nFORMAT: Max 3 short paragraphs. **bold** key info. End with one question.\nTONE: Direct, warm, coach texting. No waffle.\n\nRecent sessions:\n"+sessSum+"\nNutrition:\n"+(nutSum||"Nothing logged");
    callAI(updated.map(m=>({role:m.role,content:m.content})), system).then(reply => {
      setMsgs(m => m.concat([{ role:"assistant", content:reply }]));
      if (voiceOn) { setSpeaking(true); speakEL(reply.replace(/\*\*([^*]+)\*\*/g,"$1").slice(0,400)).catch(()=>{}).then(()=>setSpeaking(false)); }
    }).catch(() => setMsgs(m => m.concat([{ role:"assistant", content:"Connection issue. Try again." }])))
      .then(() => setLoading(false));
  }

  function startListening() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Try Chrome."); return; }
    var r = new SR(); r.lang="en-GB"; r.continuous=false; r.interimResults=false;
    recognitionRef.current = r;
    r.onstart = () => setListening(true);
    r.onresult = e => { setListening(false); sendMessage(e.results[0][0].transcript); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
  }
  function stopListening() { if (recognitionRef.current) recognitionRef.current.stop(); setListening(false); }
  function toggleVoice() { var nv = !voiceOn; setVoiceOn(nv); dbSave(userId,"voice_on",nv); }

  var TARGET_P = userProfile && userProfile.weight ? Math.round(parseFloat(userProfile.weight) * 2) : 170;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 116px)", overflow:"hidden" }}>
      {/* Proactive cards */}
      {(showSundayCard || showNutritionCard) && (
        <div style={{ flexShrink:0, borderBottom:"1px solid "+C.border, padding:"10px 16px", display:"flex", flexDirection:"column", gap:8, maxHeight:"35%", overflowY:"auto" }}>
          {showSundayCard && (
            <div style={{ background:C.surface, border:"1px solid "+C.accent+"30", padding:"11px 13px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}><Cap color={C.accent}>Week Summary</Cap><Cap color={C.faint}>Sunday</Cap></div>
              <div style={{ fontSize:13, color:C.text, fontFamily:F, lineHeight:1.6, marginBottom:6 }}>You logged {sessions.filter(s=>s.date>=getMonday()).length} sessions this week. How did it feel overall?</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>sendMessage("Here's my week summary")} style={{ padding:"5px 10px", background:C.accentDim, border:"1px solid "+C.accent+"40", color:C.accent, fontSize:9, fontWeight:700, textTransform:"uppercase", cursor:"pointer", fontFamily:F, letterSpacing:"0.1em" }}>Chat with Coach</button>
                <button onClick={()=>setSundayDismissed(true)} style={{ background:"none", border:"none", color:C.faint, fontSize:9, fontWeight:700, textTransform:"uppercase", cursor:"pointer", fontFamily:F, letterSpacing:"0.1em" }}>Dismiss</button>
              </div>
            </div>
          )}
          {showNutritionCard && (
            <div style={{ background:C.surface, border:"1px solid "+C.border, padding:"11px 13px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}><Cap>Nutrition Reminder</Cap><Cap color={C.faint}>Today</Cap></div>
              <div style={{ fontSize:13, color:C.text, fontFamily:F, lineHeight:1.6, marginBottom:6 }}>You haven't logged food today. Hit your protein target to support your training.</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>{setShowNutForm(true);setNutritionDismissed(true);}} style={{ padding:"5px 10px", background:C.accentDim, border:"1px solid "+C.accent+"40", color:C.accent, fontSize:9, fontWeight:700, textTransform:"uppercase", cursor:"pointer", fontFamily:F, letterSpacing:"0.1em" }}>Log Now</button>
                <button onClick={()=>setNutritionDismissed(true)} style={{ background:"none", border:"none", color:C.faint, fontSize:9, fontWeight:700, textTransform:"uppercase", cursor:"pointer", fontFamily:F, letterSpacing:"0.1em" }}>Dismiss</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nutrition strip */}
      <div style={{ flexShrink:0, borderBottom:"1px solid "+C.border }}>
        <div style={{ padding:"10px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
            <div><Cap>Nutrition</Cap><div style={{ fontSize:13, fontWeight:900, color:C.text }}>Today's Fuel</div></div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {todayNut ? (
                <>
                  <div style={{ background:C.surface2, border:"1px solid "+C.border, padding:"4px 8px", display:"flex", gap:4, alignItems:"baseline" }}><span style={{ fontSize:13, fontWeight:900, color:C.accent }}>{todayNut.cals}</span><Cap>kcal</Cap></div>
                  <div style={{ background:C.surface2, border:"1px solid "+C.border, padding:"4px 8px", display:"flex", gap:4, alignItems:"baseline" }}><span style={{ fontSize:13, fontWeight:900, color:C.green }}>{todayNut.protein}g</span><Cap>P</Cap></div>
                </>
              ) : (
                <div style={{ fontSize:11, color:C.faint, fontFamily:F }}>Nothing logged · target: {TARGET_P}g protein</div>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            <a href="https://cronometer.com/diary/" target="_blank" rel="noreferrer" style={{ padding:"5px 9px", background:"#f97316", color:"#fff", fontSize:8, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", textDecoration:"none", fontFamily:F }}>Cron</a>
            <button onClick={()=>setShowNutForm(s=>!s)} style={{ background:"none", border:"1px solid "+C.border, color:C.muted, padding:"5px 9px", fontSize:8, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", fontFamily:F }}>{showNutForm?"Cancel":"+ Log"}</button>
          </div>
        </div>
        {showNutForm && (
          <div style={{ padding:"0 20px 12px", borderTop:"1px solid "+C.border }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"10px 0 8px" }}>
              <div><Cap style={{ marginBottom:4 }}>Calories</Cap><Inp type="number" value={cals} onChange={e=>setCals(e.target.value)} placeholder="e.g. 2400" /></div>
              <div><Cap style={{ marginBottom:4 }}>Protein (g)</Cap><Inp type="number" value={protein} onChange={e=>setProtein(e.target.value)} placeholder="e.g. 150" /></div>
              <div><Cap style={{ marginBottom:4 }}>Carbs (g)</Cap><Inp type="number" value={carbs} onChange={e=>setCarbs(e.target.value)} placeholder="e.g. 280" /></div>
              <div><Cap style={{ marginBottom:4 }}>Fat (g)</Cap><Inp type="number" value={fat} onChange={e=>setFat(e.target.value)} placeholder="e.g. 70" /></div>
            </div>
            <Btn onClick={saveNutrition} disabled={!cals} full style={{ background:nutSaved?C.green:C.accent }}>{nutSaved?"Saved!":"Save Today"}</Btn>
          </div>
        )}
      </div>

      {/* Chat header */}
      <div style={{ padding:"8px 20px", borderBottom:"1px solid "+C.border, flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Cap>Coach</Cap>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {speaking && <Cap color={C.accent}>speaking</Cap>}
          <button onClick={toggleVoice} style={{ background:"none", border:"1px solid "+(voiceOn?C.accent:C.border), color:voiceOn?C.accent:C.muted, padding:"4px 10px", fontSize:8, fontWeight:700, textTransform:"uppercase", cursor:"pointer", fontFamily:F, letterSpacing:"0.1em" }}>{voiceOn?"Voice On":"Voice Off"}</button>
        </div>
      </div>

      {/* Chat messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 20px", display:"flex", flexDirection:"column", gap:10 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && <Cap style={{ marginBottom:3 }}>Coach</Cap>}
            <div style={{ maxWidth:"90%", padding:"10px 13px", background:m.role==="user"?C.accent:C.surface, color:m.role==="user"?"#000":C.text, border:"1px solid "+(m.role==="user"?C.accent:C.border), fontFamily:F }}>
              {m.role==="user" ? <span style={{ fontSize:13 }}>{m.content}</span> : <MsgContent text={m.content} />}
            </div>
          </div>
        ))}
        {loading && <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}><Cap style={{ marginBottom:3 }}>Coach</Cap><div style={{ background:C.surface, border:"1px solid "+C.border, padding:"10px 13px", color:C.muted, fontFamily:F, fontSize:13 }}>...</div></div>}
        <div ref={scrollRef} />
      </div>

      {/* Quick prompts */}
      {msgs.length < 3 && (
        <div style={{ padding:"0 20px 6px", display:"flex", flexWrap:"wrap", gap:5, flexShrink:0 }}>
          {["What should I eat before training?","How much protein do I need?","Fuelling for a long session","Am I eating enough?"].map(s => (
            <button key={s} onClick={()=>sendMessage(s)} style={{ padding:"4px 9px", background:"none", border:"1px solid "+C.border, fontSize:9, color:C.muted, cursor:"pointer", fontFamily:F }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:"8px 20px 20px", borderTop:"1px solid "+C.border, background:C.bg, flexShrink:0 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={listening?stopListening:startListening} disabled={loading} style={{ width:44, height:44, flexShrink:0, border:"1px solid "+(listening?C.accent:C.border), background:listening?C.accent:C.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={listening?"#000":C.muted} strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
          </button>
          <Inp value={input} onChange={e=>setInput(e.target.value)} placeholder={listening?"Listening...":"Type or tap mic to speak"} style={{ flex:1 }} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(input);} }} />
          <button onClick={()=>sendMessage(input)} disabled={!input.trim()||loading} style={{ padding:"10px 14px", background:C.accent, border:"none", cursor:"pointer", fontFamily:F, fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#000", flexShrink:0, opacity:(!input.trim()||loading)?0.5:1 }}>Send</button>
        </div>
        {listening && <div style={{ marginTop:6, fontSize:11, color:C.accent, fontFamily:F, textTransform:"uppercase", textAlign:"center" }}>Listening — tap mic to stop</div>}
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function PulseApp() {
  var [tab, setTab] = useState("home");
  var [sessions, setSessions] = useState([]);
  var [targets, setTargets] = useState([]);
  var [competitions, setCompetitions] = useState([]);
  var [plans, setPlans] = useState({ main:[], hyrox:[], custom:[] });
  var [user, setUser] = useState(null);
  var [userProfile, setUserProfile] = useState(null);
  var [loaded, setLoaded] = useState(false);
  var [showOnboarding, setShowOnboarding] = useState(false);
  var [showSettings, setShowSettings] = useState(false);
  var [showCheckIn, setShowCheckIn] = useState(false);
  var [notifSettings, setNotifSettings] = useState({ sunday:true, nutrition:true });

  useEffect(() => {
    sb.auth.getSession().then(res => {
      if (res.data.session) { setUser(res.data.session.user); loadUserData(res.data.session.user); }
      else setLoaded(true);
    });
    var sub = sb.auth.onAuthStateChange((event, session) => {
      if (event==="SIGNED_IN" && session) { setUser(session.user); loadUserData(session.user); }
      if (event==="SIGNED_OUT") { setUser(null); setUserProfile(null); setLoaded(true); }
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function loadUserData(u) {
    var [s,t,p,prof,lastCheckin,notif,comps,supaProf] = await Promise.all([
      dbLoad(u.id,"sessions"), dbLoad(u.id,"targets"), dbLoad(u.id,"plans"),
      dbLoad(u.id,"profile"), dbLoad(u.id,"last_checkin"), dbLoad(u.id,"notif_settings"),
      dbLoad(u.id,"competitions"),
      sb.from("profiles").select("display_name").eq("id",u.id).single()
    ]);
    setSessions(s && s.length ? s : []);
    if (t && t.length) setTargets(t);
    if (p) setPlans(prev => ({ ...prev, ...p }));
    if (notif) setNotifSettings(notif);
    if (comps) setCompetitions(comps);
    var displayName = (prof && prof.displayName) || (supaProf.data && supaProf.data.display_name) || u.email.split("@")[0];
    var fullProfile = { displayName, ...prof||{} };
    setUserProfile(fullProfile);
    if (!prof || !prof.goals || prof.goals.length === 0) {
      setShowOnboarding(true);
    } else {
      var isMonday = new Date().getDay() === 1;
      if (isMonday && lastCheckin !== getMonday()) setShowCheckIn(true);
    }
    setLoaded(true);
  }

  async function handleOnboardingComplete(data) {
    var newProfile = { ...userProfile, ...data.profile };
    setUserProfile(newProfile);
    await dbSave(user.id,"profile",newProfile);
    var newPlans = { ...plans, main:data.myPlan||[] };
    if (data.hyroxPlan && data.hyroxPlan.length) newPlans.hyrox = data.hyroxPlan;
    setPlans(newPlans);
    await dbSave(user.id,"plans",newPlans);
    if (data.targets && data.targets.length) { setTargets(data.targets); await dbSave(user.id,"targets",data.targets); }
    if (data.competitions && data.competitions.length) { setCompetitions(data.competitions); await dbSave(user.id,"competitions",data.competitions); }
    setShowOnboarding(false); setTab("home");
  }

  function handleProfileUpdate(updated) { setUserProfile(updated); dbSave(user.id,"profile",updated); }
  function handleNotifUpdate(key,val) { var n={...notifSettings,[key]:val}; setNotifSettings(n); dbSave(user.id,"notif_settings",n); }
  function handlePlansUpdate(d) { setPlans(d); dbSave(user.id,"plans",d); }
  function handleCompetitionsUpdate(c) { setCompetitions(c); dbSave(user.id,"competitions",c); }
  function saveSession(s) { return new Promise(resolve => { setSessions(prev => { var u=prev.concat([s]); dbSave(user.id,"sessions",u); resolve(); return u; }); }); }
  function deleteSession(id) { setSessions(prev => { var u=prev.filter(s=>s.id!==id); dbSave(user.id,"sessions",u); return u; }); }

  var displayName = (userProfile && userProfile.displayName) || "Athlete";
  var firstComp = competitions && competitions[0];
  var daysLeft = firstComp && firstComp.date ? daysUntil(firstComp.date) : null;

  var TABS = [
    { id:"home", label:"Home", icon:"⌂" },
    { id:"log", label:"Log", icon:"≡" },
    { id:"train", label:"Train", icon:"◎" },
    { id:"plan", label:"Plan", icon:"#" },
    { id:"goals", label:"Goals", icon:"✦" },
    { id:"coach", label:"Coach", icon:"+" },
  ];

  if (!loaded) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:32, fontWeight:900, letterSpacing:"0.08em", color:C.text, fontFamily:F }}>PULSE</div>
      <Cap color={C.accent} size={10}>Loading</Cap>
    </div>
  );
  if (!user) return <AuthScreen onAuth={u=>{setUser(u);loadUserData(u);}} />;
  if (showOnboarding && userProfile) return <OnboardingChat userName={displayName} onComplete={handleOnboardingComplete} />;

  var CogIcon = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:F, maxWidth:480, margin:"0 auto" }}>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}input::placeholder,textarea::placeholder{color:${C.faint};}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.3);}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes ping{0%{transform:scale(1);opacity:0.5}100%{transform:scale(1.4);opacity:0}}`}</style>

      {showSettings && userProfile && (
        <SettingsOverlay user={user} profile={userProfile} notifSettings={notifSettings} onClose={()=>setShowSettings(false)} onUpdate={handleProfileUpdate} onNotifUpdate={handleNotifUpdate} />
      )}
      {showCheckIn && (
        <WeeklyCheckIn userId={user.id} userName={displayName} onComplete={()=>setShowCheckIn(false)} onDismiss={()=>setShowCheckIn(false)} />
      )}

      {/* Header */}
      <div style={{ borderBottom:"1px solid "+C.border, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:C.bg, zIndex:10 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:900, letterSpacing:"0.1em", textTransform:"uppercase", color:C.text, fontFamily:F, lineHeight:1 }}>Pulse</div>
          <Cap style={{ marginTop:2 }}>{displayName}</Cap>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {daysLeft !== null && <div style={{ padding:"4px 10px", border:"1px solid rgba(212,245,60,0.25)", fontSize:8, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.accent, background:"rgba(212,245,60,0.06)" }}>{daysLeft} days to race</div>}
          <button onClick={()=>setShowSettings(true)} style={{ background:"none", border:"1px solid "+C.border, cursor:"pointer", padding:"8px 9px", display:"flex", alignItems:"center", justifyContent:"center" }}>{CogIcon}</button>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {tab==="home"  && <HomeTab sessions={sessions} userProfile={userProfile} competitions={competitions} onUpdateCompetitions={handleCompetitionsUpdate} />}
        {tab==="log"   && <SessionsTab sessions={sessions} onDelete={deleteSession} />}
        {tab==="train" && <TrainTab onSave={saveSession} />}
        {tab==="plan"  && <PlanTab userId={user.id} onPlanUpdate={handlePlansUpdate} onLogSession={saveSession} userProfile={userProfile} plans={plans} setPlans={handlePlansUpdate} />}
        {tab==="goals" && <GoalsTab userId={user.id} initialTargets={targets} />}
        {tab==="coach" && <CoachTab sessions={sessions} targets={targets} plans={plans} userName={displayName} userId={user.id} userProfile={userProfile} notifSettings={notifSettings} />}
      </div>

      {/* Tab bar */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.bg, borderTop:"1px solid "+C.border, display:"flex", zIndex:20 }}>
        {TABS.map(t => {
          var active = tab===t.id;
          return <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"10px 0 15px", background:active?"rgba(212,245,60,0.04)":"none", border:"none", borderTop:"2px solid "+(active?C.accent:"#444"), cursor:"pointer", fontFamily:F, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:13, color:active?C.accent:"#aaa" }}>{t.icon}</span>
            <span style={{ fontSize:8, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:active?C.accent:"#999" }}>{t.label}</span>
          </button>;
        })}
      </div>
    </div>
  );
}
