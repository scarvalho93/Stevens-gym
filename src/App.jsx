import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ---- SUPABASE ----
var SUPA_URL = "https://iahdjfqfuamxeqwcvmjz.supabase.co";
var SUPA_KEY = "sb_publishable_-Rk_LL2AyeDC5S-ZzqMSrg_EG9jwFF1";
var sb = createClient(SUPA_URL, SUPA_KEY);

// ---- THEME ----
var C = {
  bg:"#080808", surface:"#111", surface2:"#181818", border:"#252525",
  text:"#f0ebe3", muted:"#888", faint:"#444", accent:"#d4f53c",
  accentDim:"#d4f53c12", danger:"#ff3b2f", orange:"#FC4C02", green:"#22c55e",
};
var F = "'Helvetica Neue','Arial',system-ui,sans-serif";

// ---- SEED DATA ----
var HYROX_PLAN = [
  {week:1,date:"23 Feb",rounds:3,duration:"45",focus:"Build The Base",notes:"Easy pace. Get comfortable with the flow.",exercises:["500m Ski Erg","500m Run","20 Wall Balls","15 Burpees Broad Jump","100m Farmers Carry","15 Walking Lunges"]},
  {week:2,date:"2 Mar",rounds:3,duration:"45",focus:"Consistency",notes:"Same structure. Push the runs slightly harder.",exercises:["500m Ski Erg","500m Run","20 Wall Balls","15 Burpees Broad Jump","100m Farmers Carry","15 Walking Lunges"]},
  {week:3,date:"9 Mar",rounds:3,duration:"50",focus:"Volume Up",notes:"Increase reps. Up wall ball weight if possible.",exercises:["500m Ski Erg","500m Run","20 Wall Balls","20 Burpees Broad Jump","100m Farmers Carry","20 Walking Lunges"]},
  {week:4,date:"16 Mar",rounds:4,duration:"55",focus:"Add A Round",notes:"Four rounds now. Allow an extra 10 mins.",exercises:["500m Ski Erg","500m Run","20 Wall Balls","20 Burpees Broad Jump","100m Farmers Carry","15 Walking Lunges"]},
  {week:5,date:"23 Mar",rounds:4,duration:"55",focus:"Strength Endurance",notes:"Back to 25 burpees. Don't slow in round 4.",exercises:["500m Ski Erg","500m Run","20 Wall Balls","25 Burpees Broad Jump","100m Farmers Carry","20 Walking Lunges"]},
  {week:6,date:"30 Mar",rounds:4,duration:"55",focus:"Race Pace",notes:"Treat this like race day. Time yourself.",exercises:["500m Ski Erg","500m Run","20 Wall Balls","25 Burpees Broad Jump","100m Farmers Carry","20 Walking Lunges"]},
  {week:7,date:"6 Apr",rounds:3,duration:"45",focus:"Taper Begins",notes:"Back to 3 rounds. Keep intensity, protect the body.",exercises:["500m Ski Erg","500m Run","20 Wall Balls","15 Burpees Broad Jump","100m Farmers Carry","15 Walking Lunges"]},
  {week:8,date:"13 Apr",rounds:2,duration:"30",focus:"Race Week",notes:"Light and sharp. Hyrox on 16th April.",exercises:["500m Ski Erg","500m Run","15 Wall Balls","10 Burpees Broad Jump","100m Farmers Carry"]},
];
var STRENGTH_PLAN = [
  {week:1,date:"W1",rounds:1,duration:"50",focus:"Upper Body Foundation",notes:"Chest, shoulders, back.",exercises:["Bench Press 4x10","Overhead Press 3x10","Pull Ups 3x8","Lateral Raises 3x15","Tricep Dips 3x12"]},
  {week:2,date:"W2",rounds:1,duration:"50",focus:"Lower Body",notes:"Legs and posterior chain.",exercises:["Squats 4x10","Romanian Deadlift 3x10","Leg Press 3x12","Leg Curl 3x12","Calf Raises 4x15"]},
  {week:3,date:"W3",rounds:1,duration:"55",focus:"Push Volume",notes:"Increase bench and press volume.",exercises:["Bench Press 5x8","Incline Dumbbell 4x10","Overhead Press 4x10","Lateral Raises 4x15","Skullcrushers 3x12"]},
  {week:4,date:"W4",rounds:1,duration:"55",focus:"Pull Volume",notes:"Back and biceps focus.",exercises:["Barbell Row 4x8","Pull Ups 4x8","Lat Pulldown 3x10","Face Pulls 3x15","Bicep Curls 3x12"]},
];
var SEED_SESSIONS = [
  {id:"seed1",date:"2026-02-22",type:"Sunday Hyrox",totalTime:"49:42",duration:"49:42",rounds:3,
   weights:{"Wall Balls":"9","Farmers Carry L1":"32","Farmers Carry L2":"24","Lunge Bag":"20"},
   notes:"Box jump to burpee variation. Strong first session.",exercises:[]},
  {id:"seed2",date:"2026-02-22",type:"Strength",totalTime:"--",duration:"1:12:00",rounds:1,weights:{},
   notes:"Chest, legs, arms",exercises:[
    {name:"Bench Press",sets:[{reps:12,weight:"60kg"},{reps:9,weight:"65kg"},{reps:8,weight:"65kg"}]},
    {name:"Pull Ups",sets:[{reps:10,weight:"BW"},{reps:10,weight:"BW"},{reps:8,weight:"BW"}]},
    {name:"Squats",sets:[{reps:8,weight:"85kg"},{reps:10,weight:"85kg"},{reps:8,weight:"95kg"}]},
    {name:"Skullcrushers",sets:[{reps:15,weight:"10kg"},{reps:15,weight:"10kg"},{reps:15,weight:"10kg"}]},
    {name:"Lateral Raises",sets:[{reps:15,weight:"10kg"},{reps:12,weight:"10kg"}]},
  ]},
];
var DEFAULT_TARGETS = [
  {id:1,name:"Hyrox Race Time",target:"45:00",unit:"mm:ss",current:"49:42",target2:"",current2:"",category:"Hyrox",notes:"Overall race time"},
  {id:2,name:"Farmers Carry",target:"40",unit:"kg",current:"32",target2:"40",current2:"24",category:"Hyrox",notes:"Leg 1 / Leg 2"},
  {id:3,name:"Bench Press 1RM",target:"100",unit:"kg",current:"65",target2:"",current2:"",category:"Strength",notes:""},
  {id:4,name:"Squat 1RM",target:"120",unit:"kg",current:"95",target2:"",current2:"",category:"Strength",notes:""},
  {id:5,name:"5k Run Pace",target:"5:00",unit:"/km",current:"",target2:"",current2:"",category:"Running",notes:""},
];

// ---- SUPABASE DATA LAYER ----
async function dbLoad(userId, key) {
  var res = await sb.from("user_data").select("value").eq("user_id", userId).eq("key", key).single();
  if (res.error || !res.data) { return null; }
  return res.data.value;
}

async function dbSave(userId, key, value) {
  await sb.from("user_data").upsert({user_id: userId, key: key, value: value, updated_at: new Date().toISOString()}, {onConflict: "user_id,key"});
}

// ---- AI (via proxy) ----
function callAI(messages, system) {
  return fetch("/api/chat", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({messages:messages,system:system||""})
  }).then(function(r) {
    if (!r.ok) { throw new Error("API " + r.status); }
    return r.json();
  }).then(function(d) { return d.content.map(function(b){return b.text||"";}).join(""); });
}

// ---- ELEVENLABS (via proxy) ----
function speakEL(text) {
  return fetch("/api/elevenlabs", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text:text,voiceId:"2UMI2FME0FFUFMlUoRER"})
  }).then(function(r) {
    if (!r.ok) { throw new Error("Voice error " + r.status); }
    return r.blob();
  }).then(function(blob) {
    var url = URL.createObjectURL(blob);
    var audio = new Audio(url);
    audio.play();
    return audio;
  });
}

// ---- HELPERS ----
function toSecs(t) {
  if (!t || t === "--") { return null; }
  var p = t.split(":").map(Number);
  if (p.length === 2) { return p[0]*60+p[1]; }
  if (p.length === 3) { return p[0]*3600+p[1]*60+p[2]; }
  return null;
}
function calcPace(km, time) {
  var p = time.split(":").map(Number);
  var m = p.length===2 ? p[0]+p[1]/60 : p[0]*60+p[1]+p[2]/60;
  var pace = m/parseFloat(km);
  return Math.floor(pace)+":"+String(Math.round((pace%1)*60)).padStart(2,"0")+"/km";
}
function prgPct(tgt, cur) {
  if (!cur) { return 0; }
  var sT=toSecs(tgt), sC=toSecs(cur);
  if (sT&&sC) { return Math.min(100,Math.round((sT/sC)*100)); }
  var n=parseFloat(cur), t=parseFloat(tgt);
  if (!isNaN(n)&&!isNaN(t)&&t>0) { return Math.min(100,Math.round((n/t)*100)); }
  return 0;
}
function fmtDur(d) {
  if (!d||d==="--") { return null; }
  var s=toSecs(d); if (!s) { return null; }
  var h=Math.floor(s/3600), m=Math.floor((s%3600)/60);
  return h>0 ? h+"h "+m+"m" : m+"m";
}
function totalMins(t) { var s=toSecs(t); if(!s){return null;} return Math.round(s/60)+" min"; }
function getToday() { return new Date().toISOString().split("T")[0]; }

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
  if (props.rows) { return <textarea value={props.value} onChange={props.onChange} placeholder={props.placeholder} rows={props.rows} style={Object.assign({},st,{resize:"none"})}/>; }
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

