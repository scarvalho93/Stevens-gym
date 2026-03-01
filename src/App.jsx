import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

var SUPA_URL = "https://iahdjfqfuamxeqwcvmjz.supabase.co";
var SUPA_KEY = "sb_publishable_-Rk_LL2AyeDC5S-ZzqMSrg_EG9jwFF1";
var sb = createClient(SUPA_URL, SUPA_KEY);

var C = {
  bg:"#080808", surface:"#111", surface2:"#181818", border:"#252525",
  text:"#f0ebe3", muted:"#888", faint:"#444", accent:"#d4f53c",
  accentDim:"#d4f53c12", danger:"#ff3b2f", orange:"#FC4C02", green:"#22c55e",
};
var F = "'Helvetica Neue','Arial',system-ui,sans-serif";

// ---- DB ----
async function dbLoad(userId, key) {
  var res = await sb.from("user_data").select("value").eq("user_id", userId).eq("key", key).single();
  if (res.error || !res.data) return null;
  return res.data.value;
}
async function dbSave(userId, key, value) {
  await sb.from("user_data").upsert({user_id:userId, key:key, value:value, updated_at:new Date().toISOString()}, {onConflict:"user_id,key"});
}

// ---- AI ----
function callAI(messages, system) {
  return fetch("/api/chat", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({messages:messages, system:system||""})
  }).then(function(r){ if(!r.ok) throw new Error("API "+r.status); return r.json(); })
    .then(function(d){ return d.content.map(function(b){return b.text||"";}).join(""); });
}

// ---- VOICE ----
function speakEL(text) {
  return fetch("/api/elevenlabs", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text:text, voiceId:"2UMI2FME0FFUFMlUoRER"})
  }).then(function(r){ if(!r.ok) throw new Error("Voice "+r.status); return r.blob(); })
    .then(function(blob){ var url=URL.createObjectURL(blob); var a=new Audio(url); a.play(); return a; });
}

// ---- HELPERS ----
function toSecs(t) {
  if(!t||t==="--") return null;
  var p=t.split(":").map(Number);
  if(p.length===2) return p[0]*60+p[1];
  if(p.length===3) return p[0]*3600+p[1]*60+p[2];
  return null;
}
function calcPace(km,time) {
  var p=time.split(":").map(Number);
  var m=p.length===2?p[0]+p[1]/60:p[0]*60+p[1]+p[2]/60;
  var pace=m/parseFloat(km);
  return Math.floor(pace)+":"+String(Math.round((pace%1)*60)).padStart(2,"0")+"/km";
}
function prgPct(tgt,cur) {
  if(!cur||!tgt) return 0;
  var sT=toSecs(tgt),sC=toSecs(cur);
  if(sT&&sC) return Math.min(100,Math.round((sT/sC)*100));
  var n=parseFloat(cur),t=parseFloat(tgt);
  if(!isNaN(n)&&!isNaN(t)&&t>0) return Math.min(100,Math.round((n/t)*100));
  return 0;
}
function fmtDur(d) {
  if(!d||d==="--") return null;
  var s=toSecs(d); if(!s) return null;
  var h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
  return h>0?h+"h "+m+"m":m+"m";
}
function totalMins(t) { var s=toSecs(t); if(!s) return null; return Math.round(s/60)+" min"; }
function getToday() { return new Date().toISOString().split("T")[0]; }
function getMonday() {
  var d=new Date(),day=d.getDay(),diff=d.getDate()-(day===0?6:day-1);
  return new Date(new Date().setDate(diff)).toISOString().split("T")[0];
}
function weeksUntil(dateStr) {
  if(!dateStr) return null;
  return Math.max(0,Math.ceil((new Date(dateStr)-new Date())/(1000*60*60*24*7)));
}
function parseJsonSafe(str) {
  try{ return JSON.parse(str.replace(/```json|```/g,"").trim()); }catch(e){ return null; }
}

// ---- PRE-BUILT PLANS ----
var PREBUILT = {
  "Couch to 5K": {
    emoji:"🏃", weeks:8, desc:"Go from zero to running 5K without stopping.",
    plan:[
      {week:1,focus:"Walk/Run Intervals",date:"Wk 1",rounds:3,duration:"30",notes:"Alternate 60s run, 90s walk. Repeat 8x.",exercises:["5 min warm-up walk","8x (60s run / 90s walk)","5 min cool-down walk"]},
      {week:2,focus:"Build the Run",date:"Wk 2",rounds:3,duration:"30",notes:"Longer run intervals now.",exercises:["5 min warm-up walk","6x (90s run / 2 min walk)","5 min cool-down walk"]},
      {week:3,focus:"First 3-Minute Runs",date:"Wk 3",rounds:3,duration:"30",notes:"You've got this — 3 minute runs!",exercises:["5 min warm-up","2x (90s run / 90s walk / 3 min run / 3 min walk)","5 min cool-down"]},
      {week:4,focus:"Longer Intervals",date:"Wk 4",rounds:3,duration:"35",notes:"Push through — halfway there.",exercises:["5 min warm-up","3 min run / 90s walk / 5 min run / 2.5 min walk / 3 min run","5 min cool-down"]},
      {week:5,focus:"First 20-Minute Run",date:"Wk 5",rounds:3,duration:"40",notes:"Day 3: run 20 mins non-stop.",exercises:["5 min warm-up","20 min continuous run","5 min cool-down"]},
      {week:6,focus:"Building to 25 Mins",date:"Wk 6",rounds:3,duration:"40",notes:"Almost there. Keep the pace easy.",exercises:["5 min warm-up","25 min continuous run","5 min cool-down"]},
      {week:7,focus:"25-Minute Runs",date:"Wk 7",rounds:3,duration:"40",notes:"Consistency is key this week.",exercises:["5 min warm-up","25 min run","5 min cool-down"]},
      {week:8,focus:"5K Week 🎉",date:"Wk 8",rounds:3,duration:"45",notes:"Run your first 5K. You've earned it.",exercises:["5 min warm-up","30 min run (your 5K!)","5 min cool-down"]},
    ]
  },
  "Half Marathon": {
    emoji:"🏅", weeks:12, desc:"12 weeks to your first half marathon.",
    plan:[
      {week:1,focus:"Aerobic Base",date:"Wk 1",rounds:4,duration:"45",notes:"Easy effort only. Build the habit.",exercises:["Easy 5K run","Post-run stretching 10 mins"]},
      {week:2,focus:"Build Mileage",date:"Wk 2",rounds:4,duration:"50",notes:"Add 10% distance this week.",exercises:["Easy 6K run","Strides x4 after run"]},
      {week:3,focus:"First Long Run",date:"Wk 3",rounds:4,duration:"60",notes:"Long run day: 10K at easy pace.",exercises:["Easy 10K long run","Recovery walk 10 mins"]},
      {week:4,focus:"Tempo Introduction",date:"Wk 4",rounds:4,duration:"55",notes:"One tempo run this week.",exercises:["Easy 5K warm-up","Tempo 3K","Easy 2K cool-down"]},
      {week:5,focus:"Long Run 12K",date:"Wk 5",rounds:4,duration:"70",notes:"Longest run yet. Keep it easy.",exercises:["12K long run","Post-run stretch 15 mins"]},
      {week:6,focus:"Speed Work",date:"Wk 6",rounds:4,duration:"55",notes:"4x1K intervals at 5K pace.",exercises:["Warm-up 2K","4x1K intervals (90s rest)","Cool-down 2K"]},
      {week:7,focus:"Long Run 14K",date:"Wk 7",rounds:4,duration:"80",notes:"Big week. Fuel and sleep well.",exercises:["14K long run","Recovery walk"]},
      {week:8,focus:"Race Simulation",date:"Wk 8",rounds:4,duration:"75",notes:"Run 10K at goal race pace.",exercises:["Warm-up 2K","10K at race pace","Cool-down 2K"]},
      {week:9,focus:"Long Run 17K",date:"Wk 9",rounds:4,duration:"100",notes:"Peak long run. Practise race nutrition.",exercises:["17K long run","Race pace last 3K"]},
      {week:10,focus:"Peak Week",date:"Wk 10",rounds:4,duration:"80",notes:"Highest volume week. Trust the process.",exercises:["Long run 18K","Tempo run 8K","Easy recovery runs"]},
      {week:11,focus:"Taper Begins",date:"Wk 11",rounds:3,duration:"50",notes:"Reduce volume. Keep sharpness.",exercises:["Easy 8K","Strides x4"]},
      {week:12,focus:"Race Week 🏅",date:"Wk 12",rounds:2,duration:"30",notes:"Stay loose. Trust your training.",exercises:["Easy 3K Tuesday","Rest + race day"]},
    ]
  },
  "Beginner Strength": {
    emoji:"💪", weeks:8, desc:"Build foundational strength from scratch.",
    plan:[
      {week:1,focus:"Learn the Movements",date:"Wk 1",rounds:3,duration:"45",notes:"Focus on form over weight.",exercises:["Goblet Squat 3x12","Push-Ups 3x10","Dumbbell Row 3x10 each","Plank 3x30s"]},
      {week:2,focus:"Add Load",date:"Wk 2",rounds:3,duration:"45",notes:"Increase weight slightly if form is good.",exercises:["Goblet Squat 3x12","Push-Ups 3x12","Dumbbell Row 3x12","Dead Bug 3x10"]},
      {week:3,focus:"Upper Body Push",date:"Wk 3",rounds:3,duration:"50",notes:"Chest and shoulders focus.",exercises:["Bench Press 4x10","Overhead Press 3x10","Lateral Raises 3x15","Tricep Dips 3x12"]},
      {week:4,focus:"Lower Body",date:"Wk 4",rounds:3,duration:"50",notes:"Legs and glutes.",exercises:["Barbell Squat 4x10","Romanian Deadlift 3x10","Leg Press 3x12","Calf Raises 4x15"]},
      {week:5,focus:"Upper Body Pull",date:"Wk 5",rounds:3,duration:"50",notes:"Back and biceps.",exercises:["Pull-Ups or Lat Pulldown 4x8","Barbell Row 3x10","Face Pulls 3x15","Bicep Curls 3x12"]},
      {week:6,focus:"Full Body Power",date:"Wk 6",rounds:3,duration:"55",notes:"Compound movements only.",exercises:["Deadlift 4x6","Bench Press 4x8","Barbell Row 4x8","Overhead Press 3x8"]},
      {week:7,focus:"Volume Week",date:"Wk 7",rounds:4,duration:"60",notes:"More sets this week. Push hard.",exercises:["Squat 5x8","Bench Press 5x8","Deadlift 3x5","Pull-Ups 4x8"]},
      {week:8,focus:"Test Your Strength",date:"Wk 8",rounds:3,duration:"55",notes:"Find your working maxes. Track your progress.",exercises:["Squat 3RM test","Bench Press 3RM test","Deadlift 3RM test"]},
    ]
  },
  "Weight Loss": {
    emoji:"🔥", weeks:12, desc:"Sustainable fat loss through training and nutrition.",
    plan:[
      {week:1,focus:"Build the Habit",date:"Wk 1",rounds:3,duration:"40",notes:"4 sessions this week. Consistency first.",exercises:["20 min cardio (walk/jog/bike)","Circuit: Squats 3x15, Push-Ups 3x10, Rows 3x10","Plank 3x30s"]},
      {week:2,focus:"Add Intensity",date:"Wk 2",rounds:4,duration:"45",notes:"Slightly harder this week.",exercises:["25 min cardio","Circuit: Squats 3x15, Lunges 3x12, Push-Ups 3x12","Plank 3x40s"]},
      {week:3,focus:"HIIT Introduction",date:"Wk 3",rounds:4,duration:"45",notes:"One HIIT session this week.",exercises:["HIIT: 20s on / 10s off x 8 rounds","Steady cardio 20 mins x 2 sessions","Strength circuit"]},
      {week:4,focus:"Strength + Cardio",date:"Wk 4",rounds:4,duration:"50",notes:"Mix it up. More muscle = more burn.",exercises:["Deadlift 3x12","Bench Press 3x12","20 min steady cardio","HIIT 15 mins"]},
      {week:5,focus:"Push the Cardio",date:"Wk 5",rounds:4,duration:"50",notes:"30 min cardio sessions now.",exercises:["30 min run/bike/row","Full body strength 3x12","HIIT finisher 10 mins"]},
      {week:6,focus:"Mid-Point Check",date:"Wk 6",rounds:4,duration:"50",notes:"How's progress? Adjust nutrition if needed.",exercises:["30 min cardio","Full body strength","Active recovery walk"]},
      {week:7,focus:"Increase Strength",date:"Wk 7",rounds:4,duration:"55",notes:"Heavier weights, fewer reps.",exercises:["Squat 4x8","Deadlift 4x8","Upper body 4x10","25 min cardio"]},
      {week:8,focus:"HIIT Focus",date:"Wk 8",rounds:4,duration:"50",notes:"2x HIIT sessions this week.",exercises:["HIIT 20 mins x2","Strength 3x10","30 min steady cardio"]},
      {week:9,focus:"Peak Volume",date:"Wk 9",rounds:5,duration:"55",notes:"Biggest training week. Fuel well.",exercises:["5x sessions: alternating strength and cardio","HIIT finisher on strength days"]},
      {week:10,focus:"Maintain Momentum",date:"Wk 10",rounds:4,duration:"55",notes:"Keep it up — results are compounding.",exercises:["Full body strength 4x10","35 min cardio","2x HIIT"]},
      {week:11,focus:"Stay Consistent",date:"Wk 11",rounds:4,duration:"50",notes:"Habits are locked in by now.",exercises:["Strength 4x10","30 min cardio","Active recovery"]},
      {week:12,focus:"Final Week 🔥",date:"Wk 12",rounds:4,duration:"50",notes:"Finish strong. Review progress and set next goals.",exercises:["Full body strength test","5K time trial","Progress check"]},
    ]
  }
};

