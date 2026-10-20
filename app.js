"use strict";
// ---------- Speicher: IndexedDB (Fallback localStorage), nur auf diesem Gerät ----------
const IDB_NAME="hyrox12", LS_DATA="hyrox12-fallback", LS_THEME="hyrox12-theme", LS_WATCH="hyrox12-watch";
let DATA={};                          // { "w1-mo": {steps:{0:{d,kg,reps,time,kmh,k}}, note, date, finished, updated, v} }
let SET={start:"",theme:"auto"};      // start = Montag von Woche 1 (JJJJ-MM-TT)
let idb=null, persisted=false, saveError=false, appVersion="";

function idbOpen(){
  return new Promise((res,rej)=>{
    if(!("indexedDB" in window))return rej(new Error("kein IndexedDB"));
    const r=indexedDB.open(IDB_NAME,1);
    r.onupgradeneeded=()=>{const d=r.result;
      if(!d.objectStoreNames.contains("sessions"))d.createObjectStore("sessions");
      if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta")};
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
    r.onblocked=()=>rej(new Error("blockiert"));
  });
}
function idbAll(store){
  return new Promise((res,rej)=>{
    const out={}, t=idb.transaction(store,"readonly"), c=t.objectStore(store).openCursor();
    c.onsuccess=()=>{const cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue()}};
    t.oncomplete=()=>res(out);
    t.onerror=t.onabort=()=>rej(t.error);
  });
}
function idbPut(store,entries){
  return new Promise((res,rej)=>{
    const t=idb.transaction(store,"readwrite"), s=t.objectStore(store);
    entries.forEach(([k,v])=>s.put(JSON.parse(JSON.stringify(v)),k));
    t.oncomplete=()=>res();
    t.onerror=t.onabort=()=>rej(t.error);
  });
}
function lsWrite(){localStorage.setItem(LS_DATA,JSON.stringify({sessions:DATA,settings:SET}))}

const dirty=new Set();
let saveTimer=null;
function persist(id,delay){
  stampKeys(id);DATA[id].updated=Date.now();dirty.add(id);
  clearTimeout(saveTimer);
  if(delay)saveTimer=setTimeout(flush,delay);else flush();
}
async function flush(){
  clearTimeout(saveTimer);
  if(!dirty.size)return;
  const ids=[...dirty];dirty.clear();
  try{
    if(idb)await idbPut("sessions",ids.map(id=>[id,DATA[id]]));else lsWrite();
    saveError=false;
  }catch(e){ids.forEach(i=>dirty.add(i));saveError=true}
  setStatus();
}
async function saveSettings(){
  try{if(idb)await idbPut("meta",[["settings",SET]]);else lsWrite()}catch(e){saveError=true}
  try{localStorage.setItem(LS_THEME,SET.theme)}catch(e){}
  setStatus();
}
// Beim Wegwechseln (App in den Hintergrund, Sperrbildschirm) sofort speichern
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush()});
window.addEventListener("pagehide",()=>flush());

function sess(id){return DATA[id]||(DATA[id]={steps:{},note:"",finished:false})}
function stepData(id,i){const s=sess(id);return s.steps[i]||(s.steps[i]={})}

// Einträge per Schritt-Key den aktuellen Schritten zuordnen – greift bei alten Einträgen
// ohne Key und wenn sich die Reihenfolge im Plan geändert hat (z. B. neuer Schritt)
const SV=2;
function migrate(id){
  const r=DATA[id];if(!r)return false;
  const se=SESS.find(x=>x.id===id);if(!se)return false;
  const steps=r.steps||{};
  if(r.v>=SV&&Object.keys(steps).every(i=>!steps[i].k||(se.steps[i]&&se.steps[i].key===steps[i].k)))return false;
  const oldKeys=r.v>=SV?se.steps.map(x=>x.key):se.d==="mo"?oldMoKeys(WEEKS[se.n-1]):se.steps.map(x=>x.key);
  const used=new Set(),ns={};
  Object.keys(steps).forEach(i=>{
    const v=steps[i];let key=v.k||oldKeys[+i];if(key==="bauchruecken")key="bauch";
    const j=se.steps.findIndex((x,jj)=>x.key===key&&!used.has(jj));
    if(j>=0){used.add(j);ns[j]=Object.assign({},v,{k:key})}
    // Übung aus dem Plan entfernt: Eintrag nicht wegwerfen, sondern aufheben (landet im JSON-Export)
    else if(summary(v,["kg","reps","time","kmh"])){const x=r.extra||(r.extra={});x[x[key]?key+"-"+i:key]=Object.assign({},v,{k:key})}
  });
  r.steps=ns;r.v=SV;r.updated=Date.now();return true;
}
function stampKeys(id){const r=DATA[id],se=SESS.find(x=>x.id===id);if(!r||!se)return;r.v=SV;Object.keys(r.steps).forEach(i=>{if(se.steps[i])r.steps[i].k=se.steps[i].key})}

