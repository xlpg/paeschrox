// Plan-Daten: 12 Wochen × Mo/Mi/Fr. Jeder Schritt hat einen festen Key – die
// gespeicherten Einträge hängen am Key, nicht an der Position. Keys nie umbenennen.
"use strict";
const PH={1:["Grundlage","var(--p1)"],2:["Aufbau","var(--p2)"],3:["Wettkampf","var(--p3)"],4:["Taper","var(--p4)"]};
const DAYN={mo:"Montag",mi:"Mittwoch",fr:"Freitag"};
const DAYT={mo:"Kraft + Schlitten",mi:"Laufen + Ergos",fr:"Hyrox-Kombi"};
const st=(key,name,detail,f,o={})=>Object.assign({key,name,detail,f},o);
const T=["time"],KT=["kg","time"],KR=["kg","reps"];

const WEEKS=[
 {p:1,t:"Reinkommen",k:"5×5",lift:"Kreuzheben",push:"4 × 25 m · 102 kg · 2 min Pause",pull:"4 × 25 m · 78 kg · 2 min Pause",
  mi:{pu:25,easy:25,erg:2,ergLen:500,note:"ruhig, 2 min Pause"},
  fr:{run:"1 km",bbj:20,carry:100,lunge:25,wb:25,w:"f"}},
 {p:1,t:"Mehr Volumen",k:"5×5",lift:"Lunges",push:"5 × 25 m · 102 kg",pull:"5 × 25 m · 78 kg",
  mi:{pu:27,easy:30,erg:3,ergLen:500,note:"90 s Pause"},
  fr:{run:"1 km",bbj:30,carry:150,lunge:40,wb:30,w:"f"}},
 {p:1,t:"Stationen länger",k:"5×5",lift:"Kreuzheben",push:"5 × 25 m · 102 kg · nur 90 s Pause",pull:"5 × 25 m · 78 kg · nur 90 s Pause",
  mi:{pu:29,easy:35,erg:3,ergLen:500,note:"zügig, 90 s Pause"},
  fr:{run:"1 km",bbj:40,carry:200,lunge:50,wb:50,w:"f"}},
 {p:1,t:"Entlastung",k:"3×5",lift:"Lunges",push:"3 × 25 m · 102 kg",pull:"3 × 25 m · 78 kg",
  mi:{pu:25,easy:25,erg:1,ergLen:1000,note:"locker, auf Technik achten"},
  fr:{run:"500 m",bbj:20,carry:100,lunge:25,wb:25,w:"f"}},
 {p:2,t:"Männergewichte",k:"5×5",lift:"Kreuzheben",push:"4 × 25 m · 152 kg (bei Bedarf runter)",pull:"4 × 25 m · 103 kg",
  mi:{pu:31,int:4,pause:"2 min"},
  fr:{sim:"half",w:"f"}},
 {p:2,t:"Aufbau",k:"5×5",lift:"Lunges",push:"5 × 25 m · 152 kg",pull:"5 × 25 m · 103 kg",
  mi:{pu:33,int:5,pause:"2 min"},
  fr:{run:"1 km",bbj:40,carry:200,lunge:50,wb:50,w:"m"}},
 {p:2,t:"Volumen",k:"5×5",lift:"Kreuzheben",push:"3 × 50 m · 152 kg",pull:"3 × 50 m · 103 kg",
  mi:{pu:35,int:6,pause:"2 min"},
  fr:{run:"1 km",bbj:60,carry:200,lunge:75,wb:75,w:"m"}},
 {p:2,t:"Entlastung + Test",k:"3×5",lift:"Lunges",push:"3 × 25 m · 152 kg",pull:"3 × 25 m · 103 kg",
  mi:{pu:29,easy:30,erg:1,ergLen:1000,note:"locker"},
  fr:{sim:"half",w:"m",cmp:true}},
 {p:3,t:"Generalprobe",k:"5×5",lift:"Kreuzheben",push:"4 × 25 m · 152 kg, nach jeder Bahn 200 m zügig auf dem Band",pull:"4 × 25 m · 103 kg, nach jeder Bahn 200 m zügig auf dem Band",
  mi:{pu:37,easy:30,erg:2,ergLen:500,note:"locker"},
  fr:{sim:"full",w:"m"}},
 {p:3,t:"Renntempo festigen",k:"5×5",lift:"Lunges",push:"2 × (50 m · 152 kg + 400 m Laufen)",pull:"2 × (50 m · 103 kg + 400 m Laufen)",
  mi:{pu:39,int:6,pause:"90 s"},
  fr:{run:"1 km Renntempo",bbj:80,carry:200,lunge:100,wb:100,w:"m"}},
 {p:3,t:"Scharf, aber kürzer",k:"3×5",lift:"Kreuzheben",push:"3 × 25 m · 152 kg",pull:"3 × 25 m · 103 kg",
  mi:{pu:39,int:4,pause:"90 s"},
  fr:{run:"1 km Renntempo",bbj:40,carry:100,lunge:50,wb:50,w:"m"}},
 {p:4,t:"Wettkampfwoche",k:"3×5 locker",lift:null,push:"2 × 25 m · 152 kg, nur eingewöhnen",pull:"2 × 25 m · 103 kg, nur eingewöhnen",
  mi:{pu:20,taper:true},
  fr:{taper:true}}
];
const WT={f:{carry:"2 × 16 kg",lunge:"10 kg",wb:"4 kg",push:"102 kg",pull:"78 kg"},m:{carry:"2 × 24 kg",lunge:"20 kg",wb:"6 kg",push:"152 kg",pull:"103 kg"}};