// ---- DEFAULT GOALS BY GOAL TYPE ----
var GOAL_TARGETS = {
  "Hyrox": [
    {name:"Race Time",target:"45:00",current:"",unit:"mm:ss",category:"Hyrox"},
    {name:"Farmers Carry",target:"40",current:"",unit:"kg",category:"Hyrox"},
    {name:"Wall Ball Weight",target:"10",current:"",unit:"kg",category:"Hyrox"},
  ],
  "Marathon / Running": [
    {name:"5K Time",target:"22:00",current:"",unit:"mm:ss",category:"Running"},
    {name:"10K Time",target:"48:00",current:"",unit:"mm:ss",category:"Running"},
    {name:"Weekly Distance",target:"40",current:"",unit:"km",category:"Running"},
  ],
  "Strength & Muscle": [
    {name:"Bench Press 1RM",target:"100",current:"",unit:"kg",category:"Strength"},
    {name:"Squat 1RM",target:"120",current:"",unit:"kg",category:"Strength"},
    {name:"Deadlift 1RM",target:"140",current:"",unit:"kg",category:"Strength"},
  ],
  "Weight Loss": [
    {name:"Target Weight",target:"",current:"",unit:"kg",category:"Body"},
    {name:"Daily Calories",target:"2000",current:"",unit:"kcal",category:"Nutrition"},
  ],
  "General Fitness": [
    {name:"Weekly Sessions",target:"4",current:"",unit:"sessions",category:"Fitness"},
    {name:"Resting Heart Rate",target:"60",current:"",unit:"bpm",category:"Health"},
  ],
};

// ---- PLAN GENERATION ----
async function generateMyPlan(profile, transcript) {
  var prompt = "Create a personalised training programme as a JSON array. Return ONLY a valid JSON array, no markdown:\n[{\"week\":1,\"focus\":\"\",\"date\":\"\",\"rounds\":1,\"duration\":\"45\",\"notes\":\"\",\"exercises\":[]}]\n\nMake it specific, progressive, and right for this athlete:\n"+JSON.stringify(profile)+"\n\nConversation:\n"+transcript.slice(0,2000);
  var result = await callAI([{role:"user",content:prompt}], "Return only a valid JSON array. No markdown. No backticks.");
  return parseJsonSafe(result) || [];
}

async function generateHyroxPlan(profile, raceDate) {
  var weeks = weeksUntil(raceDate);
  if(!weeks||weeks<1) return [];
  var prompt = "Create a Hyrox training programme for "+weeks+" weeks until race on "+raceDate+". Return ONLY a valid JSON array:\n[{\"week\":1,\"focus\":\"\",\"date\":\"\",\"rounds\":3,\"duration\":\"45\",\"notes\":\"\",\"exercises\":[]}]\n\nStructure: build base → volume → race pace → taper → race week.\nInclude specific Hyrox exercises: Ski Erg, Burpee Broad Jump, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls, Running.\nFitness level: "+(profile.fitnessLevel||"intermediate")+", days/week: "+(profile.daysPerWeek||3)+".";
  var result = await callAI([{role:"user",content:prompt}], "Return only a valid JSON array. No markdown. No backticks.");
  return parseJsonSafe(result) || [];
}