async function requestPersist(){
  try{
    if(navigator.storage&&navigator.storage.persist){
      persisted=await navigator.storage.persisted();
      if(!persisted)persisted=await navigator.storage.persist();
    }
  }catch(e){}
  setStatus();
}
function statusText(){
  if(saveError)return "Speichern fehlgeschlagen – bitte „Daten sichern“ nutzen";
  let t=idb?"Gespeichert auf diesem Gerät":"Gespeichert im Browser (eingeschränkt)";
  t+=persisted?" · dauerhaft":" · ab und zu „Daten sichern“";
  if(appVersion)t+=" · "+appVersion;
  return t;
}
function setStatus(){const el=document.getElementById("status");if(el)el.textContent=statusText()}

// ---------- Datum ----------
const pad=n=>String(n).padStart(2,"0");
const DOFF={mo:0,mi:2,fr:4};
const WD=["So","Mo","Di","Mi","Do","Fr","Sa"];
function parseISO(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||"");return m?new Date(+m[1],m[2]-1,+m[3]):null}
function toISO(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function mondayOf(d){return addDays(d,-((d.getDay()+6)%7))}
const dm=d=>pad(d.getDate())+"."+pad(d.getMonth()+1)+".";
const dmy=d=>dm(d)+d.getFullYear();
function deToISO(s){const m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s||"");return m?m[3]+"-"+pad(m[2])+"-"+pad(m[1]):""}
function startDate(){return parseISO(SET.start)}
function weekStart(n){const s=startDate();return s?addDays(s,(n-1)*7):null}
function sessDate(s){const w=weekStart(s.n);return w?addDays(w,DOFF[s.d]):null}
function raceDate(){const s=startDate();return s?addDays(s,11*7+5):null}   // Samstag nach Woche 12
function startFromRace(r){let m=mondayOf(r);if((r.getDay()+6)%7<5)m=addDays(m,-7);return addDays(m,-77)}
function todayWeek(){const s=startDate();if(!s)return 0;const n=Math.floor((new Date()-s)/864e5/7)+1;return n>=1&&n<=12?n:0}