// ---- MARKDOWN RENDERER ----
function MsgContent(props) {
  var text = props.text || "";
  var normalised = text.trim().replace(/\n{3,}/g,"\n\n");
  var rawBlocks = normalised.split(/\n\n+/);
  var blocks = [];
  rawBlocks.forEach(function(b) {
    var trimB = b.trim();
    if (!trimB) { return; }
    var sublines = trimB.split("\n").map(function(s){return s.trim();}).filter(Boolean);
    var allBullets = sublines.length > 1 && sublines.every(function(l){return /^[-*]\s/.test(l);});
    if (allBullets || sublines.length === 1) { blocks.push(trimB); return; }
    sublines.forEach(function(line){ if(line){blocks.push(line);} });
  });

  function renderInline(str) {
    var parts = str.split(/\*\*(.*?)\*\*/g);
    var result = [];
    parts.forEach(function(part, i) {
      if (!part) { return; }
      if (i % 2 === 1) { result.push(<strong key={i} style={{fontWeight:800,color:C.text}}>{part}</strong>); }
      else { result.push(part); }
    });
    return result;
  }

  function renderBlock(block, bi) {
    var trimmed = block.trim();
    if (!trimmed) { return null; }
    var lines = trimmed.split("\n").map(function(l){return l.trim();}).filter(Boolean);

    if (/^###\s/.test(trimmed)) {
      return <div key={bi} style={{fontWeight:800,fontSize:11,color:C.accent,fontFamily:F,marginTop:12,marginBottom:5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{trimmed.replace(/^###\s+/,"")}</div>;
    }
    if (/^\*\*[^*]+\*\*[.:]?$/.test(trimmed)) {
      return <div key={bi} style={{fontWeight:800,fontSize:11,color:C.accent,fontFamily:F,marginTop:12,marginBottom:5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{trimmed.replace(/^\*\*|\*\*[.:]?$/g,"")}</div>;
    }
    var isList = lines.length >= 1 && lines.every(function(l){return /^[-*]\s/.test(l);});
    if (isList) {
      return <ul key={bi} style={{margin:"4px 0 10px 0",padding:"0 0 0 16px",listStyle:"disc"}}>
        {lines.map(function(l,li){
          return <li key={li} style={{marginBottom:5,fontSize:13,lineHeight:1.6,fontFamily:F,color:C.text}}>{renderInline(l.replace(/^[-*]\s+/,""))}</li>;
        })}
      </ul>;
    }
    return <p key={bi} style={{margin:"0 0 9px 0",lineHeight:1.65,fontSize:13,fontFamily:F,color:C.text}}>{renderInline(trimmed)}</p>;
  }

  return <div style={{margin:0,padding:0}}>{blocks.map(renderBlock).filter(Boolean)}</div>;
}

// ---- AUTH SCREEN ----
function AuthScreen(props) {
  var mode = useState("login"); var setMode=mode[1]; mode=mode[0];
  var email = useState(""); var setEmail=email[1]; email=email[0];
  var pass = useState(""); var setPass=pass[1]; pass=pass[0];
  var name = useState(""); var setName=name[1]; name=name[0];
  var err = useState(""); var setErr=err[1]; err=err[0];
  var loading = useState(false); var setLoading=loading[1]; loading=loading[0];

  async function doLogin() {
    setLoading(true); setErr("");
    var res = await sb.auth.signInWithPassword({email:email.trim(),password:pass});
    if (res.error) { setErr(res.error.message); setLoading(false); return; }
    props.onAuth(res.data.user);
  }

  async function doSignup() {
    if (!name.trim()) { setErr("Enter your name."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setLoading(true); setErr("");
    var res = await sb.auth.signUp({email:email.trim(),password:pass,options:{data:{display_name:name.trim()}}});
    if (res.error) { setErr(res.error.message); setLoading(false); return; }
    if (res.data.user && !res.data.session) {
      setErr(""); setMode("confirm");
    } else if (res.data.user) {
      props.onAuth(res.data.user);
    }
    setLoading(false);
  }

  if (mode === "confirm") {
    return (
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:32}}>
        <div style={{width:"100%",maxWidth:360,textAlign:"center"}}>
          <div style={{fontSize:32,fontWeight:900,color:C.accent,fontFamily:F,marginBottom:16}}>Check your email</div>
          <div style={{fontSize:14,color:C.muted,fontFamily:F,lineHeight:1.6}}>We sent a confirmation link to <strong style={{color:C.text}}>{email}</strong>. Click it to activate your account then come back and log in.</div>
          <button onClick={function(){setMode("login");}} style={{marginTop:24,background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:F,textDecoration:"underline"}}>Back to login</button>
        </div>
      </div>
    );
  }

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
          {mode==="signup" && (
            <div>
              <Cap style={{marginBottom:5}}>Your Name</Cap>
              <Inp value={name} onChange={function(e){setName(e.target.value);}} placeholder="First name"/>
            </div>
          )}
          <div>
            <Cap style={{marginBottom:5}}>Email</Cap>
            <Inp type="email" value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="you@email.com" onKeyDown={function(e){if(e.key==="Enter"){mode==="login"?doLogin():doSignup();}}}/>
          </div>
          <div>
            <Cap style={{marginBottom:5}}>Password</Cap>
            <Inp type="password" value={pass} onChange={function(e){setPass(e.target.value);}} placeholder={mode==="signup"?"Minimum 6 characters":"Your password"} onKeyDown={function(e){if(e.key==="Enter"){mode==="login"?doLogin():doSignup();}}}/>
          </div>
          {err && <div style={{fontSize:12,color:C.danger,fontFamily:F,padding:"8px 12px",background:C.danger+"15",border:"1px solid "+C.danger+"40"}}>{err}</div>}
          <Btn onClick={mode==="login"?doLogin:doSignup} disabled={loading||!email.trim()||!pass} full={true} style={{marginTop:4}}>
            {loading?"...":(mode==="login"?"Log In":"Create Account")}
          </Btn>
          {mode==="login" && (
            <button onClick={async function(){
              if(!email.trim()){setErr("Enter your email first.");return;}
              var res=await sb.auth.resetPasswordForEmail(email.trim());
              if(!res.error){setErr("Password reset email sent!");}
            }} style={{background:"none",border:"none",color:C.faint,fontSize:11,cursor:"pointer",fontFamily:F,textAlign:"center",padding:"4px 0"}}>Forgot password?</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- SESSIONS TAB ----
function SessionsTab(props) {
  var sessions=props.sessions, onDelete=props.onDelete;
  var openId=useState(null); var setOpenId=openId[1]; openId=openId[0];
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
      {sorted.map(function(s){
        var isOpen=openId===s.id;
        var dur=fmtDur(s.duration);
        var hasTime=s.totalTime&&s.totalTime!=="--";
        return (
          <div key={s.id}>
            <button onClick={function(){setOpenId(isOpen?null:s.id);}} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:F,gap:12}}>
              <div style={{textAlign:"left",flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F}}>{s.type}</div>
                <Cap style={{marginTop:3}}>{s.date}{dur?" - "+dur:""} - {s.rounds} round{s.rounds!==1?"s":""}</Cap>
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
                    {ex.sets.map(function(set,j){
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
                {s.id!=="seed1"&&s.id!=="seed2"&&<button onClick={function(){onDelete(s.id);}} style={{background:"none",border:"none",cursor:"pointer",color:C.faint,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:F,padding:0,marginTop:4}}>Delete</button>}
              </div>
            )}
            <HR/>
          </div>
        );
      })}
    </div>
  );
}

// ---- TRAIN TAB ----
function TrainTab(props) {
  var onSave=props.onSave;
  var sub=useState("strength"); var setSub=sub[1]; sub=sub[0];
  var sDate=useState(getToday()); var setSDate=sDate[1]; sDate=sDate[0];
  var sType=useState("Strength"); var setSType=sType[1]; sType=sType[0];
  var sDur=useState(""); var setSDur=sDur[1]; sDur=sDur[0];
  var exs=useState([{name:"",sets:[{weight:"",reps:""}]}]); var setExs=exs[1]; exs=exs[0];
  var sSaved=useState(false); var setSSaved=sSaved[1]; sSaved=sSaved[0];
  var hDate=useState(getToday()); var setHDate=hDate[1]; hDate=hDate[0];
  var hTime=useState(""); var setHTime=hTime[1]; hTime=hTime[0];
  var hRounds=useState("3"); var setHRounds=hRounds[1]; hRounds=hRounds[0];
  var hWB=useState(""); var setHWB=hWB[1]; hWB=hWB[0];
  var hFC1=useState(""); var setHFC1=hFC1[1]; hFC1=hFC1[0];
  var hFC2=useState(""); var setHFC2=hFC2[1]; hFC2=hFC2[0];
  var hLunge=useState(""); var setHLunge=hLunge[1]; hLunge=hLunge[0];
  var hNotes=useState(""); var setHNotes=hNotes[1]; hNotes=hNotes[0];
  var hSaved=useState(false); var setHSaved=hSaved[1]; hSaved=hSaved[0];
  var rDate=useState(getToday()); var setRDate=rDate[1]; rDate=rDate[0];
  var rType=useState("Easy Run"); var setRType=rType[1]; rType=rType[0];
  var rDist=useState(""); var setRDist=rDist[1]; rDist=rDist[0];
  var rTime=useState(""); var setRTime=rTime[1]; rTime=rTime[0];
  var rNotes=useState(""); var setRNotes=rNotes[1]; rNotes=rNotes[0];
  var rSaved=useState(false); var setRSaved=rSaved[1]; rSaved=rSaved[0];
  var stravaToken=useState(""); var setStravaToken=stravaToken[1]; stravaToken=stravaToken[0];
  var stravaRuns=useState([]); var setStravaRuns=stravaRuns[1]; stravaRuns=stravaRuns[0];
  var stravaLoading=useState(false); var setStravaLoading=stravaLoading[1]; stravaLoading=stravaLoading[0];
  var stravaErr=useState(""); var setStravaErr=stravaErr[1]; stravaErr=stravaErr[0];
  var importing=useState(null); var setImporting=importing[1]; importing=importing[0];

  useEffect(function(){ try{var t=localStorage.getItem("strava_token");if(t){setStravaToken(t);}}catch(e){} },[]);

  function addEx(){setExs(function(e){return e.concat([{name:"",sets:[{weight:"",reps:""}]}]);});}
  function remEx(i){setExs(function(e){return e.filter(function(_,x){return x!==i;});});}
  function setN(i,v){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{name:v}):ex;});});}
  function addSet(i){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{sets:ex.sets.concat([{weight:"",reps:""}])}):ex;});});}
  function remSet(i,j){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{sets:ex.sets.filter(function(_,y){return y!==j;})}):ex;});});}
  function upSet(i,j,f,v){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{sets:ex.sets.map(function(s,y){return y===j?Object.assign({},s,{[f]:v}):s;})}):ex;});});}

  function saveStrength(){
    var filled=exs.filter(function(ex){return ex.name.trim();}).map(function(ex){
      return {name:ex.name.trim(),sets:ex.sets.filter(function(s){return s.reps||s.weight;}).map(function(s){return {reps:s.reps?parseInt(s.reps):null,weight:s.weight?s.weight+"kg":null};})};
    });
    if(!filled.length){return;}
    onSave({id:Date.now()+"",date:sDate,type:sType,totalTime:"--",duration:sDur||"--",rounds:1,notes:filled.map(function(e){return e.name;}).join(", "),weights:{},exercises:filled}).then(function(){
      setSSaved(true);setExs([{name:"",sets:[{weight:"",reps:""}]}]);setSDur("");
      setTimeout(function(){setSSaved(false);},2500);
    });
  }
  function saveHyrox(){
    if(!hTime){return;}
    onSave({id:Date.now()+"",date:hDate,type:"Sunday Hyrox",totalTime:hTime,duration:hTime,rounds:parseInt(hRounds)||3,
      notes:hNotes,weights:{"Wall Balls":hWB,"Farmers Carry L1":hFC1,"Farmers Carry L2":hFC2,"Lunge Bag":hLunge},exercises:[]}).then(function(){
      setHSaved(true);setHTime("");setHWB("");setHFC1("");setHFC2("");setHLunge("");setHNotes("");
      setTimeout(function(){setHSaved(false);},2500);
    });
  }
  var rPace=null;
  if(rDist&&rTime&&rTime.indexOf(":")>-1){try{rPace=calcPace(rDist,rTime);}catch(e){}}
  function saveRun(){
    if(!rDist||!rTime){return;}
    onSave({id:Date.now()+"",date:rDate,type:rType,totalTime:rTime,duration:rTime,rounds:1,
      notes:[rNotes,rPace?"Pace: "+rPace:null].filter(Boolean).join(" - "),
      weights:{},exercises:[],runData:{distance:parseFloat(rDist),time:rTime,pace:rPace}}).then(function(){
      setRSaved(true);setRDist("");setRTime("");setRNotes("");
      setTimeout(function(){setRSaved(false);},2500);
    });
  }
  function fetchStrava(){
    if(!stravaToken.trim()){setStravaErr("Paste your token first.");return;}
    setStravaLoading(true);setStravaErr("");
    try{localStorage.setItem("strava_token",stravaToken.trim());}catch(e){}
    fetch("https://www.strava.com/api/v3/athlete/activities?per_page=15",{headers:{Authorization:"Bearer "+stravaToken.trim()}})
    .then(function(res){if(!res.ok){throw new Error("Strava "+res.status);}return res.json();})
    .then(function(data){
      var runs=data.filter(function(a){return a.type==="Run"||a.type==="VirtualRun";}).map(function(a){
        var secs=a.moving_time||0,dist=(a.distance/1000).toFixed(2);
        var time=Math.floor(secs/60)+":"+String(secs%60).padStart(2,"0");
        var p=null;try{p=calcPace(dist,time);}catch(e){}
        var date=a.start_date_local?a.start_date_local.split("T")[0]:getToday();
        return {id:a.id,name:a.name,date:date,distance:dist,time:time,pace:p,
          elevGain:Math.round(a.total_elevation_gain||0),heartRate:a.average_heartrate?Math.round(a.average_heartrate):null};
      });
      setStravaRuns(runs);
      if(!runs.length){setStravaErr("No recent runs found.");}
    }).catch(function(e){setStravaErr(e.message);}).then(function(){setStravaLoading(false);});
  }
  function importRun(run){
    setImporting(run.id);
    onSave({id:Date.now()+"",date:run.date,type:"Run",totalTime:run.time,duration:run.time,rounds:1,
      notes:[run.name,run.pace?"Pace: "+run.pace:null].filter(Boolean).join(" - "),
      weights:{},exercises:[],runData:{distance:parseFloat(run.distance),time:run.time,pace:run.pace}}).then(function(){setImporting(null);});
  }

  var dateInput = {display:"block",width:"100%",boxSizing:"border-box",background:C.surface,border:"1px solid "+C.border,color:C.text,fontSize:14,fontFamily:F,padding:"10px 13px",outline:"none"};

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"28px 20px 16px"}}>
        <Cap>Log Session</Cap>
        <div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.03em",color:C.text,marginTop:6,fontFamily:F}}>Train</div>
      </div>
      <HR/>
      <div style={{display:"flex",borderBottom:"1px solid "+C.border,overflowX:"auto"}}>
        {[["strength","Strength"],["hyrox","Hyrox"],["run","Run"],["strava","Strava"]].map(function(item){
          return <button key={item[0]} onClick={function(){setSub(item[0]);}} style={{flex:"0 0 auto",padding:"11px 18px",background:"none",border:"none",borderBottom:"2px solid "+(sub===item[0]?C.accent:"transparent"),color:sub===item[0]?C.accent:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>{item[1]}</button>;
        })}
      </div>

      {sub==="strength"&&(
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
          <div><Cap style={{marginBottom:5}}>Date</Cap><input type="date" value={sDate} onChange={function(e){setSDate(e.target.value);}} style={dateInput}/></div>
          <div><Cap style={{marginBottom:5}}>Type</Cap><Sel value={sType} onChange={function(e){setSType(e.target.value);}}><option>Strength</option><option>Cardio</option><option>Mixed</option><option>Other</option></Sel></div>
          <div><Cap style={{marginBottom:5}}>Duration</Cap><Inp value={sDur} onChange={function(e){setSDur(e.target.value);}} placeholder="e.g. 1:00:00 (optional)"/></div>
          <HR/>
          {exs.map(function(ex,i){
            return <div key={i} style={{background:C.surface,border:"1px solid "+C.border}}>
              <div style={{padding:"10px 12px",display:"flex",gap:8,borderBottom:"1px solid "+C.border,alignItems:"center"}}>
                <Inp value={ex.name} onChange={function(e){setN(i,e.target.value);}} placeholder="Exercise name" style={{flex:1}}/>
                {exs.length>1&&<button onClick={function(){remEx(i);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,fontFamily:F,flexShrink:0}}>x</button>}
              </div>
              <div style={{padding:"8px 12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 20px",gap:8,marginBottom:6,alignItems:"center"}}>
                  <Cap color={C.faint}>#</Cap><Cap>kg</Cap><Cap>Reps</Cap><span/>
                </div>
                {ex.sets.map(function(s,j){
                  return <div key={j} style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 20px",gap:8,marginBottom:6,alignItems:"center"}}>
                    <Cap color={C.faint} style={{textAlign:"center"}}>{j+1}</Cap>
                    <Inp type="number" value={s.weight} placeholder="kg" onChange={function(e){upSet(i,j,"weight",e.target.value);}}/>
                    <Inp type="number" value={s.reps} placeholder="reps" onChange={function(e){upSet(i,j,"reps",e.target.value);}}/>
                    {ex.sets.length>1?<button onClick={function(){remSet(i,j);}} style={{background:"none",border:"none",color:C.faint,cursor:"pointer",fontSize:10,fontFamily:F}}>x</button>:<span/>}
                  </div>;
                })}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:"1px solid "+C.border}}>
                <button onClick={function(){addSet(i);}} style={{padding:"8px 0",background:"none",border:"none",borderRight:"1px solid "+C.border,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,cursor:"pointer",fontFamily:F}}>+ Set</button>
                <button onClick={function(){setExs(function(e){return e.map(function(ex,x){return x===i?Object.assign({},ex,{sets:ex.sets.concat([Object.assign({},ex.sets[ex.sets.length-1])])}):ex;});});}} style={{padding:"8px 0",background:"none",border:"none",fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,cursor:"pointer",fontFamily:F}}>Repeat</button>
              </div>
            </div>;
          })}
          <Btn outline={true} onClick={addEx} full={true}>+ Add Exercise</Btn>
          <Btn onClick={saveStrength} full={true} style={{background:sSaved?C.green:C.accent}}>{sSaved?"Saved!":"Save Session"}</Btn>
        </div>
      )}

      {sub==="hyrox"&&(
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
          <div><Cap style={{marginBottom:5}}>Date</Cap><input type="date" value={hDate} onChange={function(e){setHDate(e.target.value);}} style={dateInput}/></div>
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
          <Btn onClick={saveHyrox} disabled={!hTime} full={true} style={{background:hSaved?C.green:C.accent}}>{hSaved?"Saved!":"Save Hyrox Session"}</Btn>
        </div>
      )}

      {sub==="run"&&(
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
          <div><Cap style={{marginBottom:5}}>Date</Cap><input type="date" value={rDate} onChange={function(e){setRDate(e.target.value);}} style={dateInput}/></div>
          <div><Cap style={{marginBottom:5}}>Run Type</Cap><Sel value={rType} onChange={function(e){setRType(e.target.value);}}><option>Easy Run</option><option>Tempo Run</option><option>Intervals</option><option>Long Run</option><option>5K Race</option><option>10K Race</option><option>Half Marathon</option><option>Marathon</option></Sel></div>
          <div><Cap style={{marginBottom:5}}>Distance (km)</Cap><Inp type="number" value={rDist} onChange={function(e){setRDist(e.target.value);}} placeholder="e.g. 5.0"/></div>
          <div><Cap style={{marginBottom:5}}>Time (mm:ss or h:mm:ss)</Cap><Inp value={rTime} onChange={function(e){setRTime(e.target.value);}} placeholder="e.g. 25:30"/></div>
          {rPace&&<div style={{background:C.accentDim,border:"1px solid "+C.accent+"30",padding:"12px 14px",display:"flex",justifyContent:"space-between"}}>
            <div><Cap>Pace</Cap><div style={{fontSize:20,fontWeight:900,color:C.accent,fontFamily:F,marginTop:2}}>{rPace}</div></div>
            <div style={{textAlign:"right"}}><Cap>Total</Cap><div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F,marginTop:2}}>{totalMins(rTime)||rTime}</div></div>
          </div>}
          <div><Cap style={{marginBottom:5}}>Notes</Cap><Inp value={rNotes} onChange={function(e){setRNotes(e.target.value);}} placeholder="Route, how it felt" rows={2}/></div>
          <Btn onClick={saveRun} disabled={!rDist||!rTime} full={true} style={{background:rSaved?C.green:C.accent}}>{rSaved?"Saved!":"Save Run"}</Btn>
        </div>
      )}