// ---- PRIMITIVES ----
function HR() { return <div style={{height:1,background:C.border}}/>; }
function Cap(props) {
  return <div style={Object.assign({},{fontSize:props.size||9,fontWeight:700,letterSpacing:"0.13em",textTransform:"uppercase",color:props.color||C.muted,fontFamily:F},props.style||{})}>{props.children}</div>;
}
function Tag(props) {
  var color=props.color||C.accent;
  return <span style={{display:"inline-block",padding:"3px 8px",fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:color,border:"1px solid "+color+"40",fontFamily:F}}>{props.children}</span>;
}
function Bar(props) {
  return <div style={{height:2,background:C.faint}}><div style={{height:2,width:Math.min(100,props.pct||0)+"%",background:props.color||C.accent,transition:"width .4s"}}/></div>;
}
function Btn(props) {
  var bg=props.danger?"transparent":props.outline?"transparent":props.disabled?C.surface2:C.accent;
  var col=props.danger?C.danger:props.outline?C.muted:props.disabled?C.faint:"#000";
  var shadow=props.outline?"inset 0 0 0 1px "+C.border:props.danger?"inset 0 0 0 1px "+C.danger+"40":"none";
  return <button onClick={props.onClick} disabled={props.disabled} style={Object.assign({},{padding:props.small?"6px 12px":"12px 18px",border:"none",cursor:props.disabled?"default":"pointer",fontFamily:F,fontSize:props.small?8:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",width:props.full?"100%":"auto",background:bg,color:col,boxShadow:shadow},props.style||{})}>{props.children}</button>;
}
function Inp(props) {
  var base={display:"block",width:"100%",boxSizing:"border-box",background:C.surface,border:"1px solid "+C.border,color:C.text,fontSize:14,fontFamily:F,padding:"10px 13px",outline:"none"};
  var st=Object.assign({},base,props.style||{});
  if(props.rows) return <textarea value={props.value} onChange={props.onChange} placeholder={props.placeholder} rows={props.rows} style={Object.assign({},st,{resize:"none"})}/>;
  return <input type={props.type||"text"} value={props.value} onChange={props.onChange} placeholder={props.placeholder} onKeyDown={props.onKeyDown} style={st}/>;
}
function Sel(props) {
  return <select value={props.value} onChange={props.onChange} style={Object.assign({},{display:"block",width:"100%",boxSizing:"border-box",background:C.surface,border:"1px solid "+C.border,color:C.text,fontSize:13,fontFamily:F,padding:"10px 13px",outline:"none",appearance:"none"},props.style||{})}>{props.children}</select>;
}
function Ring(props) {
  var pct=props.pct||0,size=props.size||48,primary=props.primary||C.accent;
  var r=18,circ=2*Math.PI*r,dash=Math.min((pct/100)*circ,circ);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{flexShrink:0}}>
      <circle cx="24" cy="24" r={r} fill="none" stroke={C.surface2} strokeWidth="4"/>
      <circle cx="24" cy="24" r={r} fill="none" stroke={primary} strokeWidth="4"
        strokeDasharray={dash+" "+circ} strokeLinecap="round" transform="rotate(-90 24 24)"/>
      <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
        style={{fontSize:pct>=100?7:8,fontWeight:700,fill:pct>=100?primary:C.text,fontFamily:F}}>
        {pct>=100?"done":pct+"%"}
      </text>
    </svg>
  );
}

function MsgContent(props) {
  var text=props.text||"";
  var blocks=[];
  text.trim().replace(/\n{3,}/g,"\n\n").split(/\n\n+/).forEach(function(b){
    var trimB=b.trim(); if(!trimB) return;
    var sublines=trimB.split("\n").map(function(s){return s.trim();}).filter(Boolean);
    if(sublines.length>1&&sublines.every(function(l){return /^[-*]\s/.test(l);})||sublines.length===1){blocks.push(trimB);return;}
    sublines.forEach(function(line){if(line)blocks.push(line);});
  });
  function renderInline(str) {
    var parts=str.split(/\*\*(.*?)\*\*/g),result=[];
    parts.forEach(function(part,i){
      if(!part) return;
      if(i%2===1) result.push(<strong key={i} style={{fontWeight:800,color:C.text}}>{part}</strong>);
      else result.push(part);
    });
    return result;
  }
  function renderBlock(block,bi) {
    var trimmed=block.trim(); if(!trimmed) return null;
    var lines=trimmed.split("\n").map(function(l){return l.trim();}).filter(Boolean);
    if(/^###\s/.test(trimmed)) return <div key={bi} style={{fontWeight:800,fontSize:11,color:C.accent,fontFamily:F,marginTop:12,marginBottom:5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{trimmed.replace(/^###\s+/,"")}</div>;
    if(/^\*\*[^*]+\*\*[.:]?$/.test(trimmed)) return <div key={bi} style={{fontWeight:800,fontSize:11,color:C.accent,fontFamily:F,marginTop:12,marginBottom:5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{trimmed.replace(/^\*\*|\*\*[.:]?$/g,"")}</div>;
    var isList=lines.length>=1&&lines.every(function(l){return /^[-*]\s/.test(l);});
    if(isList) return <ul key={bi} style={{margin:"4px 0 10px 0",padding:"0 0 0 16px",listStyle:"disc"}}>{lines.map(function(l,li){return <li key={li} style={{marginBottom:5,fontSize:13,lineHeight:1.6,fontFamily:F,color:C.text}}>{renderInline(l.replace(/^[-*]\s+/,""))}</li>;})}</ul>;
    return <p key={bi} style={{margin:"0 0 9px 0",lineHeight:1.65,fontSize:13,fontFamily:F,color:C.text}}>{renderInline(trimmed)}</p>;
  }
  return <div style={{margin:0,padding:0}}>{blocks.map(renderBlock).filter(Boolean)}</div>;
}

// ---- ONBOARDING CHAT ----
function OnboardingChat(props) {
  var userName=props.userName, onComplete=props.onComplete;
  var [msgs, setMsgs] = useState([]);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var [done, setDone] = useState(false);
  var [generating, setGenerating] = useState(false);
  var [genStatus, setGenStatus] = useState("");
  var scrollRef=useRef(null);

  var SYSTEM = "You are a friendly expert personal trainer doing an initial assessment with "+userName+". Have a natural back-and-forth conversation.\n\nCover these areas naturally (one or two at a time):\n1. Main goal — Hyrox, marathon, strength, weight loss, calisthenics, general fitness\n2. Current fitness level and training background\n3. Days per week and session length available\n4. Equipment — gym, home, outdoor\n5. Injuries or limitations\n6. Specific event or race — what and when\n7. What's worked or not worked before\n\nBe warm, encouraging, conversational. No bullet points or lists. Max 2-3 sentences per message. Sound like a real coach texting.\n\nWhen you have enough info (after 6-10 exchanges), end with exactly: [ASSESSMENT_COMPLETE]";

  useEffect(function(){
    setLoading(true);
    callAI([{role:"user",content:"hi, just signed up"}], SYSTEM).then(function(reply){
      setMsgs([{role:"assistant",content:reply.replace("[ASSESSMENT_COMPLETE]","").trim()}]);
      setLoading(false);
    }).catch(function(){setLoading(false);});
  },[]);

  useEffect(function(){ if(scrollRef.current) scrollRef.current.scrollIntoView({behavior:"smooth"}); },[msgs,loading]);

  function send(text) {
    if(!text.trim()||loading||done) return;
    var updated=msgs.concat([{role:"user",content:text.trim()}]);
    setMsgs(updated); setInput(""); setLoading(true);
    callAI(updated, SYSTEM).then(function(reply){
      var isComplete=reply.includes("[ASSESSMENT_COMPLETE]");
      var clean=reply.replace("[ASSESSMENT_COMPLETE]","").trim();
      setMsgs(function(m){return m.concat([{role:"assistant",content:clean}]);});
      setLoading(false);
      if(isComplete){setDone(true);setTimeout(function(){runGeneration(updated.concat([{role:"assistant",content:clean}]));},800);}
    }).catch(function(){setLoading(false);});
  }

  async function runGeneration(conversation) {
    setGenerating(true);
    var transcript=conversation.map(function(m){return m.role+": "+m.content;}).join("\n");
    setGenStatus("Analysing your assessment...");
    var profileStr=await callAI([{role:"user",content:"Extract profile JSON from this conversation. Return ONLY valid JSON:\n{\"goals\":[],\"fitnessLevel\":\"\",\"daysPerWeek\":3,\"sessionLength\":\"60 mins\",\"equipment\":[],\"injuries\":\"\",\"eventName\":\"\",\"eventDate\":\"\",\"age\":\"\",\"weight\":\"\"}\n\nConversation:\n"+transcript}], "Return only valid JSON. No markdown. No backticks.").catch(function(){return "{}";});
    var profile=parseJsonSafe(profileStr)||{};
    setGenStatus("Building your personalised plan...");
    var myPlan=await generateMyPlan(profile,transcript).catch(function(){return [];});
    var hyroxPlan=[];
    var goals=(profile.goals||[]).map(function(g){return g.toLowerCase();});
    if(goals.some(function(g){return g.includes("hyrox");})&&profile.eventDate){
      setGenStatus("Generating your Hyrox programme...");
      hyroxPlan=await generateHyroxPlan(profile,profile.eventDate).catch(function(){return [];});
    }
    // Build default targets
    var targets=[];
    var idCounter=1;
    (profile.goals||[]).forEach(function(g){
      var key=Object.keys(GOAL_TARGETS).find(function(k){return g.toLowerCase().includes(k.toLowerCase().split(" ")[0]);});
      if(key) GOAL_TARGETS[key].forEach(function(t){targets.push(Object.assign({},t,{id:idCounter++}));});
    });
    setGenerating(false);
    onComplete({profile:profile,myPlan:myPlan,hyroxPlan:hyroxPlan,targets:targets});
  }

  if(generating) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:32,maxWidth:480,margin:"0 auto"}}>
      <div style={{fontSize:36}}>⚡</div>
      <div style={{fontSize:18,fontWeight:800,color:C.text,fontFamily:F}}>Building your plan</div>
      <div style={{fontSize:13,color:C.accent,fontFamily:F,textAlign:"center"}}>{genStatus}</div>
      <div style={{width:"100%",maxWidth:300,height:2,background:C.border,marginTop:8}}>
        <div style={{height:2,background:C.accent,width:"60%",transition:"width 1s"}}/>
      </div>
      <div style={{fontSize:12,color:C.muted,fontFamily:F,textAlign:"center",lineHeight:1.6}}>This takes about 30 seconds. Your personalised programme is being created.</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"20px 20px 12px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
        <div style={{fontSize:22,fontWeight:900,letterSpacing:"0.06em",color:C.text,fontFamily:F}}>PULSE</div>
        <Cap color={C.accent} style={{marginTop:4}}>Initial Assessment — tell us about yourself</Cap>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
        {msgs.map(function(m,i){
          return (
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
              {m.role==="assistant"&&<Cap style={{marginBottom:4}}>Coach</Cap>}
              <div style={{maxWidth:"88%",padding:"12px 15px",background:m.role==="user"?C.accent:C.surface,color:m.role==="user"?"#000":C.text,border:"1px solid "+(m.role==="user"?C.accent:C.border),fontFamily:F,fontSize:14,lineHeight:1.65}}>{m.content}</div>
            </div>
          );
        })}
        {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><Cap style={{marginBottom:4}}>Coach</Cap><div style={{background:C.surface,border:"1px solid "+C.border,padding:"12px 15px",color:C.muted,fontFamily:F,fontSize:14}}>...</div></div>}
        <div ref={scrollRef}/>
      </div>
      {!done&&(
        <div style={{padding:"10px 20px 32px",borderTop:"1px solid "+C.border,background:C.bg,flexShrink:0}}>
          <div style={{display:"flex",gap:8}}>
            <Inp value={input} onChange={function(e){setInput(e.target.value);}} placeholder="Type your answer..." style={{flex:1}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}}/>
            <button onClick={function(){send(input);}} disabled={!input.trim()||loading} style={{padding:"10px 16px",background:C.accent,border:"none",cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#000",opacity:(!input.trim()||loading)?0.5:1,flexShrink:0}}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- WEEKLY CHECK-IN ----
function WeeklyCheckIn(props) {
  var userId=props.userId,userName=props.userName,onComplete=props.onComplete,onDismiss=props.onDismiss;
  var [msgs, setMsgs] = useState([]);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var [done, setDone] = useState(false);
  var scrollRef=useRef(null);
  var SYSTEM="You are a personal trainer doing a quick Monday check-in with "+userName+". Keep it brief — 3-4 exchanges max. Ask about last week, energy/soreness, anything to adjust. After enough info end with [CHECKIN_COMPLETE]. Be warm, 2 sentences max. Coach texting style.";

  useEffect(function(){
    setLoading(true);
    callAI([{role:"user",content:"Monday check-in"}],SYSTEM).then(function(reply){
      setMsgs([{role:"assistant",content:reply.replace("[CHECKIN_COMPLETE]","").trim()}]);
      setLoading(false);
    }).catch(function(){setLoading(false);});
  },[]);
  useEffect(function(){if(scrollRef.current)scrollRef.current.scrollIntoView({behavior:"smooth"});},[msgs]);

  function send(text) {
    if(!text.trim()||loading||done) return;
    var updated=msgs.concat([{role:"user",content:text.trim()}]);
    setMsgs(updated);setInput("");setLoading(true);
    callAI(updated,SYSTEM).then(function(reply){
      var isComplete=reply.includes("[CHECKIN_COMPLETE]");
      var clean=reply.replace("[CHECKIN_COMPLETE]","").trim();
      setMsgs(function(m){return m.concat([{role:"assistant",content:clean}]);});
      setLoading(false);
      if(isComplete)setDone(true);
    }).catch(function(){setLoading(false);});
  }

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div><div style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:F}}>Weekly Check-In</div><Cap color={C.accent} style={{marginTop:2}}>Monday Reset</Cap></div>
        <button onClick={onDismiss} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22,padding:0}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
        {msgs.map(function(m,i){
          return <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
            {m.role==="assistant"&&<Cap style={{marginBottom:4}}>Coach</Cap>}
            <div style={{maxWidth:"88%",padding:"12px 15px",background:m.role==="user"?C.accent:C.surface,color:m.role==="user"?"#000":C.text,border:"1px solid "+(m.role==="user"?C.accent:C.border),fontFamily:F,fontSize:14,lineHeight:1.65}}>{m.content}</div>
          </div>;
        })}
        {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><Cap style={{marginBottom:4}}>Coach</Cap><div style={{background:C.surface,border:"1px solid "+C.border,padding:"12px 15px",color:C.muted,fontFamily:F,fontSize:14}}>...</div></div>}
        <div ref={scrollRef}/>
      </div>
      <div style={{padding:"10px 20px 32px",borderTop:"1px solid "+C.border,background:C.bg,flexShrink:0}}>
        {done?(
          <Btn full onClick={function(){dbSave(userId,"last_checkin",getMonday());onComplete();}}>Done — Close Check-In</Btn>
        ):(
          <div style={{display:"flex",gap:8}}>
            <Inp value={input} onChange={function(e){setInput(e.target.value);}} placeholder="How did last week go?" style={{flex:1}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}}/>
            <button onClick={function(){send(input);}} disabled={!input.trim()||loading} style={{padding:"10px 16px",background:C.accent,border:"none",cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#000",opacity:(!input.trim()||loading)?0.5:1,flexShrink:0}}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- SETTINGS ----
function SettingsOverlay(props) {
  var user=props.user,profile=props.profile,notifSettings=props.notifSettings,onClose=props.onClose,onUpdate=props.onUpdate,onNotifUpdate=props.onNotifUpdate;
  var [section, setSection] = useState("profile");
  var [name, setName] = useState(profile.displayName||"");
  var [age, setAge] = useState(profile.age||"");
  var [weight, setWeight] = useState(profile.weight||"");
  var [eventName, setEventName] = useState(profile.eventName||"");
  var [eventDate, setEventDate] = useState(profile.eventDate||"");
  var [saved, setSaved] = useState(false);
  var [newPass, setNewPass] = useState("");
  var [confirmPass, setConfirmPass] = useState("");
  var [passMsg, setPassMsg] = useState("");
  var [passErr, setPassErr] = useState("");
  var [showNew, setShowNew] = useState(false);
  var [resetSent, setResetSent] = useState(false);

  function saveProfile(){
    var updated=Object.assign({},profile,{displayName:name,age:age,weight:weight,eventName:eventName,eventDate:eventDate});
    onUpdate(updated);setSaved(true);setTimeout(function(){setSaved(false);},2000);
  }
  async function changePassword(){
    setPassMsg("");setPassErr("");
    if(!newPass||newPass.length<6){setPassErr("Minimum 6 characters.");return;}
    if(newPass!==confirmPass){setPassErr("Passwords don't match.");return;}
    var res=await sb.auth.updateUser({password:newPass});
    if(res.error)setPassErr(res.error.message);
    else{setPassMsg("Password updated!");setNewPass("");setConfirmPass("");}
  }

  var pi={display:"block",width:"100%",boxSizing:"border-box",background:C.surface,border:"1px solid "+C.border,color:C.text,fontSize:14,fontFamily:F,padding:"10px 44px 10px 13px",outline:"none"};

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:100,display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{fontSize:14,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:C.text,fontFamily:F}}>Settings</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22,padding:0,lineHeight:1}}>×</button>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid "+C.border,flexShrink:0,overflowX:"auto"}}>
        {[["profile","Profile"],["account","Account"],["notif","Notifications"],["apps","Apps"]].map(function(s){
          return <button key={s[0]} onClick={function(){setSection(s[0]);}} style={{flex:"0 0 auto",padding:"10px 14px",background:"none",border:"none",borderBottom:"2px solid "+(section===s[0]?C.accent:"transparent"),color:section===s[0]?C.accent:C.muted,fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>{s[1]}</button>;
        })}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
        {section==="profile"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.surface,border:"1px solid "+C.border,padding:"12px 14px"}}>
              <Cap style={{marginBottom:4}}>Training Goals</Cap>
              <div style={{fontSize:13,color:C.accent,fontFamily:F,fontWeight:600,marginBottom:4}}>{(profile.goals||[]).join(", ")||"Not set"}</div>
              <div style={{fontSize:11,color:C.faint,fontFamily:F}}>Set during onboarding. Chat with your coach to update.</div>
            </div>
            <div><Cap style={{marginBottom:6}}>Display Name</Cap><Inp value={name} onChange={function(e){setName(e.target.value);}} placeholder="Your name"/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><Cap style={{marginBottom:6}}>Age</Cap><Inp type="number" value={age} onChange={function(e){setAge(e.target.value);}} placeholder="e.g. 28"/></div>
              <div><Cap style={{marginBottom:6}}>Weight (kg)</Cap><Inp type="number" value={weight} onChange={function(e){setWeight(e.target.value);}} placeholder="e.g. 80"/></div>
            </div>
            <div><Cap style={{marginBottom:6}}>Event / Race Name</Cap><Inp value={eventName} onChange={function(e){setEventName(e.target.value);}} placeholder="e.g. Hyrox London"/></div>
            <div><Cap style={{marginBottom:6}}>Event Date</Cap><input type="date" value={eventDate} onChange={function(e){setEventDate(e.target.value);}} style={{display:"block",width:"100%",boxSizing:"border-box",background:C.surface,border:"1px solid "+C.border,color:C.text,fontSize:14,fontFamily:F,padding:"10px 13px",outline:"none"}}/></div>
            <Btn onClick={saveProfile} full style={{background:saved?C.green:C.accent}}>{saved?"Saved!":"Save Profile"}</Btn>
          </div>
        )}
        {section==="account"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{background:C.surface,border:"1px solid "+C.border,padding:14}}><Cap style={{marginBottom:4}}>Email</Cap><div style={{fontSize:14,color:C.text,fontFamily:F}}>{user.email}</div></div>
            <div>
              <Cap style={{marginBottom:12}}>Change Password</Cap>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{position:"relative"}}>
                  <input type={showNew?"text":"password"} value={newPass} onChange={function(e){setNewPass(e.target.value);}} placeholder="New password" style={pi}/>
                  <button onClick={function(){setShowNew(!showNew);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:700,textTransform:"uppercase"}}>{showNew?"hide":"show"}</button>
                </div>
                <input type="password" value={confirmPass} onChange={function(e){setConfirmPass(e.target.value);}} placeholder="Confirm new password" style={pi}/>
                {passErr&&<div style={{fontSize:12,color:C.danger,fontFamily:F}}>{passErr}</div>}
                {passMsg&&<div style={{fontSize:12,color:C.green,fontFamily:F}}>{passMsg}</div>}
                <Btn onClick={changePassword} disabled={!newPass||!confirmPass} full>Update Password</Btn>
              </div>
            </div>
            <div style={{borderTop:"1px solid "+C.border,paddingTop:20}}>
              <Cap style={{marginBottom:8}}>Forgot your password?</Cap>
              <div style={{fontSize:12,color:C.muted,fontFamily:F,marginBottom:10}}>Send a reset link to {user.email}</div>
              {resetSent?<div style={{fontSize:12,color:C.green,fontFamily:F}}>Reset email sent!</div>:<Btn outline onClick={async function(){await sb.auth.resetPasswordForEmail(user.email);setResetSent(true);}} full>Send Reset Email</Btn>}
            </div>
            <div style={{borderTop:"1px solid "+C.border,paddingTop:20}}>
              <Btn danger onClick={function(){sb.auth.signOut();onClose();}} full>Sign Out</Btn>
            </div>
          </div>
        )}
        {section==="notif"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:12,color:C.muted,fontFamily:F,lineHeight:1.6,marginBottom:4}}>Coach notifications appear as cards in your Coach tab — never more than one per day.</div>
            {[["sunday","Sunday Week Summary","A review of how your week went every Sunday"],["nutrition","Nutrition Reminder","A nudge if you haven't logged food today"]].map(function(item){
              return <div key={item[0]} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 15px",background:C.surface,border:"1px solid "+C.border}}>
                <div style={{flex:1,minWidth:0,paddingRight:12}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:F,marginBottom:3}}>{item[1]}</div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F}}>{item[2]}</div>
                </div>
                <button onClick={function(){onNotifUpdate(item[0],!notifSettings[item[0]]);}} style={{width:42,height:24,borderRadius:12,background:notifSettings[item[0]]?C.accent:C.faint,border:"none",cursor:"pointer",position:"relative",flexShrink:0,transition:"background 0.2s"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#000",position:"absolute",top:3,left:notifSettings[item[0]]?21:3,transition:"left 0.2s"}}/>
                </button>
              </div>;
            })}
          </div>
        )}
        {section==="apps"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <StravaConnect onImport={function(){return Promise.resolve();}} settingsMode={true}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- AUTH ----
function AuthScreen(props) {
  var [mode, setMode] = useState("login");
  var [email, setEmail] = useState("");
  var [pass, setPass] = useState("");
  var [name, setName] = useState("");
  var [err, setErr] = useState("");
  var [loading, setLoading] = useState(false);
  var [showPass, setShowPass] = useState(false);

  async function doLogin(){setLoading(true);setErr("");var res=await sb.auth.signInWithPassword({email:email.trim(),password:pass});if(res.error){setErr(res.error.message);setLoading(false);return;}props.onAuth(res.data.user);}
  async function doSignup(){
    if(!name.trim()){setErr("Enter your name.");return;}
    if(pass.length<6){setErr("Password must be at least 6 characters.");return;}
    setLoading(true);setErr("");
    var res=await sb.auth.signUp({email:email.trim(),password:pass,options:{data:{display_name:name.trim()}}});
    if(res.error){setErr(res.error.message);setLoading(false);return;}
    if(res.data.user&&!res.data.session)setMode("confirm");
    else if(res.data.user)props.onAuth(res.data.user);
    setLoading(false);
  }

  if(mode==="confirm") return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:32}}>
      <div style={{width:"100%",maxWidth:360,textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:900,color:C.accent,fontFamily:F,marginBottom:16}}>Check your email</div>
        <div style={{fontSize:14,color:C.muted,fontFamily:F,lineHeight:1.6}}>Confirmation sent to <strong style={{color:C.text}}>{email}</strong>. Click it then log in.</div>
        <button onClick={function(){setMode("login");}} style={{marginTop:24,background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:F,textDecoration:"underline"}}>Back to login</button>
      </div>
    </div>
  );

  var psi={display:"block",width:"100%",boxSizing:"border-box",background:C.surface,border:"1px solid "+C.border,color:C.text,fontSize:14,fontFamily:F,padding:"10px 50px 10px 13px",outline:"none"};
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:32}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{marginBottom:40}}>
          <div style={{fontSize:40,fontWeight:900,letterSpacing:"0.06em",color:C.text,fontFamily:F,lineHeight:1}}>PULSE</div>
          <Cap color={C.muted} style={{marginTop:8}}>Train smarter. Race ready.</Cap>
        </div>
        <div style={{display:"flex",marginBottom:24,borderBottom:"1px solid "+C.border}}>
          {[["login","Log In"],["signup","Sign Up"]].map(function(item){
            return <button key={item[0]} onClick={function(){setMode(item[0]);setErr("");}} style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:"2px solid "+(mode===item[0]?C.accent:"transparent"),color:mode===item[0]?C.accent:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>{item[1]}</button>;
          })}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {mode==="signup"&&<div><Cap style={{marginBottom:5}}>Your Name</Cap><Inp value={name} onChange={function(e){setName(e.target.value);}} placeholder="First name"/></div>}
          <div><Cap style={{marginBottom:5}}>Email</Cap><Inp type="email" value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="you@email.com" onKeyDown={function(e){if(e.key==="Enter")mode==="login"?doLogin():doSignup();}}/></div>
          <div>
            <Cap style={{marginBottom:5}}>Password</Cap>
            <div style={{position:"relative"}}>
              <input type={showPass?"text":"password"} value={pass} onChange={function(e){setPass(e.target.value);}} placeholder={mode==="signup"?"Minimum 6 characters":"Your password"} onKeyDown={function(e){if(e.key==="Enter")mode==="login"?doLogin():doSignup();}} style={psi}/>
              <button onClick={function(){setShowPass(!showPass);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:700,textTransform:"uppercase"}}>{showPass?"hide":"show"}</button>
            </div>
          </div>
          {err&&<div style={{fontSize:12,color:C.danger,fontFamily:F,padding:"8px 12px",background:C.danger+"15",border:"1px solid "+C.danger+"40"}}>{err}</div>}
          <Btn onClick={mode==="login"?doLogin:doSignup} disabled={loading||!email.trim()||!pass} full style={{marginTop:4}}>{loading?"...":(mode==="login"?"Log In":"Create Account")}</Btn>
          {mode==="login"&&<button onClick={async function(){if(!email.trim()){setErr("Enter your email first.");return;}await sb.auth.resetPasswordForEmail(email.trim());setErr("Password reset email sent!");}} style={{background:"none",border:"none",color:C.faint,fontSize:11,cursor:"pointer",fontFamily:F,textAlign:"center",padding:"4px 0"}}>Forgot password?</button>}
        </div>
      </div>
    </div>
  );
}