// ---------- Hilfen ----------
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const FL={kg:["Gewicht (kg)","decimal","z. B. 60"],reps:["Wdh.","numeric","55555"],time:["Zeit","text","mm:ss"],kmh:["km/h","decimal","z. B. 10,5"]};
const FL_MULTI=["Wdh.","decimal","10,8,7"];   // Sätze mit mehrstelligen Wdh. (Pull-ups): Komma trennt
// Wdh. automatisch trennen: normal ist jede Ziffer ein Satz (55555 → 5/5/5/5/5),
// bei multi trennt jedes Nicht-Ziffer-Zeichen (10,8,7 → 10/8/7)
function fmtReps(v,multi){return multi?v.replace(/\D+/g,"/").replace(/^\//,""):v.replace(/\D/g,"").split("").join("/")}
function nDone(s){const d=DATA[s.id];if(!d)return 0;return s.steps.filter((x,i)=>d.steps[i]&&d.steps[i].d).length}
function nReq(s){return s.steps.filter(x=>!x.opt).length}
function isDone(s){const d=DATA[s.id];if(d&&d.finished)return true;const r=nReq(s);return r>0&&s.steps.every((x,i)=>x.opt||(d&&d.steps[i]&&d.steps[i].d))}
function summary(v,f){return f.map(k=>v[k]?(k==="kg"?v[k]+" kg":k==="kmh"?v[k]+" km/h":v[k]):"").filter(Boolean).join(" · ")}
function lastFor(key,beforeIdx,f){
  if(!f.length)return null;
  for(let j=beforeIdx-1;j>=0;j--){const s=SESS[j],d=DATA[s.id];if(!d)continue;
    for(let i=s.steps.length-1;i>=0;i--){if(s.steps[i].key===key&&d.steps[i]){const t=summary(d.steps[i],f);if(t)return {t,n:s.n,d:s.d}}}}
  return null;
}
function curIndex(){const i=SESS.findIndex(s=>!isDone(s));return i<0?SESS.length-1:i}
function firstOpenStep(s){const d=DATA[s.id];const i=s.steps.findIndex((x,j)=>!(d&&d.steps[j]&&d.steps[j].d)&&!x.opt);if(i>=0)return i;return s.steps.findIndex((x,j)=>!(d&&d.steps[j]&&d.steps[j].d))}

// ---------- Ansichten ----------
let view={sid:null,open:null};
let pendingReload=false;
const app=document.getElementById("app");
function render(){view.sid?renderSession():renderHome()}

function renderHome(){
  if(pendingReload){location.reload();return}
  document.getElementById("watch").hidden=true;releaseWake();
  const done=SESS.filter(isDone).length, ci=curIndex(), c=SESS[ci], cd=sessDate(c), nowW=todayWeek(), race=raceDate();
  let h=`<header><h1>Hyrox <span>12 Wochen</span></h1></header>
  <div class="progress"><div class="bar"><i style="width:${done/36*100}%"></i></div><span>${done} / 36</span></div>
  <button class="next" type="button" data-open="${c.id}"><small>${done===36?"Alles geschafft":"Nächste Einheit"}${cd?" · geplant "+WD[cd.getDay()]+" "+dm(cd):""}</small><b>Woche ${c.n} · ${DAYN[c.d]}</b><span>${DAYT[c.d]} · ${esc(WEEKS[c.n-1].t)}</span></button>
  ${race?`<p class="race">Wettkampf-Wochenende: <b>${dm(race)} / ${dmy(addDays(race,1))}</b></p>`:""}
  <div class="phases">${[1,2,3,4].map(p=>`<div style="--c:${PH[p][1]}"><b>${PH[p][0]}</b><small>${["W1–4 · Frauengewichte, Technik","W5–8 · Intervalle, Männergewichte","W9–11 · Simulationen, Renntempo","W12"][p-1]}</small></div>`).join("")}</div>
  <div class="weeks">`;
  WEEKS.forEach((w,i)=>{
    const n=i+1, ws=weekStart(n);
    h+=`<div class="week${n===nowW?" now":""}" style="--c:${PH[w.p][1]}"><span class="wk">W${n}</span><span class="wtitle"><small>${PH[w.p][0]}</small><strong>${esc(w.t)}</strong>${ws?`<span class="wdate">${dm(ws)} – ${dm(addDays(ws,4))}${n===nowW?" · diese Woche":""}</span>`:""}</span><span class="chips">`;
    ["mo","mi","fr"].forEach(d=>{const s=SESS.find(x=>x.id==="w"+n+"-"+d);const cls=isDone(s)?"done":nDone(s)?"part":"";h+=`<button type="button" class="chip ${cls}" data-open="${s.id}"><i></i>${DAYN[d].slice(0,2)}</button>`});
    h+=`</span></div>`;
  });
  h+=`</div>
  <h2>Gewichte</h2>
  <div class="tbl"><table><thead><tr><th>Station</th><th>Frauen Open</th><th>Männer Open</th></tr></thead><tbody>
  <tr><td>SkiErg</td><td>1000 m</td><td>1000 m</td></tr><tr><td>Sled Push (50 m)</td><td>102 kg</td><td>152 kg</td></tr><tr><td>Sled Pull (50 m)</td><td>78 kg</td><td>103 kg</td></tr>
  <tr><td>Burpee Broad Jumps</td><td>80 m</td><td>80 m</td></tr><tr><td>Rudern</td><td>1000 m</td><td>1000 m</td></tr><tr><td>Farmer's Carry</td><td>2 × 16 kg</td><td>2 × 24 kg</td></tr>
  <tr><td>Sandbag-Lunges</td><td>10 kg</td><td>20 kg</td></tr><tr><td>Wall Balls (100)</td><td>4 kg · 2,70 m</td><td>6 kg · 3,05 m</td></tr></tbody></table></div>
  <p class="muted small">Sled-Gewichte inkl. Schlitten (28 kg). Scheiben: Push 74 / 124 kg, Pull 50 / 75 kg.</p>
  <h2>Regeln</h2>
  <ul class="rules">
   <li><strong>Kraftgewicht:</strong> so, dass alle 5 × 5 mit kurzer Pause gehen und im letzten Satz noch 1–2 Wdh. Reserve bleiben. Alle 5 Sätze mit demselben Gewicht, vorher 1–2 leichte Aufwärmsätze. Klappen alle 25 Wdh. sauber, nächstes Mal +2,5 kg.</li>
   <li><strong>Locker:</strong> ca. 8–8,5 km/h (7:00–7:30 min/km). Du kannst dich noch unterhalten, Gehpausen sind erlaubt. <strong>Renntempo:</strong> anfangs ca. 9–9,5 km/h (6:20–6:40 min/km), wird mit der Zeit schneller.</li>
   <li>Einheit verpasst? Nicht nachholen, mit der nächsten weitermachen. Fehlt eine ganze Woche, die Woche wiederholen.</li>
   <li>Wochen 4 und 8 sind bewusst leichter. Nicht überspringen.</li>
   <li>Ziehen oder Stechen in Knie, Achillessehne oder Wade: Laufumfang zurücknehmen, nicht durchbeißen.</li>
  </ul>
  <h2>Termine</h2>
  <div class="fields">
   <label>Start Woche 1 (Montag)<input type="date" id="setStart" value="${esc(SET.start)}"></label>
   <label>oder Wettkampftag<input type="date" id="setRace" value="${race?toISO(race):""}"></label>
  </div>
  <p class="muted small">Optional. Mit Datum zeigt die Übersicht zu jeder Woche die Tage an. Gibst du den Wettkampftag ein, wird Woche 1 passend zurückgerechnet (Wettkampf am Wochenende nach Woche 12).${SET.start?` <button type="button" class="linkbtn" id="clrDate">Datum entfernen</button>`:""}</p>
  <h2>Daten</h2>
  <div class="btns">
   <button type="button" class="btn" id="exp">Daten sichern</button>
   <button type="button" class="btn" id="imp">Daten laden</button>
   <button type="button" class="btn" id="csv">Tabelle für Excel</button>
   <input type="file" id="impFile" accept=".json,application/json" hidden>
  </div>
  <p class="muted small">„Daten sichern“ lädt eine JSON-Datei herunter (Backup, Umzug auf ein neues Handy). „Daten laden“ liest so eine Datei wieder ein. „Tabelle für Excel“ erzeugt eine CSV-Datei mit allen Einträgen.</p>
  <div class="fields"><label>Darstellung<select id="setTheme">${[["auto","Wie das Handy"],["light","Hell"],["dark","Dunkel"]].map(([v,t])=>`<option value="${v}"${SET.theme===v?" selected":""}>${t}</option>`).join("")}</select></label></div>
  <p class="status" id="status">${esc(statusText())}</p>`;
  app.innerHTML=h;
}

function renderSession(){
  const si=SESS.findIndex(x=>x.id===view.sid);
  if(si<0){view={sid:null,open:null};renderHome();return}
  const s=SESS[si], w=WEEKS[s.n-1], d=sess(s.id), pd=sessDate(s);
  if(view.open===null)view.open=firstOpenStep(s);
  document.getElementById("watch").hidden=false;wakeLock();
  let h=`<div class="top"><button class="back" type="button" id="back">← Übersicht</button><div><small>Woche ${s.n} · ${PH[w.p][0]}${pd?" · geplant "+WD[pd.getDay()]+" "+dm(pd):""}</small><b>${DAYN[s.d]} · ${DAYT[s.d]}</b></div></div>
  <div class="progress"><div class="bar"><i style="width:${nDone(s)/s.steps.length*100}%"></i></div><span>${nDone(s)} / ${s.steps.length}</span></div>
  <div class="steps">`;
  s.steps.forEach((x,i)=>{
    const v=d.steps[i]||{}, ok=!!v.d, cur=i===view.open;
    const sum=ok?summary(v,x.f):"";
    h+=`<div class="step ${ok?"ok":""} ${cur?"cur":""}"><button type="button" class="shead" data-step="${i}" aria-expanded="${cur}"><span class="num">${ok?"✓":i+1}</span><span class="sname"><b>${esc(x.name)}${x.opt?'<span class="opt">optional</span>':""}</b>${x.detail?`<span>${esc(x.detail)}</span>`:""}</span><span class="sval">${esc(sum)}</span></button>`;
    if(cur){
      const last=lastFor(x.key,si,x.f);
      h+=`<div class="sbody">`;
      if(last)h+=`<div class="last">Letztes Mal (W${last.n} ${DAYN[last.d].slice(0,2)}): <b>${esc(last.t)}</b></div>`;
      if(x.f.length)h+=`<div class="fields">${x.f.map(k=>{const [lab,im,ph]=k==="reps"&&x.multi?FL_MULTI:FL[k];return `<label>${lab}<input id="f-${s.id}-${i}-${k}" data-f="${k}" data-i="${i}" inputmode="${im}" placeholder="${ph}" value="${esc(v[k]||"")}" autocomplete="off"></label>`}).join("")}</div>`;
      h+=ok?`<button type="button" class="undo" data-undo="${i}">Wieder öffnen</button>`:`<button type="button" class="okbtn" data-ok="${i}">Erledigt ✓</button>`;
      h+=`</div>`;
    }
    h+=`</div>`;
  });
  h+=`</div>
  <label for="note-${s.id}" class="muted">Notiz zur Einheit</label>
  <textarea id="note-${s.id}" data-note="1" placeholder="Wie lief es? Was war schwer?">${esc(d.note||"")}</textarea>
  <div class="fields"><label>Trainiert am<input type="date" id="sessDate" value="${esc(deToISO(d.date))}"></label></div>
  ${isDone(s)?`<p class="muted">Einheit abgeschlossen${d.date?" am "+esc(d.date):""}.</p>`:`<button type="button" class="finish" id="finish">Einheit abschließen</button>`}
  <p class="status" id="status">${esc(statusText())}</p>`;
  app.innerHTML=h;
  const c=app.querySelector(".step.cur");if(c&&view.scroll){c.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});view.scroll=false}
}