function buildMo(w){
  const s=[st("warm","Aufwärmen","10 min Laufband locker",[])];
  const sets=w.k+" · 20–30 s Pause";
  const ex=[];
  if(w.lift){
    // Key "beinpresse" bleibt, damit die Historie der ersten Version passt
    ex.push(["beinpresse","Kniebeugen (Langhantel)","Start bei 45–50 kg, die ersten Wochen 60–90 s Pause"]);
    ex.push(["kreuzheben","Kreuzheben (Langhantel)","Start bei 60 kg, +2,5 kg wenn alle 25 Wdh. sauber"]);
  }
  ex.push(["brustpresse","Brustpresse"],["ruderzug","Ruderzug"],["latzug","Latzug"],["military","Schulterpresse"],["beinstrecker","Beinstrecker"],["bauch","Bauchtrainer"],["ruecken","Rückentrainer"]);
  ex.forEach(([k,n,h])=>s.push(st(k,n,sets+(h?" · "+h:""),KR)));
  s.push(st("sledpush","Sled Push",w.push,KT));
  s.push(st("sledpull","Sled Pull",w.pull,KT));
  [["bizeps","Bizeps"],["trizeps","Trizeps"]].forEach(([k,n])=>s.push(st(k,n,sets,KR,{opt:true})));
  return s;
}
// Reihenfolge der ersten Prototyp-Version, nur für die Übernahme alter Einträge ohne Key
function oldMoKeys(w){
  const k=["warm","beinpresse","beinstrecker"];
  if(w.lift==="Kreuzheben")k.push("kreuzheben");
  if(w.lift==="Lunges")k.push("lunges-lh");
  return k.concat(["brustpresse","ruderzug","latzug","military","bauchruecken","sledpush","sledpull","bizeps","trizeps"]);
}
// Kipping Pull-ups: Ziel = Wdh. insgesamt, Sätze frei einteilen; jede Woche +2, Entlastung weniger
const pullups=m=>st("pullups","Kipping Pull-ups · "+m.pu+" Wdh.",m.taper?"locker, nur in Bewegung bleiben":"insgesamt, Sätze frei einteilen · sauber bleiben",["reps","time"],{multi:true});
function buildMi(m){
  const s=[];
  if(m.taper){
    s.push(st("easy","Laufen locker","20 min, danach 3 × 1 min Renntempo",["kmh"]));
    s.push(st("ski250","SkiErg 250 m","locker",T));
    s.push(st("row250","Rudern 250 m","locker",T));
    s.push(pullups(m));
    return s;
  }
  if(m.int){
    s.push(st("einlaufen","Einlaufen","10 min locker, 1 % Steigung",[]));
    for(let r=1;r<=m.int;r++){
      s.push(st("int1k","Runde "+r+" · 1 km Renntempo","Laufband 1 %",["time","kmh"]));
      const ski=r%2===1;
      s.push(st(ski?"ski500":"row500","Runde "+r+" · "+(ski?"SkiErg":"Rudern")+" 500 m","danach "+m.pause+" Pause",T));
    }
    s.push(pullups(m));
    s.push(st("auslaufen","Auslaufen","10 min locker",[]));
    return s;
  }
  s.push(st("easy","Laufen locker",m.easy+" min, 1 % Steigung, ca. 8–8,5 km/h, Gehpausen erlaubt",["kmh"]));
  const L=m.ergLen;
  for(let i=1;i<=m.erg;i++)s.push(st("ski"+L,"SkiErg "+L+" m"+(m.erg>1?" · "+i:""),m.note,T));
  for(let i=1;i<=m.erg;i++)s.push(st("row"+L,"Rudern "+L+" m"+(m.erg>1?" · "+i:""),m.note,T));
  s.push(pullups(m));
  return s;
}
function buildFr(f){
  const s=[];
  if(f.taper){
    s.push(st("easy","Laufen locker","15 min",["kmh"]));
    s.push(st("wb-easy","10 Wall Balls","nur lockern",[]));
    s.push(st("lunge-easy","10 m Lunges","nur lockern",[]));
    s.push(st("rest","Fertig","Beine hoch, viel trinken – Wettkampf am Wochenende",[]));
    return s;
  }
  const w=WT[f.w];
  if(f.sim){
    const h=f.sim==="half", run=h?"500 m":"1 km";
    const ST=[["sim-ski","SkiErg",h?"500 m":"1000 m",""],["sim-push","Sled Push",h?"25 m":"50 m",w.push],["sim-pull","Sled Pull",h?"25 m":"50 m",w.pull],
      ["sim-bbj","Burpee Broad Jumps",h?"40 m":"80 m",""],["sim-row","Rudern",h?"500 m":"1000 m",""],["sim-carry","Farmer's Carry",h?"100 m":"200 m",w.carry],
      ["sim-lunge","Sandbag-Lunges",h?"50 m":"100 m",w.lunge],["sim-wb","Wall Balls",h?"50":"100",w.wb]];
    ST.forEach(([k,n,d,kg],i)=>{
      s.push(st("simrun-"+run,"Lauf "+(i+1)+" · "+run,i===0&&!h?"erste 2 km bewusst ruhig":"",T));
      s.push(st(k+"-"+f.sim,n+" "+d,kg||"",T));
    });
    s.push(st("simtotal-"+f.sim+"-"+f.w,"Gesamtzeit",(h?"Halbe":"Volle")+" Simulation"+(f.cmp?" – mit Woche 5 vergleichen":""),T));
    return s;
  }
  const S=[["bbj","Burpee Broad Jumps",f.bbj+" m",""],["carry","Farmer's Carry",f.carry+" m",w.carry],["lunge","Sandbag-Lunges",f.lunge+" m",w.lunge],["wb","Wall Balls",f.wb+"",w.wb]];
  S.forEach(([k,n,d,kg],i)=>{
    s.push(st("frrun","Runde "+(i+1)+" · "+f.run+" Laufen","",["time","kmh"]));
    s.push(st(k,"Runde "+(i+1)+" · "+n+" "+d,kg+(k==="wb"?(kg?" · ":"")+"in 10er-Blöcken":""),T));
  });
  return s;
}

// Alle 36 Einheiten in Reihenfolge; id = "w<Woche>-<Tag>"
const SESS=[];
WEEKS.forEach((w,i)=>{
  const n=i+1;
  SESS.push({id:"w"+n+"-mo",n,d:"mo",steps:buildMo(w)});
  SESS.push({id:"w"+n+"-mi",n,d:"mi",steps:buildMi(w.mi)});
  SESS.push({id:"w"+n+"-fr",n,d:"fr",steps:buildFr(w.fr)});
});