// ---- SESSIONS TAB ----
function SessionsTab(props) {
  var sessions=props.sessions,onDelete=props.onDelete;
  var [openId, setOpenId] = useState(null);
  var sorted=sessions.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"28px 20px 20px"}}>
        <Cap>Training Log</Cap>
        <div style={{display:"flex",alignItems:"baseline",gap:10,marginTop:6}}>
          <div style={{fontSize:52,fontWeight:900,letterSpacing:"-0.04em",lineHeight:1,color:C.text,fontFamily:F}}>{sessions.length}</div>
          <div style={{color:C.muted,fontSize:13,fontFamily:F}}>sessions logged</div>
        </div>
      </div>
      <HR/>
      {sorted.length===0&&<div style={{padding:"40px 20px",textAlign:"center",fontSize:13,color:C.muted,fontFamily:F}}>No sessions yet. Head to Train to log your first session.</div>}
      {sorted.map(function(s){
        var isOpen=openId===s.id,dur=fmtDur(s.duration),hasTime=s.totalTime&&s.totalTime!=="--";
        return (
          <div key={s.id}>
            <button onClick={function(){setOpenId(isOpen?null:s.id);}} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:F,gap:12}}>
              <div style={{textAlign:"left",flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F}}>{s.type}</div>
                <Cap style={{marginTop:3}}>{s.date}{dur?" — "+dur:""} · {s.rounds} round{s.rounds!==1?"s":""}</Cap>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                {hasTime&&<div style={{fontSize:18,fontWeight:900,color:C.accent,fontFamily:F}}>{s.totalTime}</div>}
                {!hasTime&&dur&&<div style={{fontSize:13,color:C.muted,fontFamily:F}}>{dur}</div>}
                <Cap color={C.faint}>{isOpen?"^":"v"}</Cap>
              </div>
            </button>
            {isOpen&&(
              <div style={{background:C.surface,borderTop:"1px solid "+C.border,borderBottom:"1px solid "+C.border,padding:"14px 20px"}}>
                {s.notes&&<div style={{color:C.muted,fontSize:13,fontStyle:"italic",marginBottom:12,fontFamily:F}}>"{s.notes}"</div>}
                {Object.keys(s.weights||{}).filter(function(k){return s.weights[k];}).length>0&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                    {Object.keys(s.weights).filter(function(k){return s.weights[k];}).map(function(k){
                      return <div key={k} style={{background:C.surface2,border:"1px solid "+C.border,padding:"8px 10px"}}>
                        <div style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:F}}>{s.weights[k]}<span style={{fontSize:9,color:C.muted}}>kg</span></div>
                        <Cap style={{marginTop:2}}>{k}</Cap>
                      </div>;
                    })}
                  </div>
                )}
                {(s.exercises||[]).map(function(ex,i){
                  return <div key={i} style={{marginBottom:10}}>
                    <Cap color={C.text} size={10} style={{marginBottom:5}}>{ex.name}</Cap>
                    {(ex.sets||[]).map(function(set,j){
                      return <div key={j} style={{display:"flex",gap:10,alignItems:"center",paddingBottom:5,borderBottom:"1px solid "+C.faint,marginBottom:5}}>
                        <Cap color={C.faint}>S{j+1}</Cap>
                        {set.reps&&<span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:F}}>{set.reps} <span style={{color:C.muted,fontWeight:400}}>reps</span></span>}
                        {set.weight&&<span style={{background:C.surface2,border:"1px solid "+C.border,padding:"2px 8px",fontSize:11,color:C.muted,fontFamily:F}}>{set.weight}</span>}
                      </div>;
                    })}
                  </div>;
                })}
                {s.runData&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
                    {[["Dist",s.runData.distance+"km"],["Time",s.runData.time],["Pace",s.runData.pace||"--"]].map(function(item){
                      return <div key={item[0]} style={{background:C.surface2,border:"1px solid "+C.border,padding:"8px 10px"}}>
                        <div style={{fontSize:12,fontWeight:700,color:item[0]==="Pace"?C.accent:C.text,fontFamily:F}}>{item[1]}</div>
                        <Cap>{item[0]}</Cap>
                      </div>;
                    })}
                  </div>
                )}
                <button onClick={function(){onDelete(s.id);}} style={{background:"none",border:"none",cursor:"pointer",color:C.faint,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:F,padding:0,marginTop:4}}>Delete</button>
              </div>
            )}
            <HR/>
          </div>
        );
      })}
    </div>
  );
}