// ---------- Navigation (Zurück-Taste des Handys führt zur Übersicht) ----------
function openSession(id){
  view={sid:id,open:null,scroll:true};
  history.pushState({sid:id},"");
  render();window.scrollTo(0,0);
}
function goHome(){
  flush();
  if(history.state&&history.state.sid){history.back();return}
  view={sid:null,open:null};render();window.scrollTo(0,0);
}
window.addEventListener("popstate",e=>{
  flush();
  const sid=e.state&&e.state.sid;
  view=sid?{sid,open:null,scroll:true}:{sid:null,open:null};
  render();window.scrollTo(0,0);
});

// ---------- Interaktion ----------
app.addEventListener("click",e=>{
  const o=e.target.closest("[data-open]");
  if(o){openSession(o.dataset.open);return}
  if(e.target.closest("#back")){goHome();return}
  if(e.target.closest("#exp")){exportJSON();return}
  if(e.target.closest("#csv")){exportCSV();return}
  if(e.target.closest("#imp")){document.getElementById("impFile").click();return}
  if(e.target.closest("#clrDate")){SET.start="";saveSettings();renderHome();return}
  const s=SESS.find(x=>x.id===view.sid);if(!s)return;
  const hd=e.target.closest("[data-step]");
  if(hd){const i=+hd.dataset.step;view.open=view.open===i?-1:i;renderSession();return}
  const ok=e.target.closest("[data-ok]");
  if(ok){const i=+ok.dataset.ok;stepData(s.id,i).d=true;stampDate(s.id);persist(s.id);
    const d=DATA[s.id];let nx=s.steps.findIndex((x,j)=>j>i&&!(d.steps[j]&&d.steps[j].d));
    if(nx<0)nx=s.steps.findIndex((x,j)=>!x.opt&&!(d.steps[j]&&d.steps[j].d));
    view.open=nx;view.scroll=true;renderSession();return}
  const un=e.target.closest("[data-undo]");
  if(un){const i=+un.dataset.undo;stepData(s.id,i).d=false;DATA[s.id].finished=false;persist(s.id);renderSession();return}
  if(e.target.closest("#finish")){const d=sess(s.id);d.finished=true;stampDate(s.id);persist(s.id);goHome()}
});
app.addEventListener("input",e=>{
  const s=SESS.find(x=>x.id===view.sid);if(!s)return;
  const t=e.target;
  if(t.dataset.f){
    const i=+t.dataset.i;
    if(t.dataset.f==="reps"){const f=fmtReps(t.value,s.steps[i].multi);if(f!==t.value)t.value=f}
    stepData(s.id,i)[t.dataset.f]=t.value.trim().replace(/\/$/,"");persist(s.id,900)}
  else if(t.dataset.note){sess(s.id).note=t.value;persist(s.id,1200)}
});
app.addEventListener("change",e=>{
  const t=e.target;
  if(t.id==="setStart"){const d=parseISO(t.value);SET.start=d?toISO(mondayOf(d)):"";saveSettings();renderHome()}
  else if(t.id==="setRace"){const d=parseISO(t.value);if(d){SET.start=toISO(startFromRace(d));saveSettings();renderHome()}}
  else if(t.id==="setTheme"){SET.theme=t.value;applyTheme();saveSettings()}
  else if(t.id==="impFile"){const f=t.files&&t.files[0];t.value="";if(f)f.text().then(importData).catch(()=>alert("Die Datei konnte nicht gelesen werden."))}
  else if(t.id==="sessDate"&&view.sid){const d=parseISO(t.value);sess(view.sid).date=d?dmy(d):"";persist(view.sid);renderSession()}
});
function stampDate(id){const d=sess(id);if(!d.date)d.date=dmy(new Date())}