{sub==="strava"&&(
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
          <StravaConnect onImport={onSave}/>
        </div>
      )}
function StravaConnect(props) {
  var onImport = props.onImport;
  var [token, setToken] = useState(null);
  var [runs, setRuns] = useState([]);
  var [loading, setLoading] = useState(false);
  var [importing, setImporting] = useState(null);
  var [err, setErr] = useState("");

  var CLIENT_ID = "204822";
  var REDIRECT_URI = "https://stevens-gym-vnhb.vercel.app/strava-callback";

  // On mount: check for OAuth code in URL or saved token
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get("code");
    if (code) {
      // Exchange code for token
      window.history.replaceState({}, "", window.location.pathname);
      setLoading(true);
      fetch("/api/strava-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, grant_type: "authorization_code" })
      })
      .then(r => r.json())
      .then(data => {
        if (data.access_token) {
          var t = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
          localStorage.setItem("strava_oauth", JSON.stringify(t));
          setToken(t);
          fetchRuns(t.access_token);
        } else {
          setErr("Strava connection failed. Try again.");
          setLoading(false);
        }
      })
      .catch(function() { setErr("Connection error."); setLoading(false); });
    } else {
      // Check saved token
      try {
        var saved = localStorage.getItem("strava_oauth");
        if (saved) {
          var t = JSON.parse(saved);
          // Refresh if expired
          if (Date.now() / 1000 > t.expires_at - 300) {
            refreshToken(t.refresh_token);
          } else {
            setToken(t);
            fetchRuns(t.access_token);
          }
        }
      } catch(e) {}
    }
  }, []);

  function refreshToken(refresh_token) {
    setLoading(true);
    fetch("/api/strava-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "refresh_token", refresh_token })
    })
    .then(r => r.json())
    .then(data => {
      if (data.access_token) {
        var t = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
        localStorage.setItem("strava_oauth", JSON.stringify(t));
        setToken(t);
        fetchRuns(t.access_token);
      } else {
        localStorage.removeItem("strava_oauth");
        setToken(null);
        setLoading(false);
      }
    })
    .catch(function() { setLoading(false); });
  }

  function fetchRuns(access_token) {
    setLoading(true); setErr("");
    fetch("/api/strava-activities", {
      headers: { Authorization: "Bearer " + access_token }
    })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) { setRuns(data); }
      else { setErr("Could not load runs."); }
      setLoading(false);
    })
    .catch(function() { setErr("Failed to fetch runs."); setLoading(false); });
  }

  function connectStrava() {
    var url = "https://www.strava.com/oauth/authorize" +
      "?client_id=" + CLIENT_ID +
      "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) +
      "&response_type=code" +
      "&scope=activity:read_all";
    window.location.href = url;
  }

  function disconnect() {
    localStorage.removeItem("strava_oauth");
    setToken(null); setRuns([]);
  }

  function calcPaceFromRun(run) {
    if (!run.distance || !run.moving_time) return null;
    var pace = (run.moving_time / 60) / parseFloat(run.distance);
    return Math.floor(pace) + ":" + String(Math.round((pace % 1) * 60)).padStart(2, "0") + "/km";
  }

  function importRun(run) {
    setImporting(run.id);
    var pace = calcPaceFromRun(run);
    onImport({
      id: Date.now() + "",
      date: run.date,
      type: "Run",
      totalTime: run.time,
      duration: run.time,
      rounds: 1,
      notes: [run.name, pace ? "Pace: " + pace : null].filter(Boolean).join(" - "),
      weights: {},
      exercises: [],
      runData: { distance: parseFloat(run.distance), time: run.time, pace }
    }).then(function() { setImporting(null); });
  }

  if (!token) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:C.surface,border:"1px solid "+C.border,padding:20,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>🏃</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:F,marginBottom:6}}>Connect Strava</div>
          <div style={{fontSize:13,color:C.muted,fontFamily:F,lineHeight:1.6,marginBottom:16}}>Link your Strava account to import your recent runs directly into your training log.</div>
          <button onClick={connectStrava} style={{display:"block",width:"100%",padding:"13px",background:C.orange,border:"none",color:"#fff",fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>
            Connect with Strava
          </button>
        </div>
        {err && <div style={{fontSize:12,color:C.danger,fontFamily:F}}>{err}</div>}
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:C.green}}/>
          <Cap color={C.green}>Strava Connected</Cap>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={function(){fetchRuns(token.access_token);}} style={{background:"none",border:"1px solid "+C.border,color:C.muted,padding:"4px 10px",fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>Refresh</button>
          <button onClick={disconnect} style={{background:"none",border:"none",color:C.faint,padding:"4px 0",fontSize:9,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>Disconnect</button>
        </div>
      </div>

      {loading && <div style={{textAlign:"center",padding:20,color:C.muted,fontFamily:F,fontSize:13}}>Loading runs...</div>}
      {err && <div style={{fontSize:12,color:C.danger,fontFamily:F}}>{err}</div>}

      {!loading && runs.length === 0 && <div style={{textAlign:"center",padding:20,color:C.muted,fontFamily:F,fontSize:13}}>No recent runs found.</div>}

      {runs.map(function(run) {
        var pace = calcPaceFromRun(run);
        return (
          <div key={run.id} style={{background:C.surface,border:"1px solid "+C.border}}>
            <div style={{padding:"12px 14px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{run.name}</div>
                <Cap style={{marginTop:2}}>{run.date}</Cap>
              </div>
              <Btn onClick={function(){importRun(run);}} disabled={importing===run.id} small={true} style={{background:C.accentDim,color:C.accent,boxShadow:"inset 0 0 0 1px "+C.accent+"40",flexShrink:0}}>
                {importing===run.id?"...":"Import"}
              </Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,padding:"10px 14px"}}>
              {[["Dist",run.distance+"km"],["Time",run.time],["Pace",pace||"--"]].map(function(item){
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
// ---- WEEK FORM ----
function WeekForm(props) {
  var data=props.data,setData=props.setData;
  return (
    <div style={{background:C.surface,padding:"18px 20px",borderBottom:"1px solid "+C.border}}>
      <Tag color={C.accent}>{props.title}</Tag>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
        <div><Cap style={{marginBottom:5}}>Focus</Cap><Inp value={data.focus} onChange={function(e){setData(function(d){return Object.assign({},d,{focus:e.target.value});});}} placeholder="e.g. Race Pace Week"/></div>
        <div><Cap style={{marginBottom:5}}>Date Label</Cap><Inp value={data.date} onChange={function(e){setData(function(d){return Object.assign({},d,{date:e.target.value});});}} placeholder="e.g. 9 Mar"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><Cap style={{marginBottom:5}}>Rounds</Cap><Inp type="number" value={data.rounds} onChange={function(e){setData(function(d){return Object.assign({},d,{rounds:e.target.value});});}}/></div>
          <div><Cap style={{marginBottom:5}}>Duration (min)</Cap><Inp type="number" value={data.duration} onChange={function(e){setData(function(d){return Object.assign({},d,{duration:e.target.value});});}}/></div>
        </div>
        <div><Cap style={{marginBottom:5}}>Notes</Cap><Inp value={data.notes} onChange={function(e){setData(function(d){return Object.assign({},d,{notes:e.target.value});});}} rows={2} placeholder="Coaching notes"/></div>
        <div>
          <Cap style={{marginBottom:5}}>Activities</Cap>
          {data.exercises.map(function(ex,j){
            return <div key={j} style={{display:"flex",gap:8,marginBottom:6}}>
              <Inp value={ex} onChange={function(e){var v=e.target.value;setData(function(d){return Object.assign({},d,{exercises:d.exercises.map(function(x,k){return k===j?v:x;})});});}} placeholder={"Item "+(j+1)}/>
              {data.exercises.length>1&&<button onClick={function(){setData(function(d){return Object.assign({},d,{exercises:d.exercises.filter(function(_,k){return k!==j;})});});}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:F}}>x</button>}
            </div>;
          })}
          <button onClick={function(){setData(function(d){return Object.assign({},d,{exercises:d.exercises.concat([""])});});}} style={{width:"100%",padding:"8px",background:"none",border:"1px dashed "+C.border,fontSize:9,fontWeight:700,textTransform:"uppercase",color:C.muted,cursor:"pointer",fontFamily:F}}>+ Item</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
          <Btn outline={true} onClick={props.onCancel}>Cancel</Btn>
          <Btn onClick={props.onSave} disabled={!data.focus||!data.focus.trim()}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ---- PLAN TAB ----
function PlanTab(props) {
  var userId=props.userId,onPlanUpdate=props.onPlanUpdate,onLogSession=props.onLogSession;
  var pt=useState("hyrox");var setPt=pt[1];pt=pt[0];
  var plans=useState({hyrox:HYROX_PLAN,strength:STRENGTH_PLAN,running:[],custom:[]});var setPlans=plans[1];plans=plans[0];
  var openW=useState(null);var setOpenW=openW[1];openW=openW[0];
  var editing=useState(null);var setEditing=editing[1];editing=editing[0];
  var editD=useState(null);var setEditD=editD[1];editD=editD[0];
  var showAdd=useState(false);var setShowAdd=showAdd[1];showAdd=showAdd[0];
  var newW=useState({focus:"",notes:"",rounds:1,duration:"45",date:"",exercises:[""]});var setNewW=newW[1];newW=newW[0];
  var completing=useState(null);var setCompleting=completing[1];completing=completing[0];
  var compTime=useState("");var setCompTime=compTime[1];compTime=compTime[0];
  var compNotes=useState("");var setCompNotes=compNotes[1];compNotes=compNotes[0];
  var doneWeeks=useState({});var setDoneWeeks=doneWeeks[1];doneWeeks=doneWeeks[0];
  var daysLeft=Math.max(0,Math.ceil((new Date("2026-04-16")-new Date())/86400000));

  useEffect(function(){
    dbLoad(userId,"plans").then(function(d){if(d){setPlans(function(p){return Object.assign({},p,d);});if(onPlanUpdate){onPlanUpdate(d);}}});
    dbLoad(userId,"done_weeks").then(function(d){if(d){setDoneWeeks(d);}});
  },[]);

  function persist(d){setPlans(d);dbSave(userId,"plans",d);if(onPlanUpdate){onPlanUpdate(d);}}
  var cur=plans[pt]||[];
  function isDone(i){return !!doneWeeks[pt+"_"+i];}
  function startEdit(i){setEditing(i);setEditD(Object.assign({},cur[i],{exercises:cur[i].exercises.slice()}));}
  function saveEdit(){var u=Object.assign({},plans);u[pt]=cur.map(function(w,i){return i===editing?editD:w;});persist(u);setEditing(null);}
  function updateDate(i,v){var u=Object.assign({},plans);u[pt]=cur.map(function(w,x){return x===i?Object.assign({},w,{date:v}):w;});persist(u);}
  function removeWeek(i){var u=Object.assign({},plans);u[pt]=cur.filter(function(_,x){return x!==i;}).map(function(w,x){return Object.assign({},w,{week:x+1});});persist(u);}
  function addWeek(){
    if(!newW.focus.trim()){return;}
    var u=Object.assign({},plans);
    u[pt]=cur.concat([{week:cur.length+1,date:newW.date||"TBD",rounds:parseInt(newW.rounds)||1,duration:newW.duration,focus:newW.focus,notes:newW.notes,exercises:newW.exercises.filter(function(e){return e.trim();})}]);
    persist(u);setShowAdd(false);setNewW({focus:"",notes:"",rounds:1,duration:"45",date:"",exercises:[""]});
  }
  function completeWeek(w,i){
    onLogSession({id:Date.now()+"",date:getToday(),type:pt==="hyrox"?"Sunday Hyrox":"Session",
      totalTime:compTime||"--",duration:compTime||"--",rounds:w.rounds,
      notes:["Wk "+w.week+": "+w.focus,compNotes].filter(Boolean).join(" - "),weights:{},exercises:[]}).then(function(){
      var nd=Object.assign({},doneWeeks);nd[pt+"_"+i]=getToday();
      setDoneWeeks(nd);dbSave(userId,"done_weeks",nd);
      setCompleting(null);setCompTime("");setCompNotes("");setOpenW(null);
    });
  }

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"28px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><Cap>Plans</Cap><div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.03em",color:C.text,marginTop:6,fontFamily:F}}>Programme</div></div>
        {pt==="hyrox"&&<div style={{textAlign:"right"}}><div style={{fontSize:32,fontWeight:900,letterSpacing:"-0.04em",color:C.accent,fontFamily:F}}>{daysLeft}</div><Cap>days to race</Cap></div>}
      </div>
      <HR/>
      <div style={{display:"flex",borderBottom:"1px solid "+C.border,overflowX:"auto"}}>
        {["hyrox","strength","running","custom"].map(function(t){
          return <button key={t} onClick={function(){setPt(t);setOpenW(null);setEditing(null);}} style={{flex:"0 0 auto",padding:"11px 18px",background:"none",border:"none",borderBottom:"2px solid "+(pt===t?C.accent:"transparent"),color:pt===t?C.accent:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>{t}</button>;
        })}
      </div>
      {pt==="running"&&cur.length===0&&!showAdd&&(
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.surface,border:"1px solid "+C.border,padding:18}}>
            <Tag color={C.orange}>Recommended</Tag>
            <div style={{fontSize:15,fontWeight:700,color:C.text,marginTop:10,marginBottom:6,fontFamily:F}}>Runna</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:14,fontFamily:F}}>Personalised running plans. Syncs to Strava, imports here automatically.</div>
            <a href="https://runna.com" target="_blank" rel="noreferrer" style={{display:"block",padding:"11px 14px",background:C.orange,color:"#fff",fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",textDecoration:"none",textAlign:"center",fontFamily:F}}>Open Runna</a>
          </div>
          <Btn outline={true} onClick={function(){setShowAdd(true);}} full={true}>+ Build Your Own</Btn>
        </div>
      )}
      {pt==="custom"&&cur.length===0&&!showAdd&&(
        <div style={{padding:"40px 20px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10,color:C.accent}}>+</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:F,marginBottom:6}}>Custom Plan</div>
          <div style={{fontSize:13,color:C.muted,fontFamily:F,lineHeight:1.6,marginBottom:20}}>Build any programme - mobility, sport-specific, off-season.</div>
          <Btn onClick={function(){setShowAdd(true);}} full={true}>+ Add First Week</Btn>
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
                    <input value={w.date} onChange={function(e){updateDate(i,e.target.value);}} onClick={function(e){e.stopPropagation();}} placeholder="date" style={{background:"transparent",border:"none",borderBottom:"1px solid "+C.border,color:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:F,outline:"none",width:80,padding:"0 0 1px",cursor:"text"}}/>
                  </div>
                </div>
                <Cap color={C.faint}>{openW===i?"^":"v"}</Cap>
              </button>
              {openW===i&&(
                <div style={{background:C.surface,borderTop:"1px solid "+C.border,borderBottom:"1px solid "+C.border,padding:"14px 20px"}}>
                  {w.exercises.map(function(ex,j){
                    return <div key={j} style={{display:"flex",gap:10,alignItems:"center",paddingBottom:6,borderBottom:"1px solid "+C.faint,marginBottom:6}}>
                      <div style={{width:16,height:16,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Cap color={C.muted}>{j+1}</Cap></div>
                      <span style={{fontSize:13,color:C.text,fontFamily:F}}>{ex}</span>
                    </div>;
                  })}
                  <div style={{background:C.surface2,border:"1px solid "+C.border,padding:"8px 12px",margin:"10px 0 12px"}}>
                    <span style={{fontSize:13,color:C.muted,fontStyle:"italic",fontFamily:F}}>"{w.notes}"</span>
                  </div>
                  {completing===i?(
                    <div style={{background:C.accentDim,border:"1px solid "+C.accent+"30",padding:12,marginBottom:10}}>
                      <Cap color={C.accent} style={{marginBottom:8}}>Log As Complete</Cap>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <Inp value={compTime} onChange={function(e){setCompTime(e.target.value);}} placeholder={pt==="hyrox"?"Time e.g. 47:32":"Duration e.g. 1:00:00"}/>
                        <Inp value={compNotes} onChange={function(e){setCompNotes(e.target.value);}} placeholder="How did it go?" rows={2}/>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <Btn outline={true} onClick={function(){setCompleting(null);}}>Cancel</Btn>
                          <Btn onClick={function(){completeWeek(w,i);}}>Save to Log</Btn>
                        </div>
                      </div>
                    </div>
                  ):(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      <Btn outline={true} onClick={function(){startEdit(i);}}>Edit</Btn>
                      <Btn onClick={function(){setCompleting(i);}} style={{background:isDone(i)?C.surface2:C.accent,color:isDone(i)?C.muted:"#000",boxShadow:isDone(i)?"inset 0 0 0 1px "+C.border:"none"}}>{isDone(i)?"Done":"Complete"}</Btn>
                      <Btn danger={true} onClick={function(){removeWeek(i);}}>Remove</Btn>
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
        <div style={{padding:"16px 20px"}}><Btn outline={true} onClick={function(){setShowAdd(true);}} full={true}>+ Add Week</Btn></div>
      )}
      {pt==="hyrox"&&(
        <div style={{margin:"4px 20px 20px",background:C.accentDim,border:"1px solid "+C.accent+"30",padding:"14px 18px"}}>
          <Tag>Race Day</Tag>
          <div style={{fontSize:18,fontWeight:900,color:C.text,marginTop:8,fontFamily:F}}>16 April 2026</div>
          <Cap style={{marginTop:3}}>Hyrox London</Cap>
        </div>
      )}
    </div>
  );
}

// ---- GOALS TAB ----
function GoalsTab(props) {
  var userId=props.userId;
  var targets=useState(DEFAULT_TARGETS);var setTargets=targets[1];targets=targets[0];
  var showAddFor=useState(null);var setShowAddFor=showAddFor[1];showAddFor=showAddFor[0];
  var newT=useState({name:"",target:"",target2:"",unit:"kg",notes:""});var setNewT=newT[1];newT=newT[0];

  useEffect(function(){dbLoad(userId,"targets").then(function(d){if(d){setTargets(d);}});},[]);
  function persist(d){setTargets(d);dbSave(userId,"targets",d);}
  function removeTarget(id){persist(targets.filter(function(t){return t.id!==id;}));}
  function updateField(id,field,val){persist(targets.map(function(t){return t.id===id?Object.assign({},t,{[field]:val}):t;}));}
  function addTarget(cat){
    if(!newT.name||!newT.target){return;}
    persist(targets.concat([Object.assign({},newT,{id:Date.now(),current:"",current2:"",category:cat})]));
    setShowAddFor(null);setNewT({name:"",target:"",target2:"",unit:"kg",notes:""});
  }
  function isDouble(t){return t.target2&&t.target2.trim();}
  var cats=[];
  targets.forEach(function(t){if(cats.indexOf(t.category)===-1){cats.push(t.category);}});

  var inpStyle={background:C.surface2,border:"1px solid "+C.border,color:C.text,fontSize:13,fontWeight:700,fontFamily:F,padding:"5px 8px",outline:"none",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"28px 20px 16px"}}><Cap>2026 Targets</Cap><div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.03em",color:C.text,marginTop:6,fontFamily:F}}>Goals</div></div>
      <HR/>
      {cats.map(function(cat){
        return <div key={cat}>
          <div style={{padding:"10px 20px 8px",background:C.surface2,borderBottom:"1px solid "+C.border}}>
            <Cap color={C.accent} size={10}>{cat}</Cap>
          </div>
          {targets.filter(function(t){return t.category===cat;}).map(function(target){
            var pc1=prgPct(target.target,target.current);
            var pc2=isDouble(target)?prgPct(target.target2,target.current2||""):0;
            var dual=isDouble(target);
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
                      <div style={{display:"flex",gap:3}}>
                        <input value={target.target||""} onChange={function(e){updateField(target.id,"target",e.target.value);}} placeholder="target" style={Object.assign({},inpStyle,{color:C.accent,background:C.faint})}/>
                        {dual&&<input value={target.target2||""} onChange={function(e){updateField(target.id,"target2",e.target.value);}} placeholder="t2" style={Object.assign({},inpStyle,{color:C.orange,background:C.faint})}/>}
                      </div>
                    </div>
                    <div>
                      <Cap style={{marginBottom:3}}>Now</Cap>
                      <div style={{display:"flex",gap:3}}>
                        <input value={target.current||""} onChange={function(e){updateField(target.id,"current",e.target.value);}} placeholder={target.unit} style={inpStyle}/>
                        {dual&&<input value={target.current2||""} onChange={function(e){updateField(target.id,"current2",e.target.value);}} placeholder={target.unit} style={inpStyle}/>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:6}}>
                    {target.current&&<Bar pct={pc1} color={pc1>=100?C.accent:C.accent+"88"}/>}
                    {dual&&target.current2&&<Bar pct={pc2} color={pc2>=100?C.green:C.orange+"99"}/>}
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={function(){removeTarget(target.id);}} style={{background:"none",border:"none",cursor:"pointer",color:C.faint,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:F,padding:0}}>remove</button>
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <Ring pct={pc1} primary={C.accent}/>
                  {dual&&<Ring pct={pc2} primary={pc2>=100?C.green:C.orange}/>}
                </div>
              </div>
            </div>;
          })}
          {showAddFor===cat?(
            <div style={{padding:"14px 20px",background:C.surface,borderBottom:"1px solid "+C.border}}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
                  <Inp value={newT.name} onChange={function(e){setNewT(function(n){return Object.assign({},n,{name:e.target.value});});}} placeholder="Goal name"/>
                  <Sel value={newT.unit} onChange={function(e){setNewT(function(n){return Object.assign({},n,{unit:e.target.value});});}}>
                    <option>kg</option><option>mm:ss</option><option>min</option><option>/km</option><option>reps</option><option>m</option>
                  </Sel>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <Inp value={newT.target} onChange={function(e){setNewT(function(n){return Object.assign({},n,{target:e.target.value});});}} placeholder="Target value"/>
                  <Inp value={newT.target2||""} onChange={function(e){setNewT(function(n){return Object.assign({},n,{target2:e.target.value});});}} placeholder="Target 2 (optional)"/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <Btn outline={true} onClick={function(){setShowAddFor(null);}}>Cancel</Btn>
                  <Btn onClick={function(){addTarget(cat);}} disabled={!newT.name||!newT.target}>Add</Btn>
                </div>
              </div>
            </div>
          ):(
            <div style={{padding:"10px 20px",borderBottom:"1px solid "+C.border}}>
              <button onClick={function(){setShowAddFor(cat);setNewT({name:"",target:"",target2:"",unit:"kg",notes:""}); }} style={{background:"none",border:"none",color:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontFamily:F,padding:0}}>+ Add goal in {cat}</button>
            </div>
          )}
        </div>;
      })}
      <div style={{padding:"16px 20px"}}>
        <Cap style={{marginBottom:8}}>New Category</Cap>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["Hyrox","Strength","Running","Performance","Other"].filter(function(c){return cats.indexOf(c)===-1;}).map(function(c){
            return <button key={c} onClick={function(){setShowAddFor(c);}} style={{padding:"6px 12px",background:"none",border:"1px solid "+C.border,color:C.muted,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>{c}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

// ---- COACH TAB ----
function CoachTab(props) {
  var sessions=props.sessions,targets=props.targets,plans=props.plans,onPlanChange=props.onPlanChange,userName=props.userName,userId=props.userId;
  var nutLog=useState([]);var setNutLog=nutLog[1];nutLog=nutLog[0];
  var nutDate=useState(getToday());var setNutDate=nutDate[1];nutDate=nutDate[0];
  var cals=useState("");var setCals=cals[1];cals=cals[0];
  var protein=useState("");var setProtein=protein[1];protein=protein[0];
  var carbs=useState("");var setCarbs=carbs[1];carbs=carbs[0];
  var fat=useState("");var setFat=fat[1];fat=fat[0];
  var nutNotes=useState("");var setNutNotes=nutNotes[1];nutNotes=nutNotes[0];
  var nutSaved=useState(false);var setNutSaved=nutSaved[1];nutSaved=nutSaved[0];
  var showNutForm=useState(false);var setShowNutForm=showNutForm[1];showNutForm=showNutForm[0];
  var msgs=useState([{role:"assistant",content:"Hey "+userName+". I can see your training plan and goals.\n\nAsk me anything about nutrition, fuelling around your sessions, or how to eat for Hyrox. You can type or tap the mic to speak."}]);
  var setMsgs=msgs[1];msgs=msgs[0];
  var input=useState("");var setInput=input[1];input=input[0];
  var loading=useState(false);var setLoading=loading[1];loading=loading[0];
  var speaking=useState(false);var setSpeaking=speaking[1];speaking=speaking[0];
  var listening=useState(false);var setListening=listening[1];listening=listening[0];
  var voiceOn=useState(true);var setVoiceOn=voiceOn[1];voiceOn=voiceOn[0];
  var scrollRef=useRef(null);
  var recognitionRef=useRef(null);

  useEffect(function(){
    dbLoad(userId,"nut_log").then(function(d){if(d){setNutLog(d);}});
    dbLoad(userId,"voice_on").then(function(d){if(d!==null){setVoiceOn(d);}});
  },[]);

  useEffect(function(){
    if(scrollRef.current){scrollRef.current.scrollIntoView({behavior:"smooth"});}
  },[msgs]);

  function saveNutrition(){
    if(!cals){return;}
    var entry={id:Date.now(),date:nutDate,cals:cals,protein:protein,carbs:carbs,fat:fat,notes:nutNotes};
    var newLog=nutLog.filter(function(e){return e.date!==nutDate;}).concat([entry]);
    setNutLog(newLog);dbSave(userId,"nut_log",newLog);
    setNutSaved(true);setShowNutForm(false);
    setTimeout(function(){setNutSaved(false);},2000);
  }

  var todayNut=nutLog.find(function(e){return e.date===getToday();});
  var TARGET_CALS=2800,TARGET_P=170,TARGET_C=320,TARGET_F=80;

  function getCtx(){
    var sessSum=sessions.slice(-5).map(function(s){return s.date+": "+s.type+" ("+(fmtDur(s.duration)||s.totalTime||"?")+") "+(s.notes||"");}).join("\n");
    var planSum=((plans&&plans.hyrox)||[]).map(function(w){return "Wk"+w.week+"("+w.date+"): "+w.focus;}).join("\n");
    var nutSum=nutLog.slice(-3).map(function(e){return e.date+": "+e.cals+"kcal P:"+e.protein+"g C:"+e.carbs+"g F:"+e.fat+"g"+(e.notes?" ("+e.notes+")":"");}).join("\n");
    return {sessSum:sessSum,planSum:planSum,nutSum:nutSum};
  }

  function sendMessage(text) {
    if(!text.trim()||loading){return;}
    var userMsg={role:"user",content:text.trim()};
    var updated=msgs.concat([userMsg]);
    setMsgs(updated);setInput("");setLoading(true);
    var ctx=getCtx();
    var system="You are a sports nutritionist and Hyrox performance coach texting "+userName+" like a knowledgeable mate. You know their training inside out.\n\nFORMATTING RULES - follow these exactly:\n- Separate every idea into its own paragraph with a blank line between them\n- Max 2 sentences per paragraph\n- Use **bold text** to highlight the most important numbers, terms, or actions\n- If listing 3 or more items, use bullet points starting with - \n- Use **Heading** on its own line when switching topics\n- End every response with one short question\n\nTONE:\n- Casual and direct, like a smart coach texting\n- Never use: certainly, absolutely, great question, of course\n- Never start with their name\n- Short sentences. Real advice. No waffle.\n\nContext:\nRecent training:\n"+ctx.sessSum+"\n\nHyrox plan:\n"+ctx.planSum+"\n\nNutrition log:\n"+(ctx.nutSum||"Nothing logged yet");
    callAI(updated.map(function(m){return {role:m.role,content:m.content};}),system).then(function(reply){
      setMsgs(function(m){return m.concat([{role:"assistant",content:reply}]);});
      if(voiceOn){
        setSpeaking(true);
        // Strip markdown for speech
        var spokenText=reply.replace(/\*\*([^*]+)\*\*/g,"$1").replace(/^###\s+/gm,"").replace(/^-\s+/gm,"").slice(0,500);
        speakEL(spokenText).catch(function(e){console.log("Voice error:",e);}).then(function(){setSpeaking(false);});
      }
    }).catch(function(){
      setMsgs(function(m){return m.concat([{role:"assistant",content:"Connection issue. Try again."}]);});
    }).then(function(){setLoading(false);});
  }

  function startListening() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser. Try Chrome.");
      return;
    }
    var recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    recognition.onstart = function() { setListening(true); };
    recognition.onresult = function(e) {
      var transcript = e.results[0][0].transcript;
      setListening(false);
      sendMessage(transcript);
    };
    recognition.onerror = function() { setListening(false); };
    recognition.onend = function() { setListening(false); };
    recognition.start();
  }

  function stopListening() {
    if(recognitionRef.current) { recognitionRef.current.stop(); }
    setListening(false);
  }

  function toggleVoice() {
    var nv = !voiceOn;
    setVoiceOn(nv);
    dbSave(userId,"voice_on",nv);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 116px)",overflow:"hidden"}}>

      {/* NUTRITION PANEL */}
      <div style={{flexShrink:0,borderBottom:"2px solid "+C.border,maxHeight:"44%",overflow:"auto"}}>
        <div style={{padding:"14px 20px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><Cap>Nutrition</Cap><div style={{fontSize:15,fontWeight:900,color:C.text,fontFamily:F,marginTop:2}}>Today's Fuel</div></div>
          <div style={{display:"flex",gap:6}}>
            <a href="https://cronometer.com/diary/" target="_blank" rel="noreferrer" style={{padding:"5px 10px",background:"#f97316",color:"#fff",fontSize:8,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",textDecoration:"none",fontFamily:F}}>Cronometer</a>
            <button onClick={function(){setShowNutForm(function(s){return !s;});}} style={{background:"none",border:"1px solid "+C.border,color:C.muted,padding:"5px 10px",fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:F}}>{showNutForm?"cancel":"+ Log"}</button>
          </div>
        </div>
        {showNutForm&&(
          <div style={{padding:"0 20px 14px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><Cap style={{marginBottom:4}}>Calories</Cap><Inp type="number" value={cals} onChange={function(e){setCals(e.target.value);}} placeholder="e.g. 2400"/></div>
              <div><Cap style={{marginBottom:4}}>Protein (g)</Cap><Inp type="number" value={protein} onChange={function(e){setProtein(e.target.value);}} placeholder="e.g. 150"/></div>
              <div><Cap style={{marginBottom:4}}>Carbs (g)</Cap><Inp type="number" value={carbs} onChange={function(e){setCarbs(e.target.value);}} placeholder="e.g. 280"/></div>
              <div><Cap style={{marginBottom:4}}>Fat (g)</Cap><Inp type="number" value={fat} onChange={function(e){setFat(e.target.value);}} placeholder="e.g. 70"/></div>
            </div>
            <Inp value={nutNotes} onChange={function(e){setNutNotes(e.target.value);}} placeholder="Notes e.g. pre-training, race week" rows={2}/>
            <Btn onClick={saveNutrition} disabled={!cals} full={true} style={{background:nutSaved?C.green:C.accent}}>{nutSaved?"Saved!":"Save Today"}</Btn>
          </div>
        )}
        {!showNutForm&&(
          <div style={{padding:"0 20px 14px"}}>
            {todayNut?(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
                  {[["Cals",todayNut.cals,TARGET_CALS,C.accent],["Prot",todayNut.protein,TARGET_P,C.green],["Carbs",todayNut.carbs,TARGET_C,C.orange],["Fat",todayNut.fat,TARGET_F,C.muted]].map(function(item){
                    var pct=item[2]&&item[1]?Math.min(100,Math.round((parseInt(item[1])/item[2])*100)):0;
                    return <div key={item[0]} style={{background:C.surface2,border:"1px solid "+C.border,padding:"6px 8px"}}>
                      <div style={{fontSize:14,fontWeight:900,color:item[3],fontFamily:F,lineHeight:1}}>{item[1]||"--"}</div>
                      <Cap style={{marginTop:1,marginBottom:3}}>{item[0]}</Cap>
                      <Bar pct={pct} color={item[3]}/>
                    </div>;
                  })}
                </div>
                {todayNut.notes&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic",fontFamily:F,marginBottom:6}}>"{todayNut.notes}"</div>}
                <button onClick={function(){setCals(todayNut.cals);setProtein(todayNut.protein);setCarbs(todayNut.carbs);setFat(todayNut.fat);setNutNotes(todayNut.notes||"");setShowNutForm(true);}} style={{background:"none",border:"none",cursor:"pointer",color:C.faint,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:F,padding:0}}>edit today</button>
              </div>
            ):(
              <div style={{background:C.surface,border:"1px solid "+C.border,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,color:C.muted,fontFamily:F}}>Nothing logged today</div>
                  <div style={{fontSize:11,color:C.faint,fontFamily:F,marginTop:2}}>Log in Cronometer then add totals here</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:16,fontWeight:900,color:C.accent,fontFamily:F}}>{TARGET_P}g</div>
                  <Cap>protein target</Cap>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHAT PANEL */}
      <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
        <div style={{padding:"8px 20px",borderBottom:"1px solid "+C.border,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <Cap>Nutrition Coach</Cap>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {speaking&&<Cap color={C.accent} style={{animation:"pulse 1s infinite"}}>speaking</Cap>}
            <button onClick={toggleVoice} style={{background:"none",border:"1px solid "+(voiceOn?C.accent:C.border),color:voiceOn?C.accent:C.muted,padding:"4px 10px",fontSize:8,fontWeight:700,textTransform:"uppercase",cursor:"pointer",fontFamily:F,letterSpacing:"0.1em"}}>
              {voiceOn?"voice on":"voice off"}
            </button>
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
          {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}>
            <Cap style={{marginBottom:3}}>Coach</Cap>
            <div style={{background:C.surface,border:"1px solid "+C.border,padding:"10px 13px",color:C.muted,fontFamily:F,fontSize:13}}>...</div>
          </div>}
          <div ref={scrollRef}/>
        </div>

        {msgs.length<3&&<div style={{padding:"0 20px 6px",display:"flex",flexWrap:"wrap",gap:5,flexShrink:0}}>
          {["What should I eat before Hyrox?","How much protein do I need?","Fuelling for a long session","Am I eating enough?"].map(function(s){
            return <button key={s} onClick={function(){sendMessage(s);}} style={{padding:"4px 9px",background:"none",border:"1px solid "+C.border,fontSize:9,color:C.muted,cursor:"pointer",fontFamily:F}}>{s}</button>;
          })}
        </div>}

        <div style={{padding:"8px 20px 20px",borderTop:"1px solid "+C.border,background:C.bg,flexShrink:0}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/* MIC BUTTON */}
            <button
              onClick={listening?stopListening:startListening}
              disabled={loading}
              style={{
                width:44,height:44,flexShrink:0,border:"1px solid "+(listening?C.accent:C.border),
                background:listening?C.accent:C.surface,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                position:"relative",transition:"all 0.2s"
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={listening?"#000":C.muted} strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M5 10a7 7 0 0 0 14 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="8" y1="22" x2="16" y2="22"/>
              </svg>
              {listening&&<div style={{position:"absolute",inset:-3,border:"2px solid "+C.accent,borderRadius:0,animation:"ping 1s infinite",opacity:0.5}}/>}
            </button>
            <Inp
              value={input}
              onChange={function(e){setInput(e.target.value);}}
              placeholder={listening?"Listening...":"Type or tap mic to speak"}
              style={{flex:1}}
              onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(input);}}}
            />
            <button
              onClick={function(){sendMessage(input);}}
              disabled={!input.trim()||loading}
              style={{padding:"10px 14px",background:C.accent,border:"none",cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#000",flexShrink:0,opacity:(!input.trim()||loading)?0.5:1}}>
              Send
            </button>
          </div>
          {listening&&<div style={{marginTop:6,fontSize:11,color:C.accent,fontFamily:F,letterSpacing:"0.08em",textTransform:"uppercase",textAlign:"center"}}>Listening -- tap mic to stop</div>}
        </div>
      </div>
    </div>
  );
}


// ---- APP ----
export default function PulseApp() {
  var tab=useState("log");var setTab=tab[1];tab=tab[0];
  var sessions=useState([]);var setSessions=sessions[1];sessions=sessions[0];
  var targets=useState(DEFAULT_TARGETS);var setTargets=targets[1];targets=targets[0];
  var plans=useState({hyrox:HYROX_PLAN,strength:STRENGTH_PLAN,running:[],custom:[]});var setPlans=plans[1];plans=plans[0];
  var user=useState(null);var setUser=user[1];user=user[0];
  var profile=useState(null);var setProfile=profile[1];profile=profile[0];
  var loaded=useState(false);var setLoaded=loaded[1];loaded=loaded[0];

  useEffect(function(){
    sb.auth.getSession().then(function(res){
      if(res.data.session){
        setUser(res.data.session.user);
        loadUserData(res.data.session.user);
      } else {
        setLoaded(true);
      }
    });
    var sub=sb.auth.onAuthStateChange(function(event,session){
      if(event==="SIGNED_IN"&&session){setUser(session.user);loadUserData(session.user);}
      if(event==="SIGNED_OUT"){setUser(null);setLoaded(true);}
    });
    return function(){sub.data.subscription.unsubscribe();};
  },[]);

  async function loadUserData(u) {
    var prom = [
      dbLoad(u.id,"sessions"),
      dbLoad(u.id,"targets"),
      dbLoad(u.id,"plans"),
      sb.from("profiles").select("display_name").eq("id",u.id).single()
    ];
    var results = await Promise.all(prom);
    var s=results[0],t=results[1],p=results[2],prof=results[3];
    if(s&&s.length){
      var hasS1=s.find(function(x){return x.id==="seed1";}),hasS2=s.find(function(x){return x.id==="seed2";});
      var seed=[];
      if(!hasS1){seed.push(SEED_SESSIONS[0]);}
      if(!hasS2){seed.push(SEED_SESSIONS[1]);}
      setSessions(seed.concat(s.filter(function(x){return x.id!=="seed1"&&x.id!=="seed2";})));
    } else {
      setSessions(SEED_SESSIONS.slice());
    }
    if(t){setTargets(t);}
    if(p){setPlans(function(prev){return Object.assign({},prev,p);});}
    if(prof.data&&prof.data.display_name){setProfile(prof.data.display_name);}
    else{setProfile(u.email.split("@")[0]);}
    setLoaded(true);
  }

  function saveSession(s) {
    return new Promise(function(resolve){
      setSessions(function(prev){
        var u=prev.concat([s]);
        dbSave(user.id,"sessions",u);
        resolve();
        return u;
      });
    });
  }

  function deleteSession(id) {
    setSessions(function(prev){
      var u=prev.filter(function(s){return s.id!==id;});
      dbSave(user.id,"sessions",u);
      return u;
    });
  }

  function handlePlanUpdate(d){setPlans(d);dbSave(user.id,"plans",d);}

  var TABS=[
    {id:"log",label:"Log",icon:"="},
    {id:"train",label:"Train",icon:"o"},
    {id:"plan",label:"Plan",icon:"#"},
    {id:"goals",label:"Goals",icon:"*"},
    {id:"coach",label:"Coach",icon:"+"},
  ];

  if(!loaded){
    return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:32,fontWeight:900,letterSpacing:"0.08em",color:C.text,fontFamily:F}}>PULSE</div>
      <Cap color={C.accent} size={10}>Loading</Cap>
    </div>;
  }

  if(!user){
    return <AuthScreen onAuth={function(u){setUser(u);loadUserData(u);}}/>;
  }

  var displayName = profile || (user.email ? user.email.split("@")[0] : "Athlete");

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:F,maxWidth:480,margin:"0 auto"}}>
      <style>{"*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}input::placeholder,textarea::placeholder{color:"+C.faint+";}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.3);}"}</style>
      <div style={{borderBottom:"1px solid "+C.border,padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.bg,zIndex:10}}>
        <div>
          <div style={{fontSize:16,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:C.text,fontFamily:F,lineHeight:1}}>Pulse</div>
          <Cap style={{marginTop:2}}>{displayName}</Cap>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Cap color={C.muted}>{sessions.length} sessions</Cap>
          <button onClick={function(){sb.auth.signOut();}} style={{background:"none",border:"1px solid "+C.border,color:C.muted,cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:"0.1em",padding:"4px 8px",fontFamily:F}}>sign out</button>
        </div>
      </div>
      <div>
        {tab==="log"   &&<SessionsTab sessions={sessions} onDelete={deleteSession}/>}
        {tab==="train" &&<TrainTab onSave={saveSession}/>}
        {tab==="plan"  &&<PlanTab userId={user.id} onPlanUpdate={handlePlanUpdate} onLogSession={saveSession}/>}
        {tab==="goals" &&<GoalsTab userId={user.id}/>}
        {tab==="coach" &&<CoachTab sessions={sessions} targets={targets} plans={plans} onPlanChange={handlePlanUpdate} userName={displayName} userId={user.id}/>}
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