// ---- STRAVA CONNECT ----
function StravaConnect(props) {
  var onImport=props.onImport,settingsMode=props.settingsMode||false;
  var [token, setToken] = useState(null);
  var [runs, setRuns] = useState([]);
  var [loading, setLoading] = useState(false);
  var [importing, setImporting] = useState(null);
  var [err, setErr] = useState("");
  var CLIENT_ID="204822";
  var REDIRECT_URI="https://stevens-gym-vnhb.vercel.app/strava-callback";

  useEffect(function(){
    var params=new URLSearchParams(window.location.search);
    var code=params.get("code");
    if(code){
      window.history.replaceState({},"",window.location.pathname);setLoading(true);
      fetch("/api/strava-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:code,grant_type:"authorization_code"})})
      .then(function(r){return r.json();}).then(function(data){
        if(data.access_token){var t={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at};localStorage.setItem("strava_oauth",JSON.stringify(t));setToken(t);if(!settingsMode)fetchRuns(t.access_token);else setLoading(false);}
        else{setErr("Connection failed.");setLoading(false);}
      }).catch(function(){setErr("Error.");setLoading(false);});
    } else {
      try{var saved=localStorage.getItem("strava_oauth");if(saved){var t=JSON.parse(saved);if(Date.now()/1000>t.expires_at-300)doRefresh(t.refresh_token);else{setToken(t);if(!settingsMode)fetchRuns(t.access_token);}}}catch(e){}
    }
  },[]);

  function doRefresh(rt){
    setLoading(true);
    fetch("/api/strava-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grant_type:"refresh_token",refresh_token:rt})})
    .then(function(r){return r.json();}).then(function(data){
      if(data.access_token){var t={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at};localStorage.setItem("strava_oauth",JSON.stringify(t));setToken(t);if(!settingsMode)fetchRuns(t.access_token);else setLoading(false);}
      else{localStorage.removeItem("strava_oauth");setToken(null);setLoading(false);}
    }).catch(function(){setLoading(false);});
  }
  function fetchRuns(at){
    setLoading(true);setErr("");
    fetch("/api/strava-activities",{headers:{Authorization:"Bearer "+at}})
    .then(function(r){return r.json();}).then(function(data){if(Array.isArray(data))setRuns(data);else setErr("Could not load runs.");setLoading(false);})
    .catch(function(){setErr("Failed.");setLoading(false);});
  }
  function connectStrava(){window.location.href="https://www.strava.com/oauth/authorize?client_id="+CLIENT_ID+"&redirect_uri="+encodeURIComponent(REDIRECT_URI)+"&response_type=code&scope=activity:read_all";}
  function disconnect(){localStorage.removeItem("strava_oauth");setToken(null);setRuns([]);}
  function pace(run){if(!run.distance||!run.moving_time)return null;var p=(run.moving_time/60)/parseFloat(run.distance);return Math.floor(p)+":"+String(Math.round((p%1)*60)).padStart(2,"0")+"/km";}
  function importRun(run){
    setImporting(run.id);var p=pace(run);
    onImport({id:Date.now()+"",date:run.date,type:"Run",totalTime:run.time,duration:run.time,rounds:1,notes:[run.name,p?"Pace: "+p:null].filter(Boolean).join(" — "),weights:{},exercises:[],runData:{distance:parseFloat(run.distance),time:run.time,pace:p}}).then(function(){setImporting(null);});
  }

  if(!token) return (
    <div style={{background:C.surface,border:"1px solid "+C.border,padding:20,textAlign:"center"}}>
      <div style={{fontSize:28,marginBottom:8}}>🏃</div>
      <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F,marginBottom:6}}>Connect Strava</div>
      <div style={{fontSize:13,color:C.muted,fontFamily:F,lineHeight:1.6,marginBottom:16}}>Import your recent runs directly into your training log.</div>
      <button onClick={connectStrava} style={{display:"block",width:"100%",padding:"13px",background:C.orange,border:"none",color:"#fff",fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>Connect with Strava</button>
      {err&&<div style={{fontSize:12,color:C.danger,fontFamily:F,marginTop:8}}>{err}</div>}
    </div>
  );

  if(settingsMode) return (
    <div style={{background:C.surface,border:"1px solid "+C.border,padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:10,height:10,borderRadius:"50%",background:C.green}}/><div><div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F}}>Strava</div><Cap color={C.green}>Connected</Cap></div></div>
        <button onClick={disconnect} style={{background:"none",border:"1px solid "+C.border,color:C.muted,padding:"6px 12px",fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>Disconnect</button>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:C.green}}/><Cap color={C.green}>Strava Connected</Cap></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={function(){fetchRuns(token.access_token);}} style={{background:"none",border:"1px solid "+C.border,color:C.muted,padding:"4px 10px",fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>Refresh</button>
          <button onClick={disconnect} style={{background:"none",border:"none",color:C.faint,fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>Disconnect</button>
        </div>
      </div>
      {loading&&<div style={{textAlign:"center",padding:16,color:C.muted,fontFamily:F,fontSize:13}}>Loading runs...</div>}
      {err&&<div style={{fontSize:12,color:C.danger,fontFamily:F}}>{err}</div>}
      {!loading&&runs.length===0&&<div style={{textAlign:"center",padding:16,color:C.muted,fontFamily:F,fontSize:13}}>No recent runs found.</div>}
      {runs.map(function(run){
        var p=pace(run);
        return (
          <div key={run.id} style={{background:C.surface,border:"1px solid "+C.border}}>
            <div style={{padding:"12px 14px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{run.name}</div><Cap style={{marginTop:2}}>{run.date}</Cap></div>
              <Btn onClick={function(){importRun(run);}} disabled={importing===run.id} small style={{background:C.accentDim,color:C.accent,boxShadow:"inset 0 0 0 1px "+C.accent+"40",flexShrink:0}}>{importing===run.id?"...":"Import"}</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,padding:"10px 14px"}}>
              {[["Dist",run.distance+"km"],["Time",run.time],["Pace",p||"--"]].map(function(item){
                return <div key={item[0]} style={{background:C.surface2,border:"1px solid "+C.border,padding:"6px 8px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:item[0]==="Pace"?C.accent:C.text,fontFamily:F}}>{item[1]}</div>
                  <Cap>{item[0]}</Cap>
                </div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- TRAIN TAB ----
function TrainTab(props) {
  var onSave=props.onSave;
  var [sub, setSub] = useState("strength");
  var [sDate, setSDate] = useState(getToday());
  var [sType, setSType] = useState("Strength");
  var [sDur, setSDur] = useState("");
  var [exs, setExs] = useState([{name:"",sets:[{weight:"",reps:""}]}]);
  var [sSaved, setSSaved] = useState(false);
  var [hDate, setHDate] = useState(getToday());
  var [hTime, setHTime] = useState("");
  var [hRounds, setHRounds] = useState("3");
  var [hWB, setHWB] = useState("");
  var [hFC1, setHFC1] = useState("");
  var [hFC2, setHFC2] = useState("");
  var [hLunge, setHLunge] = useState("");
  var [hNotes, setHNotes] = useState("");
  var [hSaved, setHSaved] = useState(false);
  var [rDate, setRDate] = useState(getToday());
  var [rType, setRType] = useState("Easy Run");
  var [rDist, setRDist] = useState("");
  var [rTime, setRTime] = useState("");
  var [rNotes, setRNotes] = useState("");
  var [rSaved, setRSaved] = useState(false);

  function addEx(){setExs(function(e){return e.concat([{name:"",sets:[{weight:"",reps:""}]}]);});}
  function remEx(i){setExs(function(e){return e.filter(function(_,x){return x!==i;});});}
  function setN(i,v){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{name:v}):ex;});});}
  function addSet(i){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{sets:ex.sets.concat([{weight:"",reps:""}])}):ex;});});}
  function remSet(i,j){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{sets:ex.sets.filter(function(_,y){return y!==j;})}):ex;});});}
  function upSet(i,j,f,v){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{sets:ex.sets.map(function(s,y){return y===j?Object.assign({},s,{[f]:v}):s;})}):ex;});});}

  function saveStrength(){
    var filled=exs.filter(function(ex){return ex.name.trim();}).map(function(ex){return {name:ex.name.trim(),sets:ex.sets.filter(function(s){return s.reps||s.weight;}).map(function(s){return {reps:s.reps?parseInt(s.reps):null,weight:s.weight?s.weight+"kg":null};})};});
    if(!filled.length)return;
    onSave({id:Date.now()+"",date:sDate,type:sType,totalTime:"--",duration:sDur||"--",rounds:1,notes:filled.map(function(e){return e.name;}).join(", "),weights:{},exercises:filled}).then(function(){setSSaved(true);setExs([{name:"",sets:[{weight:"",reps:""}]}]);setSDur("");setTimeout(function(){setSSaved(false);},2500);});
  }
  function saveHyrox(){
    if(!hTime)return;
    onSave({id:Date.now()+"",date:hDate,type:"Hyrox Session",totalTime:hTime,duration:hTime,rounds:parseInt(hRounds)||3,notes:hNotes,weights:{"Wall Balls":hWB,"Farmers Carry L1":hFC1,"Farmers Carry L2":hFC2,"Lunge Bag":hLunge},exercises:[]}).then(function(){setHSaved(true);setHTime("");setHWB("");setHFC1("");setHFC2("");setHLunge("");setHNotes("");setTimeout(function(){setHSaved(false);},2500);});
  }
  var rPace=null;
  if(rDist&&rTime&&rTime.indexOf(":")>-1){try{rPace=calcPace(rDist,rTime);}catch(e){}}
  function saveRun(){
    if(!rDist||!rTime)return;
    onSave({id:Date.now()+"",date:rDate,type:rType,totalTime:rTime,duration:rTime,rounds:1,notes:[rNotes,rPace?"Pace: "+rPace:null].filter(Boolean).join(" — "),weights:{},exercises:[],runData:{distance:parseFloat(rDist),time:rTime,pace:rPace}}).then(function(){setRSaved(true);setRDist("");setRTime("");setRNotes("");setTimeout(function(){setRSaved(false);},2500);});
  }

  var di={display:"block",width:"100%",boxSizing:"border-box",background:C.surface,border:"1px solid "+C.border,color:C.text,fontSize:14,fontFamily:F,padding:"10px 13px",outline:"none"};

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"28px 20px 16px"}}><Cap>Log Session</Cap><div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.03em",color:C.text,marginTop:6,fontFamily:F}}>Train</div></div>
      <HR/>
      <div style={{display:"flex",borderBottom:"1px solid "+C.border,overflowX:"auto"}}>
        {[["strength","Strength"],["hyrox","Hyrox"],["run","Run"]].map(function(item){
          return <button key={item[0]} onClick={function(){setSub(item[0]);}} style={{flex:"0 0 auto",padding:"11px 18px",background:"none",border:"none",borderBottom:"2px solid "+(sub===item[0]?C.accent:"transparent"),color:sub===item[0]?C.accent:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>{item[1]}</button>;
        })}
      </div>

      {sub==="strength"&&(
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
          <div><Cap style={{marginBottom:5}}>Date</Cap><input type="date" value={sDate} onChange={function(e){setSDate(e.target.value);}} style={di}/></div>
          <div><Cap style={{marginBottom:5}}>Type</Cap><Sel value={sType} onChange={function(e){setSType(e.target.value);}}><option>Strength</option><option>Cardio</option><option>Mixed</option><option>Other</option></Sel></div>
          <div><Cap style={{marginBottom:5}}>Duration</Cap><Inp value={sDur} onChange={function(e){setSDur(e.target.value);}} placeholder="e.g. 1:00:00 (optional)"/></div>
          <HR/>
          {exs.map(function(ex,i){
            return <div key={i} style={{background:C.surface,border:"1px solid "+C.border}}>
              <div style={{padding:"10px 12px",display:"flex",gap:8,borderBottom:"1px solid "+C.border,alignItems:"center"}}>
                <Inp value={ex.name} onChange={function(e){setN(i,e.target.value);}} placeholder="Exercise name" style={{flex:1}}/>
                {exs.length>1&&<button onClick={function(){remEx(i);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,fontFamily:F,flexShrink:0}}>×</button>}
              </div>
              <div style={{padding:"8px 12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 20px",gap:8,marginBottom:6,alignItems:"center"}}><Cap color={C.faint}>#</Cap><Cap>kg</Cap><Cap>Reps</Cap><span/></div>
                {ex.sets.map(function(s,j){
                  return <div key={j} style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 20px",gap:8,marginBottom:6,alignItems:"center"}}>
                    <Cap color={C.faint} style={{textAlign:"center"}}>{j+1}</Cap>
                    <Inp type="number" value={s.weight} placeholder="kg" onChange={function(e){upSet(i,j,"weight",e.target.value);}}/>
                    <Inp type="number" value={s.reps} placeholder="reps" onChange={function(e){upSet(i,j,"reps",e.target.value);}}/>
                    {ex.sets.length>1?<button onClick={function(){remSet(i,j);}} style={{background:"none",border:"none",color:C.faint,cursor:"pointer",fontSize:10,fontFamily:F}}>×</button>:<span/>}
                  </div>;
                })}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:"1px solid "+C.border}}>
                <button onClick={function(){addSet(i);}} style={{padding:"8px 0",background:"none",border:"none",borderRight:"1px solid "+C.border,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,cursor:"pointer",fontFamily:F}}>+ Set</button>
                <button onClick={function(){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{sets:ex.sets.concat([Object.assign({},ex.sets[ex.sets.length-1])])}):ex;});});}} style={{padding:"8px 0",background:"none",border:"none",fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,cursor:"pointer",fontFamily:F}}>Repeat</button>
              </div>
            </div>;
          })}
          <Btn outline onClick={addEx} full>+ Add Exercise</Btn>
          <Btn onClick={saveStrength} full style={{background:sSaved?C.green:C.accent}}>{sSaved?"Saved!":"Save Session"}</Btn>
        </div>
      )}

      {sub==="hyrox"&&(
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
          <div><Cap style={{marginBottom:5}}>Date</Cap><input type="date" value={hDate} onChange={function(e){setHDate(e.target.value);}} style={di}/></div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
            <div><Cap style={{marginBottom:5}}>Total Time</Cap><Inp value={hTime} onChange={function(e){setHTime(e.target.value);}} placeholder="e.g. 47:32"/></div>
            <div><Cap style={{marginBottom:5}}>Rounds</Cap><Inp type="number" value={hRounds} onChange={function(e){setHRounds(e.target.value);}}/></div>
          </div>
          <Cap>Weights Used (kg)</Cap>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><Cap style={{marginBottom:5}}>Wall Balls</Cap><Inp type="number" value={hWB} onChange={function(e){setHWB(e.target.value);}} placeholder="kg"/></div>
            <div><Cap style={{marginBottom:5}}>Farmers Carry L1</Cap><Inp type="number" value={hFC1} onChange={function(e){setHFC1(e.target.value);}} placeholder="kg"/></div>
            <div><Cap style={{marginBottom:5}}>Farmers Carry L2</Cap><Inp type="number" value={hFC2} onChange={function(e){setHFC2(e.target.value);}} placeholder="kg"/></div>
            <div><Cap style={{marginBottom:5}}>Lunge Bag</Cap><Inp type="number" value={hLunge} onChange={function(e){setHLunge(e.target.value);}} placeholder="kg"/></div>
          </div>
          <div><Cap style={{marginBottom:5}}>Notes</Cap><Inp value={hNotes} onChange={function(e){setHNotes(e.target.value);}} placeholder="How did it feel?" rows={2}/></div>
          <Btn onClick={saveHyrox} disabled={!hTime} full style={{background:hSaved?C.green:C.accent}}>{hSaved?"Saved!":"Save Session"}</Btn>
        </div>
      )}

      {sub==="run"&&(
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:14}}>
          {/* Manual log */}
          <div style={{background:C.surface,border:"1px solid "+C.border,padding:16}}>
            <Cap style={{marginBottom:12}}>Log Manually</Cap>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><Cap style={{marginBottom:5}}>Date</Cap><input type="date" value={rDate} onChange={function(e){setRDate(e.target.value);}} style={di}/></div>
              <div><Cap style={{marginBottom:5}}>Run Type</Cap><Sel value={rType} onChange={function(e){setRType(e.target.value);}}><option>Easy Run</option><option>Tempo Run</option><option>Intervals</option><option>Long Run</option><option>5K Race</option><option>10K Race</option><option>Half Marathon</option><option>Marathon</option></Sel></div>
              <div><Cap style={{marginBottom:5}}>Distance (km)</Cap><Inp type="number" value={rDist} onChange={function(e){setRDist(e.target.value);}} placeholder="e.g. 5.0"/></div>
              <div><Cap style={{marginBottom:5}}>Time (mm:ss or h:mm:ss)</Cap><Inp value={rTime} onChange={function(e){setRTime(e.target.value);}} placeholder="e.g. 25:30"/></div>
              {rPace&&<div style={{background:C.accentDim,border:"1px solid "+C.accent+"30",padding:"12px 14px",display:"flex",justifyContent:"space-between"}}>
                <div><Cap>Pace</Cap><div style={{fontSize:20,fontWeight:900,color:C.accent,fontFamily:F,marginTop:2}}>{rPace}</div></div>
                <div style={{textAlign:"right"}}><Cap>Total</Cap><div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F,marginTop:2}}>{totalMins(rTime)||rTime}</div></div>
              </div>}
              <div><Cap style={{marginBottom:5}}>Notes</Cap><Inp value={rNotes} onChange={function(e){setRNotes(e.target.value);}} placeholder="Route, how it felt" rows={2}/></div>
              <Btn onClick={saveRun} disabled={!rDist||!rTime} full style={{background:rSaved?C.green:C.accent}}>{rSaved?"Saved!":"Save Run"}</Btn>
            </div>
          </div>
          {/* Strava */}
          <div>
            <Cap style={{marginBottom:10}}>Import from Strava</Cap>
            <StravaConnect onImport={onSave}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- WEEK FORM ----