// ---------- Export / Import ----------
function download(name,text,type){
  const b=new Blob([text],{type}), u=URL.createObjectURL(b), a=document.createElement("a");
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),5000);
}
const fileDate=()=>toISO(new Date());
async function exportJSON(){
  await flush();
  const out={app:"hyrox12",format:1,exported:new Date().toISOString(),settings:{start:SET.start},sessions:DATA};
  download("hyrox-"+fileDate()+".json",JSON.stringify(out,null,1),"application/json");
}
async function exportCSV(){
  await flush();
  const csvCell=v=>{v=String(v??"");return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const xlTime=t=>/^\d{1,2}:\d{2}$/.test(t||"")?"0:"+t:(t||"");   // mm:ss, sonst liest Excel hh:mm
  const rows=[["Woche","Tag","Einheit","Datum","Abgeschlossen","Nr","Schritt-Key","Übung","Erledigt","kg","Wdh","Zeit","km/h","Notiz"]];
  SESS.forEach(s=>{
    const d=DATA[s.id];if(!d)return;
    const base=[s.n,DAYN[s.d],s.id,d.date||"",isDone(s)?"ja":"nein"];
    let first=true;
    s.steps.forEach((x,i)=>{const v=d.steps[i];if(!v)return;
      rows.push(base.concat([i+1,x.key,x.name,v.d?"ja":"nein",v.kg||"",v.reps||"",xlTime(v.time),v.kmh||"",first?d.note||"":""]));first=false});
    if(first&&d.note)rows.push(base.concat(["","","","","","","","",d.note]));
  });
  download("hyrox-"+fileDate()+".csv","﻿"+rows.map(r=>r.map(csvCell).join(";")).join("\r\n"),"text/csv;charset=utf-8");
}
function importData(text){
  let o;
  try{o=JSON.parse(text)}catch(e){alert("Die Datei ist keine gültige JSON-Datei.");return}
  const src=o&&o.sessions&&typeof o.sessions==="object"?o.sessions:o;
  const ids=Object.keys(src||{}).filter(k=>/^w([1-9]|1[0-2])-(mo|mi|fr)$/.test(k)&&src[k]&&typeof src[k]==="object");
  if(!ids.length){alert("In der Datei wurden keine Trainingsdaten gefunden.");return}
  if(!confirm(`Die Datei enthält ${ids.length} Einheit${ids.length===1?"":"en"}. Vorhandene Einträge für diese Einheiten werden ersetzt, alle anderen bleiben. Fortfahren?`))return;
  ids.forEach(id=>{
    const r=src[id];
    DATA[id]={steps:r.steps&&typeof r.steps==="object"?r.steps:{},note:typeof r.note==="string"?r.note:"",
      finished:!!r.finished,date:typeof r.date==="string"?r.date:"",updated:+r.updated||Date.now(),v:r.v};
    migrate(id);stampKeys(id);dirty.add(id);
  });
  if(o.settings&&parseISO(o.settings.start)&&!SET.start){SET.start=o.settings.start;saveSettings()}
  flush().then(()=>{render();alert(`${ids.length} Einheit${ids.length===1?"":"en"} geladen.`)});
}

// ---------- Darstellung ----------
function applyTheme(){
  const r=document.documentElement;
  if(SET.theme==="light"||SET.theme==="dark")r.dataset.theme=SET.theme;else delete r.dataset.theme;
  const dark=SET.theme==="dark"||(SET.theme!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.content=dark?"#15191c":"#f3f4f2");
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",applyTheme);

// ---------- Stoppuhr (überlebt auch einen Neustart der App) ----------
let wStart=0,wAcc=0,wRun=false,wTick=null;
const clock=document.getElementById("clock"),bS=document.getElementById("wStart"),bT=document.getElementById("wTake");
const fmt=ms=>{const t=Math.floor(ms/1000),h=Math.floor(t/3600),m=Math.floor(t/60)%60,s=t%60;return (h?h+":":"")+pad(m)+":"+pad(s)};
const elapsed=()=>wAcc+(wRun?Date.now()-wStart:0);
function drawClock(){clock.textContent=fmt(elapsed())}
function saveWatch(){try{localStorage.setItem(LS_WATCH,JSON.stringify({wStart,wAcc,wRun}))}catch(e){}}
function startTick(){clearInterval(wTick);wTick=setInterval(drawClock,250)}
bS.onclick=()=>{
  if(wRun){wAcc=elapsed();wRun=false;clearInterval(wTick);bS.textContent="Weiter"}
  else{wStart=Date.now();wRun=true;startTick();bS.textContent="Stopp"}
  saveWatch();drawClock();
};
document.getElementById("wReset").onclick=()=>{wRun=false;wAcc=0;clearInterval(wTick);bS.textContent="Start";saveWatch();drawClock()};
bT.onclick=()=>{
  const s=SESS.find(x=>x.id===view.sid);if(!s||view.open==null||view.open<0)return;
  const x=s.steps[view.open];if(!x.f.includes("time")){flashTake("Kein Zeitfeld");return}
  const t=fmt(elapsed());
  stepData(s.id,view.open).time=t;persist(s.id);
  const inp=document.getElementById(`f-${s.id}-${view.open}-time`);if(inp)inp.value=t;
  flashTake("Eingetragen ✓");
};
let takeTimer=null;
function flashTake(t){clearTimeout(takeTimer);bT.textContent=t;takeTimer=setTimeout(()=>bT.textContent="Zeit eintragen",1200)}
try{const w=JSON.parse(localStorage.getItem(LS_WATCH));if(w){wStart=+w.wStart||0;wAcc=+w.wAcc||0;wRun=!!w.wRun;
  if(wRun)startTick();bS.textContent=wRun?"Stopp":wAcc?"Weiter":"Start"}}catch(e){}
drawClock();

// ---------- Display wach halten ----------
let wl=null;
async function wakeLock(){try{if(!wl&&navigator.wakeLock){wl=await navigator.wakeLock.request("screen");wl.addEventListener("release",()=>{wl=null})}}catch(e){wl=null}}
function releaseWake(){try{if(wl)wl.release()}catch(e){}wl=null}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&view.sid)wakeLock()});