function WeekForm(props) {
  var data=props.data,setData=props.setData;
  return (
    <div style={{background:C.surface,padding:"18px 20px",borderBottom:"1px solid "+C.border}}>
      <Tag color={C.accent}>{props.title}</Tag>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
        <div><Cap style={{marginBottom:5}}>Focus</Cap><Inp value={data.focus||""} onChange={function(e){setData(function(d){return Object.assign({},d,{focus:e.target.value});});}} placeholder="e.g. Race Pace Week"/></div>
        <div><Cap style={{marginBottom:5}}>Date Label</Cap><Inp value={data.date||""} onChange={function(e){setData(function(d){return Object.assign({},d,{date:e.target.value});});}} placeholder="e.g. 9 Mar"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><Cap style={{marginBottom:5}}>Rounds</Cap><Inp type="number" value={data.rounds||1} onChange={function(e){setData(function(d){return Object.assign({},d,{rounds:e.target.value});});}}/></div>
          <div><Cap style={{marginBottom:5}}>Duration (min)</Cap><Inp type="number" value={data.duration||"45"} onChange={function(e){setData(function(d){return Object.assign({},d,{duration:e.target.value});});}}/></div>
        </div>
        <div><Cap style={{marginBottom:5}}>Notes</Cap><Inp value={data.notes||""} onChange={function(e){setData(function(d){return Object.assign({},d,{notes:e.target.value});});}} rows={2} placeholder="Coaching notes"/></div>
        <div>
          <Cap style={{marginBottom:5}}>Activities</Cap>
          {(data.exercises||[""]).map(function(ex,j){
            return <div key={j} style={{display:"flex",gap:8,marginBottom:6}}>
              <Inp value={ex} onChange={function(e){var v=e.target.value;setData(function(d){return Object.assign({},d,{exercises:(d.exercises||[]).map(function(x,k){return k===j?v:x;})});});}} placeholder={"Item "+(j+1)}/>
              {(data.exercises||[]).length>1&&<button onClick={function(){setData(function(d){return Object.assign({},d,{exercises:(d.exercises||[]).filter(function(_,k){return k!==j;})});});}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:F}}>×</button>}
            </div>;
          })}
          <button onClick={function(){setData(function(d){return Object.assign({},d,{exercises:(d.exercises||[]).concat([""])});});}} style={{width:"100%",padding:"8px",background:"none",border:"1px dashed "+C.border,fontSize:9,fontWeight:700,textTransform:"uppercase",color:C.muted,cursor:"pointer",fontFamily:F}}>+ Item</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
          <Btn outline onClick={props.onCancel}>Cancel</Btn>
          <Btn onClick={props.onSave} disabled={!data.focus||!data.focus.trim()}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ---- PLAN TAB ----
function PlanTab(props) {
  var userId=props.userId,onPlanUpdate=props.onPlanUpdate,onLogSession=props.onLogSession,userProfile=props.userProfile,plans=props.plans,setPlans=props.setPlans;
  var [pt, setPt] = useState("main");
  var [openW, setOpenW] = useState(null);
  var [editing, setEditing] = useState(null);
  var [editD, setEditD] = useState(null);
  var [showAdd, setShowAdd] = useState(false);
  var [newW, setNewW] = useState({focus:"",notes:"",rounds:1,duration:"45",date:"",exercises:[""]});
  var [completing, setCompleting] = useState(null);
  var [compTime, setCompTime] = useState("");
  var [compNotes, setCompNotes] = useState("");
  var [doneWeeks, setDoneWeeks] = useState({});
  var [generatingHyrox, setGeneratingHyrox] = useState(false);

  var eventDate=(userProfile&&userProfile.eventDate)||"";
  var eventName=(userProfile&&userProfile.eventName)||"Race";
  var daysLeft=eventDate?Math.max(0,Math.ceil((new Date(eventDate)-new Date())/86400000)):null;

  useEffect(function(){
    dbLoad(userId,"done_weeks").then(function(d){if(d)setDoneWeeks(d);});
  },[]);

  function persist(d){setPlans(d);if(onPlanUpdate)onPlanUpdate(d);}
  var cur=(plans&&plans[pt])||[];
  function isDone(i){return !!doneWeeks[pt+"_"+i];}
  function startEdit(i){setEditing(i);setEditD(Object.assign({},cur[i],{exercises:(cur[i].exercises||[]).slice()}));}
  function saveEdit(){var u=Object.assign({},plans);u[pt]=cur.map(function(w,i){return i===editing?editD:w;});persist(u);setEditing(null);}
  function updateDate(i,v){var u=Object.assign({},plans);u[pt]=cur.map(function(w,x){return x===i?Object.assign({},w,{date:v}):w;});persist(u);}
  function removeWeek(i){var u=Object.assign({},plans);u[pt]=cur.filter(function(_,x){return x!==i;}).map(function(w,x){return Object.assign({},w,{week:x+1});});persist(u);}
  function addWeek(){
    if(!newW.focus.trim())return;
    var u=Object.assign({},plans);
    u[pt]=cur.concat([{week:cur.length+1,date:newW.date||"TBD",rounds:parseInt(newW.rounds)||1,duration:newW.duration,focus:newW.focus,notes:newW.notes,exercises:newW.exercises.filter(function(e){return e.trim();})}]);
    persist(u);setShowAdd(false);setNewW({focus:"",notes:"",rounds:1,duration:"45",date:"",exercises:[""]});
  }
  function completeWeek(w,i){
    onLogSession({id:Date.now()+"",date:getToday(),type:"Session",totalTime:compTime||"--",duration:compTime||"--",rounds:w.rounds,notes:["Wk "+w.week+": "+w.focus,compNotes].filter(Boolean).join(" — "),weights:{},exercises:[]}).then(function(){
      var nd=Object.assign({},doneWeeks);nd[pt+"_"+i]=getToday();
      setDoneWeeks(nd);dbSave(userId,"done_weeks",nd);
      setCompleting(null);setCompTime("");setCompNotes("");setOpenW(null);
    });
  }
  async function buildHyroxPlan(){
    if(!eventDate){alert("Set your race date in Settings first.");return;}
    setGeneratingHyrox(true);
    var plan=await generateHyroxPlan(userProfile||{},eventDate).catch(function(){return [];});
    var u=Object.assign({},plans,{hyrox:plan});
    persist(u);setGeneratingHyrox(false);setPt("hyrox");setOpenW(null);
  }

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"28px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><Cap>Plans</Cap><div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.03em",color:C.text,marginTop:6,fontFamily:F}}>Programme</div></div>
        {daysLeft!==null&&<div style={{textAlign:"right"}}><div style={{fontSize:32,fontWeight:900,letterSpacing:"-0.04em",color:C.accent,fontFamily:F}}>{daysLeft}</div><Cap>days to {eventName}</Cap></div>}
      </div>
      <HR/>
      <div style={{display:"flex",borderBottom:"1px solid "+C.border,overflowX:"auto"}}>
        {[["main","My Plan"],["hyrox","Hyrox"],["custom","Custom"]].map(function(t){
          return <button key={t[0]} onClick={function(){setPt(t[0]);setOpenW(null);setEditing(null);}} style={{flex:"0 0 auto",padding:"11px 18px",background:"none",border:"none",borderBottom:"2px solid "+(pt===t[0]?C.accent:"transparent"),color:pt===t[0]?C.accent:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>{t[1]}</button>;
        })}
      </div>

      {/* My Plan empty state — pre-built options */}
      {pt==="main"&&cur.length===0&&!showAdd&&(
        <div style={{padding:"16px 20px"}}>
          <div style={{fontSize:13,color:C.muted,fontFamily:F,lineHeight:1.6,marginBottom:14}}>Your AI-generated plan will appear here after onboarding. Or pick a pre-built programme to get started:</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {Object.entries(PREBUILT).map(function(entry){
              var key=entry[0],prog=entry[1];
              return <button key={key} onClick={function(){var u=Object.assign({},plans,{main:prog.plan});persist(u);}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:C.surface,border:"1px solid "+C.border,cursor:"pointer",textAlign:"left",width:"100%"}}>
                <div style={{fontSize:28,flexShrink:0}}>{prog.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F,marginBottom:3}}>{key}</div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F,marginBottom:4}}>{prog.desc}</div>
                  <Cap>{prog.weeks} weeks</Cap>
                </div>
                <Cap color={C.accent} style={{flexShrink:0}}>→</Cap>
              </button>;
            })}
            <Btn outline full onClick={function(){setShowAdd(true);}}>+ Build Custom</Btn>
          </div>
        </div>
      )}

      {/* Hyrox empty state */}
      {pt==="hyrox"&&cur.length===0&&!showAdd&&(
        <div style={{padding:"32px 20px",textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:12}}>🏋️</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:F,marginBottom:8}}>Hyrox Programme</div>
          <div style={{fontSize:13,color:C.muted,fontFamily:F,lineHeight:1.6,marginBottom:16}}>
            {eventDate?"AI will build a "+weeksUntil(eventDate)+"-week programme tailored to your "+eventDate+" race.":"Set your race date in Settings first."}
          </div>
          {eventDate?<Btn onClick={buildHyroxPlan} disabled={generatingHyrox} full style={{marginBottom:12}}>{generatingHyrox?"Building your programme...":"Generate Hyrox Programme"}</Btn>:<div style={{fontSize:12,color:C.accent,fontFamily:F}}>⚙ Set your race date in Settings</div>}
          <Btn outline full onClick={function(){setShowAdd(true);}}>+ Build Manually</Btn>
        </div>
      )}

      {/* Custom empty state */}
      {pt==="custom"&&cur.length===0&&!showAdd&&(
        <div style={{padding:"40px 20px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10,color:C.accent}}>+</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:F,marginBottom:6}}>Custom Plan</div>
          <div style={{fontSize:13,color:C.muted,fontFamily:F,lineHeight:1.6,marginBottom:20}}>Build your own programme week by week.</div>
          <Btn onClick={function(){setShowAdd(true);}} full>+ Add First Week</Btn>
        </div>
      )}

      {cur.map(function(w,i){
        return <div key={i}>
          {editing===i?(
            <WeekForm data={editD} setData={setEditD} onCancel={function(){setEditing(null);}} onSave={saveEdit} title={"Edit Week "+w.week}/>
          ):(
            <div>
              <button onClick={function(){setOpenW(openW===i?null:i);}} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,fontFamily:F}}>
                <div style={{width:32,textAlign:"center",flexShrink:0}}>
                  <Cap color={C.faint}>Wk</Cap>
                  <div style={{fontSize:22,fontWeight:900,color:isDone(i)?C.green:C.text,lineHeight:1.1,fontFamily:F}}>{w.week}</div>
                </div>
                <div style={{flex:1,textAlign:"left",minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F}}>{w.focus}</div>
                    {isDone(i)&&<Tag color={C.green}>Done</Tag>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}} onClick={function(e){e.stopPropagation();}}>
                    <Cap>{w.rounds}x {w.duration}min</Cap>
                    <input value={w.date||""} onChange={function(e){updateDate(i,e.target.value);}} onClick={function(e){e.stopPropagation();}} placeholder="date" style={{background:"transparent",border:"none",borderBottom:"1px solid "+C.border,color:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:F,outline:"none",width:80,padding:"0 0 1px",cursor:"text"}}/>
                  </div>
                </div>
                <Cap color={C.faint}>{openW===i?"^":"v"}</Cap>
              </button>
              {openW===i&&(
                <div style={{background:C.surface,borderTop:"1px solid "+C.border,borderBottom:"1px solid "+C.border,padding:"14px 20px"}}>
                  {(w.exercises||[]).map(function(ex,j){
                    return <div key={j} style={{display:"flex",gap:10,alignItems:"center",paddingBottom:6,borderBottom:"1px solid "+C.faint,marginBottom:6}}>
                      <div style={{width:16,height:16,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Cap color={C.muted}>{j+1}</Cap></div>
                      <span style={{fontSize:13,color:C.text,fontFamily:F}}>{ex}</span>
                    </div>;
                  })}
                  {w.notes&&<div style={{background:C.surface2,border:"1px solid "+C.border,padding:"8px 12px",margin:"10px 0 12px"}}><span style={{fontSize:13,color:C.muted,fontStyle:"italic",fontFamily:F}}>"{w.notes}"</span></div>}
                  {completing===i?(
                    <div style={{background:C.accentDim,border:"1px solid "+C.accent+"30",padding:12,marginBottom:10}}>
                      <Cap color={C.accent} style={{marginBottom:8}}>Log As Complete</Cap>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <Inp value={compTime} onChange={function(e){setCompTime(e.target.value);}} placeholder="Duration e.g. 47:32"/>
                        <Inp value={compNotes} onChange={function(e){setCompNotes(e.target.value);}} placeholder="How did it go?" rows={2}/>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <Btn outline onClick={function(){setCompleting(null);}}>Cancel</Btn>
                          <Btn onClick={function(){completeWeek(w,i);}}>Save to Log</Btn>
                        </div>
                      </div>
                    </div>
                  ):(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      <Btn outline small onClick={function(){startEdit(i);}}>Edit</Btn>
                      <Btn small onClick={function(){setCompleting(i);}} style={{background:isDone(i)?C.surface2:C.accent,color:isDone(i)?C.muted:"#000",boxShadow:isDone(i)?"inset 0 0 0 1px "+C.border:"none"}}>{isDone(i)?"Done":"Complete"}</Btn>
                      <Btn danger small onClick={function(){removeWeek(i);}}>Remove</Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <HR/>
        </div>;
      })}
      {showAdd?(
        <WeekForm data={newW} setData={setNewW} onCancel={function(){setShowAdd(false);}} onSave={addWeek} title="New Week"/>
      ):cur.length>0&&(
        <div style={{padding:"14px 20px",display:"flex",gap:10}}>
          <Btn outline full onClick={function(){setShowAdd(true);}}>+ Add Week</Btn>
          {pt==="hyrox"&&eventDate&&<Btn outline onClick={function(){var u=Object.assign({},plans,{hyrox:[]});persist(u);setTimeout(buildHyroxPlan,100);}} disabled={generatingHyrox}>{generatingHyrox?"...":"Regen"}</Btn>}
          {pt==="main"&&<Btn outline onClick={function(){var u=Object.assign({},plans,{main:[]});persist(u);}}>Change</Btn>}
        </div>
      )}
      {eventDate&&(
        <div style={{margin:"4px 20px 20px",background:C.accentDim,border:"1px solid "+C.accent+"30",padding:"14px 18px"}}>
          <Tag>Race Day</Tag>
          <div style={{fontSize:18,fontWeight:900,color:C.text,marginTop:8,fontFamily:F}}>{eventDate}</div>
          <Cap style={{marginTop:3}}>{eventName}</Cap>
        </div>
      )}
    </div>
  );
}

// ---- GOALS TAB ----
function GoalsTab(props) {
  var userId=props.userId;
  var [targets, setTargets] = useState([]);
  var [showAddFor, setShowAddFor] = useState(null);
  var [newT, setNewT] = useState({name:"",target:"",current:"",unit:"kg"});

  useEffect(function(){dbLoad(userId,"targets").then(function(d){if(d)setTargets(d);});},[]);
  function persist(d){setTargets(d);dbSave(userId,"targets",d);}
  function removeTarget(id){persist(targets.filter(function(t){return t.id!==id;}));}
  function updateField(id,field,val){persist(targets.map(function(t){return t.id===id?Object.assign({},t,{[field]:val}):t;}));}
  function addTarget(cat){
    if(!newT.name||!newT.target)return;
    persist(targets.concat([Object.assign({},newT,{id:Date.now(),category:cat})]));
    setShowAddFor(null);setNewT({name:"",target:"",current:"",unit:"kg"});
  }

  var cats=[];targets.forEach(function(t){if(cats.indexOf(t.category)===-1)cats.push(t.category);});
  var inpStyle={background:C.surface2,border:"1px solid "+C.border,color:C.text,fontSize:13,fontWeight:700,fontFamily:F,padding:"5px 8px",outline:"none",width:"100%",boxSizing:"border-box"};

  function catColor(cat){
    if(cat==="Hyrox")return C.accent;
    if(cat==="Strength")return C.green;
    if(cat==="Running")return C.orange;
    if(cat==="Body")return "#a78bfa";
    return C.accent;
  }

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"28px 20px 16px"}}><Cap>2026 Targets</Cap><div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.03em",color:C.text,marginTop:6,fontFamily:F}}>Goals</div></div>
      <HR/>
      {targets.length===0&&<div style={{padding:"40px 20px",textAlign:"center",fontSize:13,color:C.muted,fontFamily:F,lineHeight:1.6}}>No goals yet. Complete onboarding to generate targets, or add them below.</div>}
      {cats.map(function(cat){
        var color=catColor(cat);
        return <div key={cat}>
          <div style={{padding:"10px 20px 8px",background:C.surface2,borderBottom:"1px solid "+C.border}}><Cap color={color} size={10}>{cat}</Cap></div>
          {targets.filter(function(t){return t.category===cat;}).map(function(target){
            var pct=prgPct(target.target,target.current);
            return <div key={target.id} style={{borderBottom:"1px solid "+C.border}}>
              <div style={{padding:"12px 20px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F}}>{target.name}</div>
                    <Cap color={C.muted}>{target.unit}</Cap>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                    <div>
                      <Cap style={{marginBottom:3}}>Target</Cap>
                      <input value={target.target||""} onChange={function(e){updateField(target.id,"target",e.target.value);}} placeholder="target" style={Object.assign({},inpStyle,{color:color,background:C.faint})}/>
                    </div>
                    <div>
                      <Cap style={{marginBottom:3}}>Current</Cap>
                      <input value={target.current||""} onChange={function(e){updateField(target.id,"current",e.target.value);}} placeholder={target.unit} style={inpStyle}/>
                    </div>
                  </div>
                  {target.current&&(
                    <div style={{marginBottom:6}}>
                      <Bar pct={pct} color={pct>=100?color:color+"88"}/>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                        <Cap color={pct>=100?color:C.faint}>{pct>=100?"Target reached! 🎉":pct+"% there"}</Cap>
                        <Cap color={C.faint}>{target.current} → {target.target} {target.unit}</Cap>
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={function(){removeTarget(target.id);}} style={{background:"none",border:"none",cursor:"pointer",color:C.faint,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:F,padding:0}}>remove</button>
                  </div>
                </div>
                <Ring pct={pct} primary={color}/>
              </div>
            </div>;
          })}
          {showAddFor===cat?(
            <div style={{padding:"14px 20px",background:C.surface,borderBottom:"1px solid "+C.border}}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
                  <Inp value={newT.name} onChange={function(e){setNewT(function(n){return Object.assign({},n,{name:e.target.value});});}} placeholder="Goal name"/>
                  <Sel value={newT.unit} onChange={function(e){setNewT(function(n){return Object.assign({},n,{unit:e.target.value});}); }}>
                    <option>kg</option><option>mm:ss</option><option>h:mm:ss</option><option>km</option><option>/km</option><option>reps</option><option>mins</option><option>kcal</option><option>sessions</option><option>bpm</option>
                  </Sel>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <Inp value={newT.target} onChange={function(e){setNewT(function(n){return Object.assign({},n,{target:e.target.value});});}} placeholder="Target value"/>
                  <Inp value={newT.current||""} onChange={function(e){setNewT(function(n){return Object.assign({},n,{current:e.target.value});});}} placeholder="Current (optional)"/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <Btn outline onClick={function(){setShowAddFor(null);}}>Cancel</Btn>
                  <Btn onClick={function(){addTarget(cat);}} disabled={!newT.name||!newT.target}>Add</Btn>
                </div>
              </div>
            </div>
          ):(
            <div style={{padding:"10px 20px",borderBottom:"1px solid "+C.border}}>
              <button onClick={function(){setShowAddFor(cat);setNewT({name:"",target:"",current:"",unit:"kg"});}} style={{background:"none",border:"none",color:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F,padding:0}}>+ Add goal in {cat}</button>
            </div>
          )}
        </div>;
      })}
      <div style={{padding:"16px 20px"}}>
        <Cap style={{marginBottom:8}}>New Category</Cap>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["Hyrox","Strength","Running","Body","Nutrition","Performance","Other"].filter(function(c){return cats.indexOf(c)===-1;}).map(function(c){
            return <button key={c} onClick={function(){setShowAddFor(c);setNewT({name:"",target:"",current:"",unit:"kg"});}} style={{padding:"6px 12px",background:"none",border:"1px solid "+C.border,color:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>{c}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

// ---- COACH TAB ----
function CoachTab(props) {
  var sessions=props.sessions,userName=props.userName,userId=props.userId,userProfile=props.userProfile,notifSettings=props.notifSettings;
  var [nutLog, setNutLog] = useState([]);
  var [cals, setCals] = useState("");
  var [protein, setProtein] = useState("");
  var [carbs, setCarbs] = useState("");
  var [fat, setFat] = useState("");
  var [nutNotes, setNutNotes] = useState("");
  var [nutSaved, setNutSaved] = useState(false);
  var [showNutForm, setShowNutForm] = useState(false);
  var [sundayDismissed, setSundayDismissed] = useState(false);
  var [nutritionDismissed, setNutritionDismissed] = useState(false);
  var goals=(userProfile&&userProfile.goals)||[];
  var [msgs, setMsgs] = useState([{role:"assistant",content:"Hey "+userName+"."+(goals.length?" I know you're training for "+goals.join(" and ")+".":" Let's talk training.")+" Ask me anything about nutrition, fuelling, or your programme. You can type or tap the mic."}]);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var [speaking, setSpeaking] = useState(false);
  var [listening, setListening] = useState(false);
  var [voiceOn, setVoiceOn] = useState(true);
  var scrollRef=useRef(null);
  var recognitionRef=useRef(null);

  var isSunday=new Date().getDay()===0;
  var todayNut=nutLog.find(function(e){return e.date===getToday();});
  var showSundayCard=notifSettings.sunday&&isSunday&&!sundayDismissed;
  var showNutritionCard=notifSettings.nutrition&&!todayNut&&!nutritionDismissed;

  useEffect(function(){
    dbLoad(userId,"nut_log").then(function(d){if(d)setNutLog(d);});
    dbLoad(userId,"voice_on").then(function(d){if(d!==null)setVoiceOn(d);});
  },[]);
  useEffect(function(){if(scrollRef.current)scrollRef.current.scrollIntoView({behavior:"smooth"});},[msgs]);

  function saveNutrition(){
    if(!cals)return;
    var entry={id:Date.now(),date:getToday(),cals:cals,protein:protein,carbs:carbs,fat:fat,notes:nutNotes};
    var newLog=nutLog.filter(function(e){return e.date!==getToday();}).concat([entry]);
    setNutLog(newLog);dbSave(userId,"nut_log",newLog);
    setNutSaved(true);setShowNutForm(false);setTimeout(function(){setNutSaved(false);},2000);
  }

  var TARGET_P=170;

  function sendMessage(text){
    if(!text.trim()||loading)return;
    var updated=msgs.concat([{role:"user",content:text.trim()}]);
    setMsgs(updated);setInput("");setLoading(true);
    var sessSum=sessions.slice(-5).map(function(s){return s.date+": "+s.type+" "+(s.notes||"");}).join("\n");
    var nutSum=nutLog.slice(-3).map(function(e){return e.date+": "+e.cals+"kcal P:"+e.protein+"g";}).join("\n");
    var profileSum=userProfile?"Age:"+(userProfile.age||"?")+", Weight:"+(userProfile.weight||"?")+"kg, Goals:"+(userProfile.goals||[]).join(", ")+", Level:"+(userProfile.fitnessLevel||"unknown")+(userProfile.eventName?", Event:"+userProfile.eventName+" on "+userProfile.eventDate:""):"";
    var system="You are a personal trainer and sports nutritionist coaching "+userName+".\n\nATHLETE: "+profileSum+"\n\nFORMAT: Max 3 short paragraphs. **bold** key info. End with one question.\nTONE: Direct, warm, coach texting. No waffle.\n\nSessions:\n"+sessSum+"\nNutrition:\n"+(nutSum||"Nothing logged");
    callAI(updated.map(function(m){return {role:m.role,content:m.content};}),system).then(function(reply){
      setMsgs(function(m){return m.concat([{role:"assistant",content:reply}]);});
      if(voiceOn){setSpeaking(true);var spoken=reply.replace(/\*\*([^*]+)\*\*/g,"$1").replace(/^[-*]\s/gm,"").slice(0,400);speakEL(spoken).catch(function(){}).then(function(){setSpeaking(false);});}
    }).catch(function(){setMsgs(function(m){return m.concat([{role:"assistant",content:"Connection issue. Try again."}]);});})
    .then(function(){setLoading(false);});
  }

  function startListening(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("Try Chrome.");return;}var r=new SR();r.lang="en-GB";r.continuous=false;r.interimResults=false;recognitionRef.current=r;r.onstart=function(){setListening(true);};r.onresult=function(e){setListening(false);sendMessage(e.results[0][0].transcript);};r.onerror=function(){setListening(false);};r.onend=function(){setListening(false);};r.start();}
  function stopListening(){if(recognitionRef.current)recognitionRef.current.stop();setListening(false);}
  function toggleVoice(){var nv=!voiceOn;setVoiceOn(nv);dbSave(userId,"voice_on",nv);}

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 116px)",overflow:"hidden"}}>
      {/* Proactive cards */}
      {(showSundayCard||showNutritionCard)&&(
        <div style={{flexShrink:0,borderBottom:"1px solid "+C.border,padding:"10px 16px",display:"flex",flexDirection:"column",gap:8,maxHeight:"35%",overflowY:"auto"}}>
          {showSundayCard&&(
            <div style={{background:C.surface,border:"1px solid "+C.accent+"30",padding:"11px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                <Cap color={C.accent}>Week Summary</Cap>
                <Cap color={C.faint}>Sunday</Cap>
              </div>
              <div style={{fontSize:13,color:C.text,fontFamily:F,lineHeight:1.6,marginBottom:6}}>You logged {sessions.filter(function(s){return s.date>=getMonday();}).length} sessions this week. How did it feel overall? Anything to adjust for next week?</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){sendMessage("Here's my week summary");}} style={{padding:"5px 10px",background:C.accentDim,border:"1px solid "+C.accent+"40",color:C.accent,fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F,letterSpacing:"0.1em"}}>Chat with Coach</button>
                <button onClick={function(){setSundayDismissed(true);}} style={{background:"none",border:"none",color:C.faint,fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F,letterSpacing:"0.1em"}}>Dismiss</button>
              </div>
            </div>
          )}
          {showNutritionCard&&(
            <div style={{background:C.surface,border:"1px solid "+C.border,padding:"11px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                <Cap>Nutrition Reminder</Cap>
                <Cap color={C.faint}>Today</Cap>
              </div>
              <div style={{fontSize:13,color:C.text,fontFamily:F,lineHeight:1.6,marginBottom:6}}>You haven't logged food today. Hit your protein target to support your training.</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){setShowNutForm(true);setNutritionDismissed(true);}} style={{padding:"5px 10px",background:C.accentDim,border:"1px solid "+C.accent+"40",color:C.accent,fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F,letterSpacing:"0.1em"}}>Log Now</button>
                <button onClick={function(){setNutritionDismissed(true);}} style={{background:"none",border:"none",color:C.faint,fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F,letterSpacing:"0.1em"}}>Dismiss</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nutrition panel */}
      <div style={{flexShrink:0,borderBottom:"2px solid "+C.border,maxHeight:"40%",overflow:"auto"}}>
        <div style={{padding:"12px 20px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><Cap>Nutrition</Cap><div style={{fontSize:14,fontWeight:900,color:C.text,fontFamily:F,marginTop:2}}>Today's Fuel</div></div>
          <div style={{display:"flex",gap:6}}>
            <a href="https://cronometer.com/diary/" target="_blank" rel="noreferrer" style={{padding:"5px 10px",background:"#f97316",color:"#fff",fontSize:8,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",textDecoration:"none",fontFamily:F}}>Cronometer</a>
            <button onClick={function(){setShowNutForm(function(s){return !s;});}} style={{background:"none",border:"1px solid "+C.border,color:C.muted,padding:"5px 10px",fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>{showNutForm?"cancel":"+ Log"}</button>
          </div>
        </div>
        {showNutForm&&(
          <div style={{padding:"0 20px 12px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><Cap style={{marginBottom:4}}>Calories</Cap><Inp type="number" value={cals} onChange={function(e){setCals(e.target.value);}} placeholder="e.g. 2400"/></div>
              <div><Cap style={{marginBottom:4}}>Protein (g)</Cap><Inp type="number" value={protein} onChange={function(e){setProtein(e.target.value);}} placeholder="e.g. 150"/></div>
              <div><Cap style={{marginBottom:4}}>Carbs (g)</Cap><Inp type="number" value={carbs} onChange={function(e){setCarbs(e.target.value);}} placeholder="e.g. 280"/></div>
              <div><Cap style={{marginBottom:4}}>Fat (g)</Cap><Inp type="number" value={fat} onChange={function(e){setFat(e.target.value);}} placeholder="e.g. 70"/></div>
            </div>
            <Inp value={nutNotes} onChange={function(e){setNutNotes(e.target.value);}} placeholder="Notes" rows={2}/>
            <Btn onClick={saveNutrition} disabled={!cals} full style={{background:nutSaved?C.green:C.accent}}>{nutSaved?"Saved!":"Save Today"}</Btn>
          </div>
        )}
        {!showNutForm&&(
          <div style={{padding:"0 20px 12px"}}>
            {todayNut?(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
                  {[["Cals",todayNut.cals,2800,C.accent],["Prot",todayNut.protein,TARGET_P,C.green],["Carbs",todayNut.carbs,320,C.orange],["Fat",todayNut.fat,80,C.muted]].map(function(item){
                    var pct=item[2]&&item[1]?Math.min(100,Math.round((parseInt(item[1])/item[2])*100)):0;
                    return <div key={item[0]} style={{background:C.surface2,border:"1px solid "+C.border,padding:"6px 8px"}}>
                      <div style={{fontSize:14,fontWeight:900,color:item[3],fontFamily:F,lineHeight:1}}>{item[1]||"--"}</div>
                      <Cap style={{marginTop:1,marginBottom:3}}>{item[0]}</Cap>
                      <Bar pct={pct} color={item[3]}/>
                    </div>;
                  })}
                </div>
                <button onClick={function(){setCals(todayNut.cals);setProtein(todayNut.protein);setCarbs(todayNut.carbs);setFat(todayNut.fat);setNutNotes(todayNut.notes||"");setShowNutForm(true);}} style={{background:"none",border:"none",cursor:"pointer",color:C.faint,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:F,padding:0}}>edit today</button>
              </div>
            ):(
              <div style={{background:C.surface,border:"1px solid "+C.border,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:12,color:C.muted,fontFamily:F}}>Nothing logged today</div><div style={{fontSize:11,color:C.faint,fontFamily:F,marginTop:2}}>Log in Cronometer then add totals here</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:900,color:C.accent,fontFamily:F}}>{TARGET_P}g</div><Cap>protein target</Cap></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat */}
      <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
        <div style={{padding:"8px 20px",borderBottom:"1px solid "+C.border,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <Cap>Coach</Cap>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {speaking&&<Cap color={C.accent}>speaking</Cap>}
            <button onClick={toggleVoice} style={{background:"none",border:"1px solid "+(voiceOn?C.accent:C.border),color:voiceOn?C.accent:C.muted,padding:"4px 10px",fontSize:8,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F,letterSpacing:"0.1em"}}>{voiceOn?"voice on":"voice off"}</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 20px",display:"flex",flexDirection:"column",gap:10}}>
          {msgs.map(function(m,i){
            return <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
              {m.role==="assistant"&&<Cap style={{marginBottom:3}}>Coach</Cap>}
              <div style={{maxWidth:"90%",padding:"10px 13px",background:m.role==="user"?C.accent:C.surface,color:m.role==="user"?"#000":C.text,border:"1px solid "+(m.role==="user"?C.accent:C.border),fontFamily:F}}>
                {m.role==="user"?<span style={{fontSize:13}}>{m.content}</span>:<MsgContent text={m.content}/>}
              </div>
            </div>;
          })}
          {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><Cap style={{marginBottom:3}}>Coach</Cap><div style={{background:C.surface,border:"1px solid "+C.border,padding:"10px 13px",color:C.muted,fontFamily:F,fontSize:13}}>...</div></div>}
          <div ref={scrollRef}/>
        </div>
        {msgs.length<3&&<div style={{padding:"0 20px 6px",display:"flex",flexWrap:"wrap",gap:5,flexShrink:0}}>
          {["What should I eat before training?","How much protein do I need?","Fuelling for a long session","Am I eating enough?"].map(function(s){
            return <button key={s} onClick={function(){sendMessage(s);}} style={{padding:"4px 9px",background:"none",border:"1px solid "+C.border,fontSize:9,color:C.muted,cursor:"pointer",fontFamily:F}}>{s}</button>;
          })}
        </div>}
        <div style={{padding:"8px 20px 20px",borderTop:"1px solid "+C.border,background:C.bg,flexShrink:0}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={listening?stopListening:startListening} disabled={loading} style={{width:44,height:44,flexShrink:0,border:"1px solid "+(listening?C.accent:C.border),background:listening?C.accent:C.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={listening?"#000":C.muted} strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
              {listening&&<div style={{position:"absolute",inset:-3,border:"2px solid "+C.accent,animation:"ping 1s infinite",opacity:0.5}}/>}
            </button>
            <Inp value={input} onChange={function(e){setInput(e.target.value);}} placeholder={listening?"Listening...":"Type or tap mic to speak"} style={{flex:1}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(input);}}}/>
            <button onClick={function(){sendMessage(input);}} disabled={!input.trim()||loading} style={{padding:"10px 14px",background:C.accent,border:"none",cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#000",flexShrink:0,opacity:(!input.trim()||loading)?0.5:1}}>Send</button>
          </div>
          {listening&&<div style={{marginTop:6,fontSize:11,color:C.accent,fontFamily:F,textTransform:"uppercase",textAlign:"center"}}>Listening — tap mic to stop</div>}
        </div>
      </div>
    </div>
  );
}

// ---- APP ----
export default function PulseApp() {
  var [tab, setTab] = useState("plan");
  var [sessions, setSessions] = useState([]);
  var [targets, setTargets] = useState([]);
  var [plans, setPlans] = useState({main:[],hyrox:[],custom:[]});
  var [user, setUser] = useState(null);
  var [userProfile, setUserProfile] = useState(null);
  var [loaded, setLoaded] = useState(false);
  var [showOnboarding, setShowOnboarding] = useState(false);
  var [showSettings, setShowSettings] = useState(false);
  var [showCheckIn, setShowCheckIn] = useState(false);
  var [notifSettings, setNotifSettings] = useState({sunday:true,nutrition:true});

  useEffect(function(){
    sb.auth.getSession().then(function(res){
      if(res.data.session){setUser(res.data.session.user);loadUserData(res.data.session.user);}
      else setLoaded(true);
    });
    var sub=sb.auth.onAuthStateChange(function(event,session){
      if(event==="SIGNED_IN"&&session){setUser(session.user);loadUserData(session.user);}
      if(event==="SIGNED_OUT"){setUser(null);setUserProfile(null);setLoaded(true);}
    });
    return function(){sub.data.subscription.unsubscribe();};
  },[]);

  async function loadUserData(u) {
    var results=await Promise.all([
      dbLoad(u.id,"sessions"),
      dbLoad(u.id,"targets"),
      dbLoad(u.id,"plans"),
      dbLoad(u.id,"profile"),
      dbLoad(u.id,"last_checkin"),
      dbLoad(u.id,"notif_settings"),
      sb.from("profiles").select("display_name").eq("id",u.id).single()
    ]);
    var s=results[0],t=results[1],p=results[2],prof=results[3],lastCheckin=results[4],notif=results[5],supaProf=results[6];
    setSessions(s&&s.length?s:[]);
    if(t&&t.length)setTargets(t);
    if(p)setPlans(function(prev){return Object.assign({},prev,p);});
    if(notif)setNotifSettings(notif);
    var displayName=(prof&&prof.displayName)||(supaProf.data&&supaProf.data.display_name)||u.email.split("@")[0];
    var fullProfile=Object.assign({displayName:displayName},prof||{});
    setUserProfile(fullProfile);
    if(!prof||!prof.goals||prof.goals.length===0){
      setShowOnboarding(true);
    } else {
      var isMonday=new Date().getDay()===1;
      if(isMonday&&lastCheckin!==getMonday())setShowCheckIn(true);
    }
    setLoaded(true);
  }

  async function handleOnboardingComplete(data) {
    var newProfile=Object.assign({},userProfile,data.profile);
    setUserProfile(newProfile);
    await dbSave(user.id,"profile",newProfile);
    var newPlans=Object.assign({},plans,{main:data.myPlan||[]});
    if(data.hyroxPlan&&data.hyroxPlan.length)newPlans.hyrox=data.hyroxPlan;
    setPlans(newPlans);
    await dbSave(user.id,"plans",newPlans);
    if(data.targets&&data.targets.length){
      setTargets(data.targets);
      await dbSave(user.id,"targets",data.targets);
    }
    setShowOnboarding(false);
    setTab("plan");
  }

  function handleProfileUpdate(updated){setUserProfile(updated);dbSave(user.id,"profile",updated);}
  function handleNotifUpdate(key,val){var n=Object.assign({},notifSettings,{[key]:val});setNotifSettings(n);dbSave(user.id,"notif_settings",n);}
  function handlePlansUpdate(d){setPlans(d);dbSave(user.id,"plans",d);}
  function saveSession(s){return new Promise(function(resolve){setSessions(function(prev){var u=prev.concat([s]);dbSave(user.id,"sessions",u);resolve();return u;});});}
  function deleteSession(id){setSessions(function(prev){var u=prev.filter(function(s){return s.id!==id;});dbSave(user.id,"sessions",u);return u;});}

  var TABS=[{id:"log",label:"Log",icon:"="},{id:"train",label:"Train",icon:"o"},{id:"plan",label:"Plan",icon:"#"},{id:"goals",label:"Goals",icon:"*"},{id:"coach",label:"Coach",icon:"+"}];

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:32,fontWeight:900,letterSpacing:"0.08em",color:C.text,fontFamily:F}}>PULSE</div>
      <Cap color={C.accent} size={10}>Loading</Cap>
    </div>
  );
  if(!user) return <AuthScreen onAuth={function(u){setUser(u);loadUserData(u);}}/>;
  if(showOnboarding&&userProfile) return <OnboardingChat userName={userProfile.displayName} onComplete={handleOnboardingComplete}/>;

  var displayName=(userProfile&&userProfile.displayName)||"Athlete";

  var CogIcon=(
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:F,maxWidth:480,margin:"0 auto"}}>
      <style>{"*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}input::placeholder,textarea::placeholder{color:"+C.faint+";}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.3);}"}</style>
      {showSettings&&userProfile&&<SettingsOverlay user={user} profile={userProfile} notifSettings={notifSettings} onClose={function(){setShowSettings(false);}} onUpdate={handleProfileUpdate} onNotifUpdate={handleNotifUpdate}/>}
      {showCheckIn&&<WeeklyCheckIn userId={user.id} userName={displayName} userProfile={userProfile} onComplete={function(){setShowCheckIn(false);}} onDismiss={function(){setShowCheckIn(false);}}/>}
      <div style={{borderBottom:"1px solid "+C.border,padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.bg,zIndex:10}}>
        <div>
          <div style={{fontSize:16,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:C.text,fontFamily:F,lineHeight:1}}>Pulse</div>
          <Cap style={{marginTop:2}}>{displayName}</Cap>
        </div>
        <button onClick={function(){setShowSettings(true);}} style={{background:"none",border:"1px solid "+C.border,cursor:"pointer",padding:"8px 9px",display:"flex",alignItems:"center",justifyContent:"center"}}>{CogIcon}</button>
      </div>
      <div>
        {tab==="log"   &&<SessionsTab sessions={sessions} onDelete={deleteSession}/>}
        {tab==="train" &&<TrainTab onSave={saveSession}/>}
        {tab==="plan"  &&<PlanTab userId={user.id} onPlanUpdate={handlePlansUpdate} onLogSession={saveSession} userProfile={userProfile} plans={plans} setPlans={handlePlansUpdate}/>}
        {tab==="goals" &&<GoalsTab userId={user.id}/>}
        {tab==="coach" &&<CoachTab sessions={sessions} targets={targets} plans={plans} userName={displayName} userId={user.id} userProfile={userProfile} notifSettings={notifSettings}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.bg,borderTop:"1px solid "+C.border,display:"flex"}}>
        {TABS.map(function(t){
          var active=tab===t.id;
          return <button key={t.id} onClick={function(){setTab(t.id);}} style={{flex:1,padding:"10px 0 15px",background:active?C.accentDim:"none",border:"none",borderTop:"2px solid "+(active?C.accent:"#444"),cursor:"pointer",fontFamily:F,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:13,color:active?C.accent:"#aaa"}}>{t.icon}</span>
            <span style={{fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:active?C.accent:"#999"}}>{t.label}</span>
          </button>;
        })}
      </div>
    </div>
  );
}