// ---------- Offline / Updates ----------
function registerSW(){
  if(!("serviceWorker" in navigator))return;
  const hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").catch(()=>{});
  // Neue Version aktiv: in der Übersicht sofort neu laden, in einer Einheit erst beim Zurückgehen
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(!hadController)return;
    if(view.sid)pendingReload=true;else flush().then(()=>location.reload());
  });
  if(window.caches)caches.keys().then(k=>{const v=k.find(n=>/^hyrox-v/.test(n));if(v){appVersion=v.replace("hyrox-","");setStatus()}}).catch(()=>{});
}

// ---------- Start ----------
(async()=>{
  try{idb=await idbOpen()}catch(e){idb=null}
  try{
    if(idb){
      DATA=await idbAll("sessions");
      const m=await idbAll("meta");if(m.settings)SET=Object.assign(SET,m.settings);
    }else{
      const o=JSON.parse(localStorage.getItem(LS_DATA))||{};DATA=o.sessions||{};if(o.settings)SET=Object.assign(SET,o.settings);
    }
  }catch(e){DATA={}}
  Object.keys(DATA).forEach(id=>{if(migrate(id))dirty.add(id)});
  if(dirty.size)flush();
  applyTheme();
  history.replaceState({},"");
  render();
  requestPersist();
  registerSW();
})();
