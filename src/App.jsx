import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const HIGH_RISK = {
  "0x722122df12d4e14e13ac3b6895a86e84145b6967":{name:"Tornado Cash 0.1ETH",cat:"MIXER"},
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936":{name:"Tornado Cash 1ETH",cat:"MIXER"},
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf":{name:"Tornado Cash 10ETH",cat:"MIXER"},
  "0xa160cdab225685da1d56aa342ad8841c3b53f291":{name:"Tornado Cash 100ETH",cat:"MIXER"},
  "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3":{name:"Tornado Cash DAI",cat:"MIXER"},
  "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144":{name:"Tornado Cash USDC",cat:"MIXER"},
  "0x07687e702b410fa43f4cb4af7fa097918ffd2730":{name:"Tornado Cash USDT",cat:"MIXER"},
  "0xb6f5ec1a0a9cd1526536d3f0426c429529471f40":{name:"ChipMixer",cat:"MIXER"},
  "0x7f367cc41522ce07553e823bf3be79a889debe1b":{name:"OFAC / Lazarus Group",cat:"SANCTIONED"},
  "0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b":{name:"OFAC Sanctioned",cat:"SANCTIONED"},
  "0x901bb9583b24d97e995513c6778dc6888ab6870e":{name:"OFAC Sanctioned",cat:"SANCTIONED"},
  "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c":{name:"OFAC Lazarus Group",cat:"SANCTIONED"},
  "0x098b716b8aaf21512996dc57eb0615e2383e2f96":{name:"OFAC Axie Infinity Hack",cat:"SANCTIONED"},
  "0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b":{name:"OFAC Sanctioned",cat:"SANCTIONED"},
  "0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a":{name:"OFAC Sanctioned",cat:"SANCTIONED"},
  "0x7db418b5d567a4e0e8c59ad71be1fce48f3e6107":{name:"OFAC Sanctioned",cat:"SANCTIONED"},
  "0x72a5843cc08275c8171e582972aa4fda8c397b2a":{name:"OFAC Sanctioned",cat:"SANCTIONED"},
  "0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b37d9":{name:"OFAC Sanctioned",cat:"SANCTIONED"},
  "0x19aa5fe80d33a56d56c78e82ea5e50e5d80b4dfe":{name:"Scam Infrastructure",cat:"SCAM"},
  "0xdd4c48c0b24039969fc16d1cdf626eab821d3384":{name:"Rugpull / Scam",cat:"SCAM"},
};
const BRIDGES = {
  "0x3ee18b2214aff97000d974cf647e7c347e8fa585":"Wormhole Bridge",
  "0xa0c68c638235ee32657e8f720a23cec1bfc77c77":"Polygon Bridge",
  "0xce16f69375520ab01377ce7b88f5ba8c48f8d666":"Stargate Finance",
  "0x5a3810e82561e58ee51a02a9ec94dc5cc0f9b80e":"Hop Protocol",
  "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f":"Arbitrum Bridge",
  "0x8eb8a3b98659cce290402893d0123abb75e3ab28":"Avalanche Bridge",
  "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1":"Optimism Bridge",
  "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf":"Polygon PoS Bridge",
};
const DEFI = {
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d":"Uniswap V2",
  "0xe592427a0aece92de3edee1f18e0157c05861564":"Uniswap V3",
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f":"SushiSwap",
  "0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714":"Curve 3Pool",
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9":"Aave V2",
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2":"Aave V3",
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84":"Lido stETH",
  "0x00000000219ab540356cbb839cbe05303d7705fa":"ETH2 Deposit",
  "0x1111111254fb6c44bac0bed2854e76f90643097d":"1inch V4",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff":"0x Exchange",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45":"Uniswap Router2",
};
const EXAMPLES = [
  {addr:"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",label:"vitalik.eth",note:"Ethereum co-founder — try ENS!"},
  {addr:"0x742d35Cc6634C0532925a3b844Bc454e4438f44e",label:"Exchange Hot Wallet",note:"High volume, clean profile"},
  {addr:"0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503",label:"Binance Cold Wallet",note:"Institutional — massive volume"},
];

const DARK={bg:"#050a12",s1:"#0a1220",s2:"#0e1828",s3:"#142030",border:"#1a2e4a",borderH:"#2a4878",text:"#c4d8f0",text2:"#546e8a",text3:"#1e3248",cyan:"#38bdf8",green:"#34d399",amber:"#fbbf24",red:"#f87171",inputBg:"#0a1220",headerBg:"#050a12f2",gridLine:"#1a2e4a28",scrollThumb:"#1a2e4a"};
const LIGHT={bg:"#f0f4f8",s1:"#ffffff",s2:"#f8fafc",s3:"#eef2f7",border:"#cbd5e1",borderH:"#94a3b8",text:"#0f172a",text2:"#475569",text3:"#94a3b8",cyan:"#0284c7",green:"#059669",amber:"#d97706",red:"#dc2626",inputBg:"#ffffff",headerBg:"#f0f4f8f2",gridLine:"#cbd5e128",scrollThumb:"#cbd5e1"};

const rPal=(s,T)=>s<=3?{c:T.green,bg:`${T.green}18`,br:`${T.green}60`,glow:`${T.green}25`,gl2:`${T.green}10`}:s<=6?{c:T.amber,bg:`${T.amber}18`,br:`${T.amber}60`,glow:`${T.amber}20`,gl2:`${T.amber}10`}:{c:T.red,bg:`${T.red}18`,br:`${T.red}60`,glow:`${T.red}25`,gl2:`${T.red}10`};
const rLabel=s=>s<=3?"LOW":s<=6?"MEDIUM":"HIGH";
const pctile=s=>s<=2?4:s<=3?11:s<=4?27:s<=5?47:s<=6?63:s<=7?78:s<=8?88:s<=9?95:99;
const knownName=a=>{const k=a?.toLowerCase();return HIGH_RISK[k]?.name||BRIDGES[k]||DEFI[k]||null;};
const nodeCat=a=>{const k=a?.toLowerCase();return HIGH_RISK[k]?"high":BRIDGES[k]?"bridge":DEFI[k]?"defi":"unknown";};
const shortAddr=a=>a?`${a.slice(0,6)}…${a.slice(-4)}`:"—";
const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function resolveAddress(input){
  const t=input.trim();
  if(!t.endsWith(".eth"))return{address:t,ens:null};
  try{const r=await fetch(`https://api.ensideas.com/ens/resolve/${t}`);const d=await r.json();if(d.address)return{address:d.address,ens:t};}catch(e){}
  return{address:t,ens:null};
}

function detectNFTWash(nftTxs,address){
  if(!nftTxs?.length)return 0;
  const addr=address.toLowerCase(),rec={},sent={};
  nftTxs.forEach(tx=>{const key=`${tx.contractAddress?.toLowerCase()}-${tx.tokenID}`;if(tx.to?.toLowerCase()===addr)rec[key]=+tx.timeStamp;if(tx.from?.toLowerCase()===addr)sent[key]=+tx.timeStamp;});
  return Object.keys(rec).filter(k=>sent[k]&&Math.abs(rec[k]-sent[k])<30*86400).length;
}

function computeRisk(txList,tokenTxs,nftTxs,address){
  if(!txList?.length)return{score:5,factors:{},flags:[],flagged:[],byMonth:{},firstTs:Date.now()/1000,ageInDays:0,uniqueContracts:0,washCount:0,stableVolume:0};
  const addr=address.toLowerCase();
  const ts=txList.map(t=>+t.timeStamp).filter(Boolean).sort((a,b)=>a-b);
  const firstTs=ts[0]||Date.now()/1000,ageD=(Date.now()/1000-firstTs)/86400,flagged=[];
  const mixerTx=txList.filter(tx=>HIGH_RISK[tx.to?.toLowerCase()]?.cat==="MIXER");
  const sancTx=txList.filter(tx=>HIGH_RISK[tx.to?.toLowerCase()]?.cat==="SANCTIONED");
  const bridgeTx=txList.filter(tx=>BRIDGES[tx.to?.toLowerCase()]);
  const mixS=mixerTx.length===0?1:mixerTx.length===1?8:10;
  const sancS=sancTx.length>0?10:1;
  const bridgeS=bridgeTx.length===0?1:bridgeTx.length<=3?3:bridgeTx.length<=8?5:7;
  mixerTx.forEach(tx=>flagged.push({...tx,flag:"MIXER_INTERACTION",sev:"critical"}));
  sancTx.forEach(tx=>flagged.push({...tx,flag:"SANCTIONS_HIT",sev:"critical"}));
  bridgeTx.slice(0,3).forEach(tx=>flagged.push({...tx,flag:"BRIDGE_USAGE",sev:"medium"}));
  const byMonth={};
  txList.forEach(tx=>{const m=new Date(+tx.timeStamp*1000).toISOString().slice(0,7);byMonth[m]=(byMonth[m]||0)+1;});
  const counts=Object.values(byMonth),avg=counts.reduce((a,b)=>a+b,0)/Math.max(counts.length,1),maxC=Math.max(...counts,0);
  const velS=maxC>avg*4?8:maxC>avg*2.5?5:2;
  const ageS=ageD>1095?1:ageD>365?3:ageD>180?5:ageD>90?7:9;
  const bigTx=txList.filter(tx=>parseFloat(tx.value||0)/1e18>10);
  const hvS=(ageD<180&&bigTx.length>0)?8:bigTx.length>5?4:2;
  const contracts=new Set(txList.map(tx=>tx.to?.toLowerCase()).filter(Boolean));contracts.delete(addr);
  const uniq=contracts.size,divS=uniq>100?2:uniq>30?3:uniq>10?4:6;
  const washCount=detectNFTWash(nftTxs,address);
  const washS=washCount===0?1:washCount<=2?6:9;
  if(washCount>0)flagged.push({hash:"nft-wash",flag:"NFT_WASH_TRADING",sev:"high",to:"",from:"",value:"0",timeStamp:"0",note:`${washCount} NFT(s) bought and sold within 30 days`});
  const stableVolume=(tokenTxs||[]).filter(tx=>["usdt","usdc","dai","busd"].some(s=>tx.tokenSymbol?.toLowerCase().includes(s))).reduce((s,tx)=>s+parseFloat(tx.value||0)/Math.pow(10,parseInt(tx.tokenDecimal||18)),0);
  const factors={
    "Wallet Age":{score:ageS,w:0.12,value:`${Math.floor(ageD)}d`,label:ageD>1095?"Established (3y+)":ageD>365?"Mature (1-3y)":"New wallet"},
    "Mixer Interaction":{score:mixS,w:0.25,value:`${mixerTx.length} hits`,label:mixerTx.length===0?"None detected":"⚠ DETECTED"},
    "Sanctions Exposure":{score:sancS,w:0.25,value:`${sancTx.length} hits`,label:sancTx.length?"OFAC Adjacent":"None"},
    "Bridge Activity":{score:bridgeS,w:0.10,value:`${bridgeTx.length} events`,label:bridgeTx.length===0?"None":"Present"},
    "Velocity Pattern":{score:velS,w:0.10,value:`${Math.round(avg)}/mo avg`,label:velS>5?"Spike detected":"Normal"},
    "NFT Wash Trading":{score:washS,w:0.08,value:`${washCount} flagged`,label:washCount===0?"Clean":"Suspected washing"},
    "High-Value New":{score:hvS,w:0.06,value:`${bigTx.length} large txns`,label:hvS>6?"Flagged":"Normal"},
    "Contract Diversity":{score:divS,w:0.04,value:`${uniq} protocols`,label:uniq>50?"Diverse":"Concentrated"},
  };
  const score=parseFloat(Math.min(10,Math.max(1,Object.values(factors).reduce((s,f)=>s+f.score*f.w,0))).toFixed(1));
  const flags=[];
  if(mixerTx.length)flags.push("MIXER_INTERACTION");
  if(sancTx.length)flags.push("SANCTIONS_HIT");
  if(velS>5)flags.push("VELOCITY_SPIKE");
  if(hvS>6)flags.push("HIGH_VALUE_NEW_WALLET");
  if(bridgeTx.length>5)flags.push("EXCESSIVE_BRIDGING");
  if(washCount>0)flags.push("NFT_WASH_TRADING");
  return{score,factors,flags,flagged:flagged.slice(0,40),byMonth,firstTs,ageInDays:ageD,uniqueContracts:uniq,washCount,stableVolume};
}

function makeDemoData(addr){
  const seed=parseInt(addr.replace("0x","").slice(0,8),16)||99999;
  const rng=n=>Math.abs(Math.sin(seed*(n+1)*9301+49297)*233280)%1;
  const ageD=Math.floor(200+rng(1)*1300),now=Date.now()/1000,first=now-ageD*86400;
  const n=Math.floor(40+rng(2)*380),hasMix=rng(3)>0.75,hasSanc=rng(4)>0.92,bCount=Math.floor(rng(5)*8);
  const dk=Object.keys(DEFI),bk=Object.keys(BRIDGES);
  const txList=Array.from({length:Math.min(n,200)},(_,i)=>{
    const t=first+rng(i*7+10)*ageD*86400;
    let to;
    if(hasMix&&i===4)to="0x722122df12d4e14e13ac3b6895a86e84145b6967";
    else if(hasSanc&&i===9)to="0x7f367cc41522ce07553e823bf3be79a889debe1b";
    else if(i<bCount)to=bk[Math.floor(rng(i)*bk.length)];
    else to=dk[Math.floor(rng(i*3+1)*dk.length)];
    return{hash:"0x"+Array.from({length:64},(_,j)=>Math.floor(rng(i*100+j)*16).toString(16)).join(""),to,from:addr.toLowerCase(),value:String(Math.floor(rng(i*5+2)*3e18)),timeStamp:String(Math.floor(t)),isError:"0"};
  });
  const nftTxs=rng(7)>0.6?[
    {contractAddress:"0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",tokenID:"1234",to:addr.toLowerCase(),from:"0xother",timeStamp:String(Math.floor(first+ageD*0.5*86400))},
    {contractAddress:"0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",tokenID:"1234",from:addr.toLowerCase(),to:"0xother",timeStamp:String(Math.floor(first+ageD*0.6*86400))},
  ]:[];
  return{txList,balance:String(Math.floor(rng(99)*8e18)),txCount:n,tokenTxs:[],nftTxs};
}

function getBehaviorTags(txList,flags,ageInDays,washCount){
  const tags=[];
  const defiC=txList.filter(tx=>DEFI[tx.to?.toLowerCase()]).length;
  const bridgeC=txList.filter(tx=>BRIDGES[tx.to?.toLowerCase()]).length;
  const bigC=txList.filter(tx=>parseFloat(tx.value||0)/1e18>5).length;
  if(flags.includes("MIXER_INTERACTION"))tags.push("MIXER_INTERACTION");
  if(flags.includes("SANCTIONS_HIT"))tags.push("SANCTIONS_HIT");
  if(flags.includes("NFT_WASH_TRADING"))tags.push("NFT_WASH_TRADING");
  if(flags.includes("VELOCITY_SPIKE"))tags.push("VELOCITY_SPIKE");
  if(flags.includes("EXCESSIVE_BRIDGING"))tags.push("EXCESSIVE_BRIDGING");
  if(defiC>40)tags.push("DEFI_POWER_USER");
  if(bridgeC>3&&!flags.includes("EXCESSIVE_BRIDGING"))tags.push("CROSS_CHAIN");
  if(ageInDays>1095)tags.push("ESTABLISHED");
  if(bigC>8)tags.push("WHALE");
  if(!flags.length&&txList.length>100)tags.push("CLEAN");
  return tags.slice(0,6);
}

function tagInfo(tag,T){
  const map={
    "MIXER_INTERACTION":{label:"Mixer Contact",c:T.red},
    "SANCTIONS_HIT":{label:"Sanctions Adjacent",c:T.red},
    "NFT_WASH_TRADING":{label:"NFT Wash Suspected",c:T.red},
    "VELOCITY_SPIKE":{label:"Velocity Anomaly",c:T.amber},
    "EXCESSIVE_BRIDGING":{label:"Bridge Hopper",c:T.amber},
    "DEFI_POWER_USER":{label:"DeFi Power User",c:T.green},
    "CROSS_CHAIN":{label:"Cross-Chain Active",c:T.cyan},
    "ESTABLISHED":{label:"Established Wallet",c:T.cyan},
    "WHALE":{label:"Whale Activity",c:T.cyan},
    "CLEAN":{label:"Clean Profile",c:T.green},
  };
  return map[tag]||{label:tag,c:T.text2};
}

function TiltCard({children,style,intensity=9,isDark=true}){
  const ref=useRef(null),fr=useRef(null);
  const [s,setS]=useState({rx:0,ry:0,sx:50,sy:50,on:false});
  const onMove=useCallback(e=>{
    if(window.innerWidth<=640)return;
    if(fr.current)cancelAnimationFrame(fr.current);
    fr.current=requestAnimationFrame(()=>{
      if(!ref.current)return;
      const r=ref.current.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      setS({rx:(y-0.5)*-intensity,ry:(x-0.5)*intensity,sx:x*100,sy:y*100,on:true});
    });
  },[intensity]);
  const onLeave=useCallback(()=>setS({rx:0,ry:0,sx:50,sy:50,on:false}),[]);
  return(
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{...style,transform:`perspective(1100px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) scale(${s.on?1.012:1})`,
        transition:s.on?"transform 0.07s ease":"transform 0.55s cubic-bezier(0.23,1,0.32,1)",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:10,background:`radial-gradient(circle at ${s.sx}% ${s.sy}%, rgba(255,255,255,${s.on?(isDark?0.05:0.12):0}), transparent 55%)`,transition:"background 0.1s"}}/>
      <div style={{position:"relative",zIndex:1}}>{children}</div>
    </div>
  );
}

function Gauge({score,T}){
  const{c}=rPal(score,T);
  const[p,setP]=useState(0);
  useEffect(()=>{const id=setTimeout(()=>setP(score/10),100);return()=>clearTimeout(id);},[score]);
  const r=48,circ=Math.PI*r,off=circ*(1-p);
  return(
    <svg width="116" height="74" viewBox="0 0 116 76">
      <path d={`M 10 60 A ${r} ${r} 0 0 1 106 60`} fill="none" stroke={T.s3} strokeWidth="7" strokeLinecap="round"/>
      <path d={`M 10 60 A ${r} ${r} 0 0 1 106 60`} fill="none" stroke={c} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} style={{transition:"stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)"}}/>
      <text x="58" y="50" textAnchor="middle" fill={c} fontSize="20" fontWeight="700" fontFamily="'IBM Plex Mono',monospace">{score.toFixed(1)}</text>
      <text x="58" y="64" textAnchor="middle" fill={T.text3} fontSize="8" fontFamily="'IBM Plex Mono',monospace" letterSpacing="2">/10</text>
    </svg>
  );
}

function CategoryBar({txList,flagged,T}){
  const fh=new Set((flagged||[]).map(t=>t.hash));
  let defi=0,bridge=0,suspicious=0,other=0;
  (txList||[]).forEach(tx=>{const k=tx.to?.toLowerCase();if(fh.has(tx.hash)||HIGH_RISK[k])suspicious++;else if(BRIDGES[k])bridge++;else if(DEFI[k])defi++;else other++;});
  const total=Math.max(txList?.length||1,1);
  const cats=[{label:"DeFi",pct:defi/total*100,c:T.green},{label:"Bridge",pct:bridge/total*100,c:T.cyan},{label:"Suspicious",pct:suspicious/total*100,c:T.red},{label:"Other",pct:other/total*100,c:T.text3}].filter(c=>c.pct>0.5);
  return(
    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:"11px 16px",marginBottom:10}}>
      <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:7,fontFamily:"'IBM Plex Mono',monospace"}}>TRANSACTION COMPOSITION</div>
      <div style={{display:"flex",height:5,borderRadius:3,overflow:"hidden",marginBottom:7,gap:1}}>
        {cats.map(c=><div key={c.label} style={{flex:c.pct,background:c.c,transition:"flex 0.8s ease"}}/>)}
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {cats.map(c=><div key={c.label} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:1,background:c.c}}/><span style={{fontSize:"9px",color:T.text2,fontFamily:"'IBM Plex Mono',monospace"}}>{c.label} {c.pct.toFixed(0)}%</span></div>)}
      </div>
    </div>
  );
}

function RiskRadar({factors,score,T}){
  const{c}=rPal(score,T);
  const data=Object.entries(factors).map(([k,f])=>({subject:k.split(" ").slice(0,2).map(w=>w.slice(0,4).toUpperCase()).join("·"),score:f.score,fullMark:10}));
  const CT=({payload,x,y,cx,cy})=>{const a=Math.atan2(y-cy,x-cx),ox=x+Math.cos(a)*10,oy=y+Math.sin(a)*10;return<text x={ox} y={oy} textAnchor="middle" dominantBaseline="middle" fill={T.text2} fontSize={9} fontFamily="'IBM Plex Mono',monospace">{payload.value}</text>;};
  return(
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{top:14,right:14,bottom:14,left:14}}>
        <PolarGrid stroke={T.border} gridType="polygon"/>
        <PolarAngleAxis dataKey="subject" tick={<CT/>}/>
        <Radar dataKey="score" stroke={c} fill={c} fillOpacity={0.12} strokeWidth={1.5} dot={{r:3,fill:c,strokeWidth:0}}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

function NetworkGraph({txList,centerAddress,onNodeClick,T}){
  const svgRef=useRef(null),simRef=useRef(null);
  useEffect(()=>{
    if(!txList?.length||!svgRef.current)return;
    const center=centerAddress.toLowerCase(),inter={};
    txList.forEach(tx=>{const t=tx.to?.toLowerCase();if(!t||t===center)return;if(!inter[t])inter[t]={count:0};inter[t].count++;});
    const top=Object.entries(inter).sort((a,b)=>b[1].count-a[1].count).slice(0,22);
    const COL={center:T.cyan,high:T.red,bridge:T.amber,defi:T.green,unknown:T.text3};
    const nodes=[{id:center,label:"TARGET",cat:"center",count:txList.length,isCenter:true},...top.map(([a,d])=>({id:a,label:knownName(a)||shortAddr(a),cat:nodeCat(a),count:d.count}))];
    const links=top.map(([a,d])=>({source:center,target:a,count:d.count}));
    const W=svgRef.current.clientWidth||360,H=340;
    d3.select(svgRef.current).selectAll("*").remove();
    const svg=d3.select(svgRef.current).attr("viewBox",`0 0 ${W} ${H}`).attr("width","100%").attr("height",H);
    svg.append("rect").attr("width",W).attr("height",H).attr("fill",T.bg);
    const defs=svg.append("defs");
    Object.entries(COL).forEach(([k,c])=>{const f=defs.append("filter").attr("id",`g-${k}`).attr("x","-60%").attr("y","-60%").attr("width","220%").attr("height","220%");f.append("feGaussianBlur").attr("in","SourceGraphic").attr("stdDeviation",k==="center"?4:2).attr("result","b");const m=f.append("feMerge");m.append("feMergeNode").attr("in","b");m.append("feMergeNode").attr("in","SourceGraphic");});
    if(simRef.current)simRef.current.stop();
    const sim=d3.forceSimulation(nodes).force("link",d3.forceLink(links).id(d=>d.id).distance(90).strength(0.2)).force("charge",d3.forceManyBody().strength(-160)).force("center",d3.forceCenter(W/2,H/2)).force("collide",d3.forceCollide().radius(d=>d.isCenter?34:16));
    simRef.current=sim;
    const g=svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.3,3.5]).on("zoom",e=>g.attr("transform",e.transform)));
    const linkEl=g.append("g").selectAll("line").data(links).join("line").attr("stroke",d=>{const n=nodes.find(n=>n.id===(typeof d.target==="object"?d.target.id:d.target));return n?COL[n.cat]+"44":T.border;}).attr("stroke-width",1.5).attr("stroke-opacity",0.6);
    const ng=g.append("g").selectAll("g").data(nodes).join("g").attr("cursor","pointer").on("click",(_,d)=>{if(!d.isCenter&&onNodeClick)onNodeClick(d.id);}).call(d3.drag().on("start",(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;}).on("drag",(e,d)=>{d.fx=e.x;d.fy=e.y;}).on("end",(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}));
    ng.append("circle").attr("r",d=>d.isCenter?20:Math.max(7,Math.min(15,3+Math.sqrt(d.count)*1.8))).attr("fill",d=>COL[d.cat]+"18").attr("stroke",d=>COL[d.cat]).attr("stroke-width",d=>d.isCenter?2:1.5).attr("filter",d=>`url(#g-${d.cat})`);
    ng.append("text").attr("text-anchor","middle").attr("dy",d=>d.isCenter?"0.35em":"-1.4em").attr("fill",d=>COL[d.cat]).attr("font-size",d=>d.isCenter?"9px":"7px").attr("font-family","'IBM Plex Mono',monospace").attr("pointer-events","none").text(d=>d.isCenter?"TARGET":d.label.slice(0,12));
    sim.on("tick",()=>{linkEl.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);ng.attr("transform",d=>`translate(${d.x},${d.y})`);});
    return()=>{if(simRef.current)simRef.current.stop();};
  },[txList,centerAddress,T]);
  return(
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",top:10,right:12,display:"flex",gap:10,zIndex:10,flexWrap:"wrap"}}>
        {[["center",T.cyan,"Target"],["defi",T.green,"DeFi"],["bridge",T.amber,"Bridge"],["high",T.red,"Risk"]].map(([k,c,l])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:"9px",color:T.text2,fontFamily:"'IBM Plex Mono',monospace"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>{l}
          </div>
        ))}
      </div>
      <svg ref={svgRef} style={{width:"100%",display:"block",borderRadius:4}}/>
      <div style={{padding:"6px 12px",fontSize:"9px",color:T.text3,fontFamily:"'IBM Plex Mono',monospace"}}>DRAG · PINCH ZOOM · TAP TO PIVOT</div>
    </div>
  );
}

function Timeline({txList,flagged,T}){
  const data=useMemo(()=>{
    if(!txList?.length)return[];
    const fh=new Set((flagged||[]).map(t=>t.hash)),m={};
    txList.forEach(tx=>{const d=new Date(+tx.timeStamp*1000),k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;if(!m[k])m[k]={month:k,txns:0,vol:0,flags:0};m[k].txns++;m[k].vol+=parseFloat(tx.value||0)/1e18;if(fh.has(tx.hash))m[k].flags++;});
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-18);
  },[txList,flagged]);
  const TT=({active,payload,label})=>active&&payload?.length?<div style={{background:T.s1,border:`1px solid ${T.border}`,padding:"8px 12px",borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.text}}><div style={{color:T.text2,marginBottom:4}}>{label}</div>{payload.map(p=><div key={p.name} style={{color:p.color||T.text}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(2):p.value}</div>)}</div>:null;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div>
        <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>MONTHLY TRANSACTIONS <span style={{color:`${T.red}88`}}>(RED = FLAGGED)</span></div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barSize={11}>
            <XAxis dataKey="month" tick={{fill:T.text3,fontSize:8,fontFamily:"'IBM Plex Mono',monospace"}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.text3,fontSize:8,fontFamily:"'IBM Plex Mono',monospace"}} axisLine={false} tickLine={false} width={28}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="txns" name="Transactions" radius={[3,3,0,0]}>{data.map((e,i)=><Cell key={i} fill={e.flags>0?T.red:T.cyan} fillOpacity={e.flags>0?0.7:0.35}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>ETH VOLUME TREND</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data}>
            <defs><linearGradient id="vg4" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.cyan} stopOpacity={0.25}/><stop offset="95%" stopColor={T.cyan} stopOpacity={0}/></linearGradient></defs>
            <XAxis dataKey="month" tick={{fill:T.text3,fontSize:8,fontFamily:"'IBM Plex Mono',monospace"}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.text3,fontSize:8,fontFamily:"'IBM Plex Mono',monospace"}} axisLine={false} tickLine={false} width={28}/>
            <Tooltip content={<TT/>}/>
            <Area type="monotone" dataKey="vol" name="ETH" stroke={T.cyan} fill="url(#vg4)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Evidence({flagged,factors,T}){
  const[ex,setEx]=useState(null);
  const sC={critical:T.red,medium:T.amber,low:T.green,high:T.red};
  const grouped=useMemo(()=>(flagged||[]).reduce((acc,tx)=>{(acc[tx.flag]??=[]).push(tx);return acc;},{}),[flagged]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:"16px 18px"}}>
        <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:12,fontFamily:"'IBM Plex Mono',monospace"}}>SCORING METHODOLOGY</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
          {Object.entries(factors||{}).map(([k,f])=>{const{c}=rPal(f.score,T);return(
            <div key={k} style={{padding:"10px 12px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:4}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:"9px",color:T.text2,fontFamily:"'IBM Plex Mono',monospace"}}>{k.toUpperCase()}</span><span style={{fontSize:"9px",color:c,fontFamily:"'IBM Plex Mono',monospace"}}>{f.score}/10 · {Math.round(f.w*100)}%</span></div>
              <div style={{height:"2px",background:T.s3,borderRadius:2,marginBottom:5,overflow:"hidden"}}><div style={{height:"100%",width:`${f.score*10}%`,background:c,transition:"width 0.9s ease"}}/></div>
              <div style={{fontSize:"10px",color:T.text,fontFamily:"'IBM Plex Mono',monospace"}}>{f.label}</div>
              <div style={{fontSize:"9px",color:T.text3,marginTop:1,fontFamily:"'IBM Plex Mono',monospace"}}>{f.value}</div>
            </div>
          );})}
        </div>
      </div>
      {Object.keys(grouped).length===0?(
        <div style={{textAlign:"center",padding:"24px",color:T.green,fontSize:"11px",fontFamily:"'IBM Plex Mono',monospace",border:`1px solid ${T.green}30`,borderRadius:6,background:`${T.green}08`}}>✓ NO FLAGGED TRANSACTIONS</div>
      ):Object.entries(grouped).map(([flag,txns])=>(
        <div key={flag} style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,overflow:"hidden"}}>
          <div style={{padding:"9px 16px",background:`${T.red}08`,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:"11px",color:T.red,letterSpacing:1,fontFamily:"'IBM Plex Mono',monospace"}}>⚠ {flag.replace(/_/g," ")}</span>
            <span style={{fontSize:"9px",color:T.text3,fontFamily:"'IBM Plex Mono',monospace"}}>{txns.length} RECORDS</span>
          </div>
          {txns.slice(0,6).map((tx,i)=>(
            <div key={i} onClick={()=>setEx(ex===tx.hash?null:tx.hash)} style={{padding:"9px 14px",borderBottom:i<txns.length-1?`1px solid ${T.s3}`:"none",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.s2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              {tx.note?(
                <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:5,height:5,borderRadius:"50%",background:sC[tx.sev]||T.amber,flexShrink:0}}/><span style={{fontSize:"10px",color:T.text,fontFamily:"'IBM Plex Mono',monospace"}}>{tx.note}</span></div>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:sC[tx.sev]||T.amber,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><span style={{fontSize:"10px",color:T.text,fontFamily:"'IBM Plex Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{knownName(tx.to)||shortAddr(tx.to)}</span><span style={{fontSize:"10px",color:T.text,fontFamily:"'IBM Plex Mono',monospace",flexShrink:0}}>{(parseFloat(tx.value||0)/1e18).toFixed(4)} ETH</span></div>
                    <div style={{fontSize:"9px",color:T.text2,fontFamily:"'IBM Plex Mono',monospace",marginTop:2}}>{tx.hash?.slice(0,16)}… · {new Date(+tx.timeStamp*1000).toLocaleDateString()}</div>
                  </div>
                  <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:"9px",color:T.cyan,border:`1px solid ${T.cyan}44`,padding:"2px 8px",borderRadius:3,textDecoration:"none",fontFamily:"'IBM Plex Mono',monospace",flexShrink:0}}>↗</a>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AIAnalyst({result,T}){
  const[phase,setPhase]=useState("idle");
  const[text,setText]=useState("");
  const[copied,setCopied]=useState(false);
  const iRef=useRef(null);
  const R=rPal(result.score,T);
  const rec=useMemo(()=>{const m=text.match(/RECOMMENDATION:\s*([^\n]+)/i);return m?m[1].trim().replace(/[.\s]*$/,""):null;},[text]);
  const recPal=rec?rec.toUpperCase().includes("CLEAR")?{c:T.green,bg:`${T.green}12`,br:`${T.green}44`}:rec.toUpperCase().includes("ENHANCED")?{c:T.amber,bg:`${T.amber}12`,br:`${T.amber}44`}:{c:T.red,bg:`${T.red}12`,br:`${T.red}44`}:null;
  async function generate(){
    setPhase("loading");setText("");
    if(iRef.current)clearInterval(iRef.current);
    const fs=Object.entries(result.factors).map(([k,f])=>`${k}: ${f.score}/10 (${f.value})`).join("; ");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`You are a senior AML compliance analyst. Write a 3-paragraph professional assessment. No headers, no bullets, no markdown.\n\nWALLET: ${result.address}\nRisk Score: ${result.score}/10 — ${rLabel(result.score)} — top ${100-pctile(result.score)}% riskiest\nAge: ${Math.floor(result.ageInDays)} days | TXs: ${result.txCount} | ETH: ${result.balance} | Protocols: ${result.uniqueContracts}\nFlags: ${result.flags.length?result.flags.join(", "):"NONE"}\nNFT Wash: ${result.washCount} detected\nStablecoin volume: $${fmt(Math.round(result.stableVolume||0))}\nFactor scores: ${fs}\n\nPara 1: Executive summary.\nPara 2: Specific behavioral findings.\nPara 3: Close with exactly "RECOMMENDATION: [CLEAR FOR PROCESSING / ENHANCED DUE DILIGENCE / ESCALATE TO COMPLIANCE OFFICER / BLOCK AND REPORT TO FINCEN]"\n\nUnder 220 words. Direct, professional, specific.`}]})});
      const d=await res.json();const full=d.content?.[0]?.text||"Analysis unavailable.";
      setPhase("streaming");let i=0;
      iRef.current=setInterval(()=>{i+=18;if(i>=full.length){setText(full);clearInterval(iRef.current);setPhase("done");}else setText(full.slice(0,i));},15);
    }catch(e){setText("AI analysis unavailable. Add an Anthropic API key to enable.");setPhase("done");}
  }
  function copyReport(){navigator.clipboard.writeText(`CHAINWATCH ANALYST REPORT — ${new Date().toISOString()}\nWallet: ${result.address}\nRisk: ${result.score}/10 (${rLabel(result.score)})\n\n${text}`);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  const bodyText=text.replace(/RECOMMENDATION:.*$/is,"").trim();
  return(
    <div style={{background:T.s1,border:`1px solid ${R.br}`,borderRadius:10,padding:"20px",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:phase==="idle"?0:14,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:T.cyan,animation:phase==="loading"?"cw-pulse 1s infinite":"none"}}/>
            <span style={{fontSize:12,fontWeight:700,color:T.text,letterSpacing:"1.5px",fontFamily:"'IBM Plex Mono',monospace"}}>AI ANALYST REPORT</span>
          </div>
          <div style={{fontSize:"9px",color:T.text3,letterSpacing:"1px",fontFamily:"'IBM Plex Mono',monospace",paddingLeft:15}}>POWERED BY CLAUDE · AML FRAMEWORK</div>
        </div>
        {phase==="done"&&<button onClick={copyReport} style={{padding:"5px 12px",background:copied?`${T.green}15`:T.s2,border:`1px solid ${copied?T.green+"44":T.border}`,borderRadius:20,color:copied?T.green:T.text2,fontSize:"9px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>{copied?"✓ COPIED":"COPY"}</button>}
      </div>
      {phase==="idle"&&(
        <div style={{textAlign:"center",padding:"18px 0 6px"}}>
          <div style={{fontSize:11,color:T.text2,lineHeight:1.8,marginBottom:16,fontFamily:"'IBM Plex Mono',monospace"}}>Generate a professional AML assessment with a formal compliance recommendation.</div>
          <button onClick={generate} style={{padding:"12px 28px",background:`${T.cyan}14`,border:`1px solid ${T.cyan}55`,borderRadius:6,color:T.cyan,fontSize:"11px",cursor:"pointer",letterSpacing:"2px",fontFamily:"'IBM Plex Mono',monospace",width:"100%",maxWidth:320}}>⚡ GENERATE AI ANALYSIS</button>
        </div>
      )}
      {phase==="loading"&&<div style={{textAlign:"center",padding:"24px 0"}}><div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:10}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.cyan,animation:`cw-bounce 1s ${i*0.15}s infinite`}}/>)}</div><div style={{fontSize:"10px",color:T.text3,letterSpacing:"2px",fontFamily:"'IBM Plex Mono',monospace"}}>ANALYZING…</div></div>}
      {(phase==="streaming"||phase==="done")&&(
        <div>
          <div style={{fontSize:12,color:T.text2,lineHeight:1.9,fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{bodyText}{phase==="streaming"&&<span style={{animation:"cw-blink 0.6s infinite",color:T.cyan}}>▌</span>}</div>
          {rec&&recPal&&<div style={{marginTop:14,padding:"9px 14px",background:recPal.bg,border:`1px solid ${recPal.br}`,borderRadius:6,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><div style={{width:7,height:7,borderRadius:"50%",background:recPal.c,flexShrink:0}}/><span style={{fontSize:11,color:recPal.c,fontWeight:700,letterSpacing:"0.5px",fontFamily:"'IBM Plex Mono',monospace",wordBreak:"break-word"}}>RECOMMENDATION: {rec}</span></div>}
        </div>
      )}
    </div>
  );
}

function MethodologyModal({onClose,T}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:"16px"}} onClick={onClose}>
      <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:10,padding:"28px 24px",maxWidth:580,width:"100%",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:T.text,letterSpacing:"2px",fontFamily:"'IBM Plex Mono',monospace"}}>METHODOLOGY & ABOUT</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.text3,cursor:"pointer",fontSize:20,lineHeight:1,fontFamily:"'IBM Plex Mono',monospace"}}>×</button>
        </div>
        {[
          ["What is ChainWatch?","ChainWatch is a free, open-source Ethereum wallet risk intelligence tool. It analyzes on-chain transaction history to produce a composite risk score using a weighted methodology similar to professional AML workflows."],
          ["Scoring Methodology","Risk scores (1–10) are computed using 8 weighted factors: Mixer Interaction (25%), Sanctions Exposure (25%), Wallet Age (12%), Bridge Activity (10%), Velocity Pattern (10%), NFT Wash Trading (8%), High-Value New Wallet (6%), and Contract Diversity (4%)."],
          ["Data Sources","With an Etherscan API key, ChainWatch fetches live ETH transactions, ERC-20 token transfers, and NFT history. Without a key, deterministic demo data is generated from the address hash."],
          ["Limitations","Ethereum mainnet only. Cross-chain activity on Polygon, Arbitrum, BSC etc. is not visible. The sanctions list is a subset of the full OFAC SDN list. For informational purposes only — not legal or financial advice."],
        ].map(([h,b])=>(
          <div key={h} style={{marginBottom:18}}>
            <div style={{fontSize:"10px",color:T.cyan,letterSpacing:"1.5px",marginBottom:5,fontFamily:"'IBM Plex Mono',monospace"}}>{h.toUpperCase()}</div>
            <div style={{fontSize:12,color:T.text2,lineHeight:1.8,fontFamily:"'IBM Plex Mono',monospace"}}>{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatchPanel({apiKey,T}){
  const[raw,setRaw]=useState("");
  const[running,setRunning]=useState(false);
  const[results,setResults]=useState([]);
  const[progress,setProgress]=useState(0);
  const[total,setTotal]=useState(0);
  const stopRef=useRef(false);
  function parseAddresses(text){return text.split(/[\n,;\t]+/).map(a=>a.trim().replace(/^"|"$/g,"")).filter(a=>a.length>10).slice(0,50);}
  function handleFile(e){const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=ev=>setRaw(ev.target.result||"");reader.readAsText(f);}
  async function runBatch(){
    const addrs=parseAddresses(raw);if(!addrs.length)return;
    setRunning(true);setResults([]);setProgress(0);setTotal(addrs.length);stopRef.current=false;
    for(let i=0;i<addrs.length;i++){
      if(stopRef.current)break;
      const a=addrs[i];let txList=[],balance="0",txCount=0;
      try{
        if(apiKey.trim()){
          const base="https://api.etherscan.io/v2/api?chainid=1&";
          const[txR,balR]=await Promise.all([fetch(`${base}?module=account&action=txlist&address=${a}&startblock=0&endblock=99999999&page=1&offset=200&sort=asc&apikey=${apiKey.trim()}`).then(r=>r.json()),fetch(`${base}?module=account&action=balance&address=${a}&tag=latest&apikey=${apiKey.trim()}`).then(r=>r.json())]);
          txList=txR.result||[];balance=balR.result||"0";txCount=txList.length;await sleep(220);
        }else{const d=makeDemoData(a);txList=d.txList;balance=d.balance;txCount=d.txCount;}
        const risk=computeRisk(txList,[],[],a);
        setResults(p=>[...p,{address:a,score:risk.score,label:rLabel(risk.score),flags:risk.flags,balance:(parseFloat(balance)/1e18).toFixed(3),txCount,ageInDays:Math.floor(risk.ageInDays)}]);
      }catch(e){setResults(p=>[...p,{address:a,score:null,label:"ERROR",flags:[],balance:"—",txCount:0,ageInDays:0}]);}
      setProgress(i+1);
    }
    setRunning(false);
  }
  function exportCSV(){const rows=[["Address","Score","Risk","Flags","ETH","TXs"],...results.map(r=>[r.address,r.score,r.label,r.flags.join("|"),r.balance,r.txCount])];const csv=rows.map(r=>r.join(",")).join("\n");const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="chainwatch-batch.csv";a.click();}
  return(
    <div>
      <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:12,fontFamily:"'IBM Plex Mono',monospace"}}>BATCH ANALYSIS — UP TO 50 ADDRESSES</div>
      <label style={{display:"inline-block",padding:"8px 14px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:4,color:T.text2,fontSize:"9px",cursor:"pointer",letterSpacing:1,fontFamily:"'IBM Plex Mono',monospace",marginBottom:10}}>
        UPLOAD CSV <input type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}}/>
      </label>
      <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder={"0x742d35Cc6634C0532925a3b844Bc454e4438f44e\n0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n..."}
        style={{width:"100%",background:T.s2,border:`1px solid ${T.border}`,borderRadius:6,padding:"12px",color:T.text,fontSize:11,fontFamily:"'IBM Plex Mono',monospace",outline:"none",resize:"vertical",minHeight:110,marginBottom:10}}/>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={runBatch} disabled={running||!raw.trim()} style={{padding:"10px 20px",background:running?T.s2:`${T.cyan}14`,border:`1px solid ${running?T.border:T.cyan+"55"}`,borderRadius:6,color:running?T.text3:T.cyan,fontSize:"11px",cursor:running?"not-allowed":"pointer",letterSpacing:"2px",fontFamily:"'IBM Plex Mono',monospace"}}>
          {running?`ANALYZING ${progress}/${total}…`:`ANALYZE ${parseAddresses(raw).length} ADDRESSES`}
        </button>
        {running&&<button onClick={()=>{stopRef.current=true;}} style={{padding:"10px 14px",background:`${T.red}0a`,border:`1px solid ${T.red}33`,borderRadius:6,color:T.red,fontSize:"9px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>STOP</button>}
        {results.length>0&&!running&&<button onClick={exportCSV} style={{padding:"10px 14px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text2,fontSize:"9px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>EXPORT CSV ↓</button>}
      </div>
      {running&&<div style={{marginBottom:12}}><div style={{height:3,background:T.s3,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${total?progress/total*100:0}%`,background:T.cyan,transition:"width 0.3s"}}/></div><div style={{fontSize:"9px",color:T.text3,marginTop:4,fontFamily:"'IBM Plex Mono',monospace"}}>{progress}/{total} processed</div></div>}
      {results.length>0&&(
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{width:"100%",minWidth:420,borderCollapse:"collapse",fontSize:10,fontFamily:"'IBM Plex Mono',monospace"}}>
            <thead><tr>{["ADDRESS","SCORE","RISK","ETH","TXS"].map(h=><th key={h} style={{textAlign:"left",padding:"7px 10px",color:T.text3,fontSize:"9px",letterSpacing:1,borderBottom:`1px solid ${T.border}`,fontWeight:400}}>{h}</th>)}</tr></thead>
            <tbody>{results.sort((a,b)=>(b.score||0)-(a.score||0)).map((r,i)=>{const rp=r.score?rPal(r.score,T):{c:T.text3,bg:"transparent",br:T.text3};return(<tr key={i} style={{borderBottom:`1px solid ${T.s3}`}} onMouseEnter={e=>e.currentTarget.style.background=T.s2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{padding:"7px 10px",color:T.text2}}>{shortAddr(r.address)}</td><td style={{padding:"7px 10px"}}><span style={{color:rp.c,fontWeight:700}}>{r.score?.toFixed(1)||"—"}</span></td><td style={{padding:"7px 10px"}}><span style={{fontSize:"9px",color:rp.c,background:rp.bg,border:`1px solid ${rp.br}`,padding:"2px 8px",borderRadius:20}}>{r.label}</span></td><td style={{padding:"7px 10px",color:T.text2}}>{r.balance}</td><td style={{padding:"7px 10px",color:T.text2}}>{fmt(r.txCount)}</td></tr>);})}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS=["OVERVIEW","NETWORK","TIMELINE","EVIDENCE"];
const MODES=["SINGLE","BATCH"];

export default function App(){
  const[isDark,setIsDark]=useState(()=>{try{return localStorage.getItem("cw_theme")!=="light";}catch{return true;}});
  const T=isDark?DARK:LIGHT;
  const[input,setInput]=useState("");
  const[apiKey,setApiKey]=useState(()=>import.meta.env.VITE_ETHERSCAN_KEY||(()=>{try{return localStorage.getItem("cw_apikey")||"";}catch{return "";}})());
  const[showKey,setShowKey]=useState(false);
  const[showMethod,setShowMethod]=useState(false);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[result,setResult]=useState(null);
  const[tab,setTab]=useState("OVERVIEW");
  const[mode,setMode]=useState("SINGLE");
  const[isDemo,setIsDemo]=useState(false);
  const[watchlist,setWatchlist]=useState(()=>{try{return JSON.parse(localStorage.getItem("cw_watchlist")||"[]");}catch{return[];}});
  const[history,setHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem("cw_history")||"[]");}catch{return[];}});
  const[mouse,setMouse]=useState({x:-1000,y:-1000});
  const[copiedShare,setCopiedShare]=useState(false);
  const[ens,setEns]=useState(null);

  useEffect(()=>{try{localStorage.setItem("cw_theme",isDark?"dark":"light");}catch(e){};},[isDark]);
  useEffect(()=>{try{localStorage.setItem("cw_watchlist",JSON.stringify(watchlist));}catch(e){};},[watchlist]);
  useEffect(()=>{try{localStorage.setItem("cw_history",JSON.stringify(history));}catch(e){};},[history]);
  useEffect(()=>{try{localStorage.setItem("cw_apikey",apiKey);}catch(e){};},[apiKey]);
  useEffect(()=>{const h=e=>setMouse({x:e.clientX,y:e.clientY});window.addEventListener("mousemove",h,{passive:true});return()=>window.removeEventListener("mousemove",h);},[]);
  useEffect(()=>{try{const p=new URLSearchParams(window.location.search);const a=p.get("address");if(a){setInput(a);runAnalysis(a);}}catch(e){};},[]);

  async function runAnalysis(addr){
    const raw=(addr||input).trim();if(!raw)return;
    setLoading(true);setError(null);setResult(null);setTab("OVERVIEW");setEns(null);
    try{
      const{address,ens:resolvedEns}=await resolveAddress(raw);
      if(addr)setInput(resolvedEns||address);
      setEns(resolvedEns);
      let txList=[],balance="0",txCount=0,tokenTxs=[],nftTxs=[];
      if(apiKey.trim()){
        const base="https://api.etherscan.io/v2/api?chainid=1&";
        const[txR,balR,tokR,nftR]=await Promise.all([fetch(`${base}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=500&sort=asc&apikey=${apiKey.trim()}`).then(r=>r.json()),fetch(`${base}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey.trim()}`).then(r=>r.json()),fetch(`${base}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=200&sort=asc&apikey=${apiKey.trim()}`).then(r=>r.json()),fetch(`${base}?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=asc&apikey=${apiKey.trim()}`).then(r=>r.json())]);
        if(txR.status==="0"&&txR.message!=="No transactions found")throw new Error(txR.result||"Etherscan error — check your API key");
        txList=txR.result||[];balance=balR.result||"0";txCount=txList.length;tokenTxs=tokR.result||[];nftTxs=nftR.result||[];
        setIsDemo(false);
      }else{const d=makeDemoData(address);txList=d.txList;balance=d.balance;txCount=d.txCount;tokenTxs=d.tokenTxs;nftTxs=d.nftTxs;setIsDemo(true);}
      const risk=computeRisk(txList,tokenTxs,nftTxs,address);
      const r={address,balance:(parseFloat(balance)/1e18).toFixed(4),txCount,txList,tokenTxs,nftTxs,firstSeen:new Date(risk.firstTs*1000).toLocaleDateString(),...risk};
      setResult(r);
      setHistory(p=>[{address,ens:resolvedEns,score:r.score},...p.filter(h=>h.address!==address)].slice(0,10));
    }catch(e){setError(e.message);}finally{setLoading(false);}
  }

  function copyShare(){try{const url=`${window.location.origin}${window.location.pathname}?address=${encodeURIComponent(result.address)}`;navigator.clipboard.writeText(url);}catch{navigator.clipboard.writeText(result.address);}setCopiedShare(true);setTimeout(()=>setCopiedShare(false),2000);}

  const R=result?rPal(result.score,T):null;
  const tags=result?getBehaviorTags(result.txList,result.flags,result.ageInDays,result.washCount):[];
  const inWatch=result&&watchlist.some(w=>w.address===result.address);

  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'IBM Plex Mono',monospace",overflowX:"hidden",maxWidth:"100vw"}}>
      {isDark&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:5,background:`radial-gradient(140px circle at ${mouse.x}px ${mouse.y}px,rgba(255,255,255,0.04) 0%,transparent 100%),radial-gradient(800px circle at ${mouse.x}px ${mouse.y}px,rgba(56,189,248,0.06) 0%,transparent 65%)`}}/>}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:`linear-gradient(${T.gridLine} 1px,transparent 1px),linear-gradient(90deg,${T.gridLine} 1px,transparent 1px)`,backgroundSize:"44px 44px"}}/>

      {/* HEADER */}
      <div style={{borderBottom:`1px solid ${T.border}`,padding:"0 clamp(12px,4vw,32px)",background:T.headerBg,backdropFilter:"blur(18px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1340,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{display:"flex",gap:4}}>{[T.green,T.amber,T.red].map((c,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:c}}/>)}</div>
            <span style={{fontSize:13,fontWeight:700,letterSpacing:"3px",color:T.text}}>CHAINWATCH</span>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setIsDark(d=>!d)} style={{padding:"5px 10px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:20,color:T.text2,fontSize:"13px",cursor:"pointer",lineHeight:1,minWidth:34}}>{isDark?"☀":"🌙"}</button>
            <button onClick={()=>setShowMethod(true)} style={{padding:"5px 10px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:20,color:T.text2,fontSize:"9px",cursor:"pointer",letterSpacing:1,fontFamily:"'IBM Plex Mono',monospace"}}>?</button>
            <button onClick={()=>setShowKey(!showKey)} style={{padding:"5px 10px",background:apiKey?`${T.green}15`:T.s2,border:`1px solid ${apiKey?T.green+"50":T.border}`,borderRadius:20,color:apiKey?T.green:T.text2,fontSize:"9px",cursor:"pointer",letterSpacing:1,fontFamily:"'IBM Plex Mono',monospace"}}>{apiKey?"✓ LIVE":"API KEY"}</button>
            {result&&<button onClick={copyShare} style={{padding:"5px 10px",background:copiedShare?`${T.cyan}15`:T.s2,border:`1px solid ${copiedShare?T.cyan+"44":T.border}`,borderRadius:20,color:copiedShare?T.cyan:T.text2,fontSize:"9px",cursor:"pointer",letterSpacing:1,fontFamily:"'IBM Plex Mono',monospace"}}>{copiedShare?"✓":"SHARE"}</button>}
          </div>
        </div>
      </div>

      {showKey&&(
        <div style={{background:T.s1,borderBottom:`1px solid ${T.border}`,padding:"10px clamp(12px,4vw,32px)",zIndex:99,position:"relative"}}>
          <div style={{maxWidth:1340,margin:"0 auto",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:"9px",color:T.text3,letterSpacing:1,fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap"}}>ETHERSCAN KEY</span>
            <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Get free key at etherscan.io/apis"
              style={{flex:1,minWidth:180,background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,padding:"7px 12px",color:T.text,fontSize:11,fontFamily:"'IBM Plex Mono',monospace",outline:"none"}}/>
            <button onClick={()=>setShowKey(false)} style={{padding:"7px 14px",background:`${T.cyan}14`,border:`1px solid ${T.cyan}44`,borderRadius:4,color:T.cyan,fontSize:"9px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:1}}>SAVE</button>
          </div>
        </div>
      )}

      {showMethod&&<MethodologyModal onClose={()=>setShowMethod(false)} T={T}/>}

      <div style={{maxWidth:1340,margin:"0 auto",padding:"20px clamp(12px,4vw,32px)",position:"relative",zIndex:1,width:"100%",boxSizing:"border-box"}}>

        {/* Mode toggle */}
        <div style={{display:"flex",gap:2,background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:3,marginBottom:16,width:"100%"}}>
          {MODES.map(m=><button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"9px 8px",background:mode===m?T.s3:"transparent",border:`1px solid ${mode===m?T.borderH:"transparent"}`,borderRadius:4,color:mode===m?T.text:T.text3,fontSize:"11px",cursor:"pointer",letterSpacing:"1px",fontFamily:"'IBM Plex Mono',monospace",transition:"all 0.2s"}}>{m} ANALYSIS</button>)}
        </div>

        {/* Watchlist */}
        {watchlist.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:6,fontFamily:"'IBM Plex Mono',monospace"}}>WATCHLIST</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {watchlist.map(w=>{const wp=rPal(w.score||5,T);return(
                <div key={w.address} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:T.s1,border:`1px solid ${T.border}`,borderRadius:40,cursor:"pointer"}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:wp.c}}/>
                  <span onClick={()=>runAnalysis(w.address)} style={{fontSize:"9px",color:T.text,fontFamily:"'IBM Plex Mono',monospace"}}>{w.ens||shortAddr(w.address)}</span>
                  <span style={{fontSize:"9px",color:wp.c,fontFamily:"'IBM Plex Mono',monospace"}}>{w.score?.toFixed(1)}</span>
                  <span onClick={e=>{e.stopPropagation();setWatchlist(p=>p.filter(x=>x.address!==w.address));}} style={{color:T.text3,cursor:"pointer",fontSize:13,lineHeight:1,marginLeft:2}}>×</span>
                </div>
              );})}
            </div>
          </div>
        )}

        {mode==="BATCH"?(
          <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px",width:"100%",boxSizing:"border-box"}}>
            <BatchPanel apiKey={apiKey} T={T}/>
          </div>
        ):(
          <>
            {/* Search */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:"10px",color:T.text3,letterSpacing:"2px",marginBottom:8,fontFamily:"'IBM Plex Mono',monospace"}}>ETHEREUM ADDRESS OR ENS NAME</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%"}}>
                <div style={{position:"relative",width:"100%"}}>
                  <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:T.cyan,fontSize:13,fontFamily:"'IBM Plex Mono',monospace",pointerEvents:"none"}}>$</span>
                  <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runAnalysis()}
                    placeholder="0x… or vitalik.eth"
                    style={{width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"15px 14px 15px 30px",color:T.text,fontSize:15,fontFamily:"'IBM Plex Mono',monospace",outline:"none",WebkitAppearance:"none",boxSizing:"border-box"}}
                    onFocus={e=>{e.target.style.borderColor=T.cyan;e.target.style.boxShadow=`0 0 0 3px ${T.cyan}18`;}}
                    onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow="none";}}/>
                </div>
                <button onClick={()=>runAnalysis()} disabled={loading}
                  style={{width:"100%",padding:"15px",background:loading?T.s2:`${T.cyan}18`,border:`1px solid ${loading?T.border:T.cyan+"66"}`,borderRadius:8,color:loading?T.text3:T.cyan,fontSize:"13px",cursor:loading?"not-allowed":"pointer",letterSpacing:"3px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,boxSizing:"border-box"}}>
                  {loading?"SCANNING…":"ANALYZE →"}
                </button>
              </div>
            </div>

            {error&&<div style={{padding:"10px 14px",background:`${T.red}10`,border:`1px solid ${T.red}44`,borderRadius:6,color:T.red,fontSize:11,marginBottom:16,fontFamily:"'IBM Plex Mono',monospace",wordBreak:"break-word"}}>✕ {error}</div>}

            {loading&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:16}}>{[0,1,2,3].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.cyan,animation:`cw-bounce 1.2s ${i*0.1}s infinite`}}/>)}</div><div style={{fontSize:"10px",color:T.text3,letterSpacing:"3px",fontFamily:"'IBM Plex Mono',monospace"}}>{apiKey?"FETCHING LIVE DATA":"GENERATING DEMO"}</div></div>}

            {result&&!loading&&(
              <div style={{animation:"cw-fadeIn 0.4s ease"}}>
                {/* Verdict */}
                <div style={{background:T.s1,border:`1px solid ${R.br}`,borderRadius:10,padding:"18px",marginBottom:10,width:"100%",boxSizing:"border-box"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                        <div style={{fontSize:24,fontWeight:700,color:R.c,letterSpacing:"3px",lineHeight:1,fontFamily:"'IBM Plex Mono',monospace"}}>{rLabel(result.score)}</div>
                        <div style={{fontSize:20,fontWeight:700,color:R.c,opacity:0.3,lineHeight:1,fontFamily:"'IBM Plex Mono',monospace"}}>{result.score.toFixed(1)}</div>
                      </div>
                      <div style={{fontSize:"10px",color:T.text2,fontFamily:"'IBM Plex Mono',monospace",marginBottom:6}}>Riskier than <span style={{color:R.c,fontWeight:700}}>{pctile(result.score)}%</span> of wallets</div>
                      {ens&&<div style={{fontSize:12,color:T.cyan,fontFamily:"'IBM Plex Mono',monospace",marginBottom:6}}>{ens}</div>}
                      {isDemo&&<div style={{fontSize:"9px",color:T.amber,fontFamily:"'IBM Plex Mono',monospace",marginBottom:6}}>DEMO — add Etherscan API key for live data</div>}
                    </div>
                    <div style={{flexShrink:0}}><Gauge score={result.score} T={T}/></div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {result.flags.map(f=><span key={f} style={{fontSize:"9px",color:T.red,background:`${T.red}12`,border:`1px solid ${T.red}44`,padding:"3px 8px",borderRadius:20,fontFamily:"'IBM Plex Mono',monospace"}}>⚠ {f.replace(/_/g," ")}</span>)}
                    {!result.flags.length&&<span style={{fontSize:"9px",color:T.green,background:`${T.green}12`,border:`1px solid ${T.green}44`,padding:"3px 8px",borderRadius:20,fontFamily:"'IBM Plex Mono',monospace"}}>✓ NO FLAGS</span>}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                    {tags.map(tag=>{const info=tagInfo(tag,T);return<span key={tag} style={{fontSize:"9px",color:info.c,background:`${info.c}12`,border:`1px solid ${info.c}30`,padding:"3px 8px",borderRadius:20,fontFamily:"'IBM Plex Mono',monospace"}}>{info.label}</span>;})}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",paddingTop:10,borderTop:`1px solid ${T.border}`}}>
                    <button onClick={()=>{if(!inWatch)setWatchlist(p=>[...p,{address:result.address,score:result.score,ens}]);}} style={{padding:"6px 14px",background:inWatch?`${T.cyan}14`:T.s2,border:`1px solid ${inWatch?T.cyan+"44":T.border}`,borderRadius:20,color:inWatch?T.cyan:T.text2,fontSize:"9px",cursor:"pointer",letterSpacing:1,fontFamily:"'IBM Plex Mono',monospace"}}>{inWatch?"✓ WATCHING":"+ WATCHLIST"}</button>
                    <span style={{fontSize:"9px",color:T.text3,fontFamily:"'IBM Plex Mono',monospace",marginLeft:"auto",wordBreak:"break-all"}}>{shortAddr(result.address)} · {result.firstSeen}</span>
                  </div>
                </div>

                <AIAnalyst result={result} T={T}/>

                {/* Stats */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:10}}>
                  {[{l:"WALLET AGE",v:`${Math.floor(result.ageInDays/365)}y ${Math.floor((result.ageInDays%365)/30)}mo`},{l:"TRANSACTIONS",v:fmt(result.txCount)},{l:"PROTOCOLS",v:fmt(result.uniqueContracts)},{l:"ETH BALANCE",v:result.balance},{l:"NFT WASH",v:String(result.washCount||0),alert:result.washCount>0}].map(c=>(
                    <div key={c.l} style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:"12px 14px",boxSizing:"border-box"}}>
                      <div style={{fontSize:"8px",color:T.text3,letterSpacing:"1.5px",marginBottom:5,fontFamily:"'IBM Plex Mono',monospace"}}>{c.l}</div>
                      <div style={{fontSize:"16px",fontWeight:700,color:c.alert?T.red:T.text,fontFamily:"'IBM Plex Mono',monospace"}}>{c.v}</div>
                    </div>
                  ))}
                </div>

                <CategoryBar txList={result.txList} flagged={result.flagged} T={T}/>

                {/* Tabs */}
                <div style={{display:"flex",gap:2,background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:3,marginBottom:10,width:"100%"}}>
                  {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"8px 2px",background:tab===t?R.bg:"transparent",border:`1px solid ${tab===t?R.br:"transparent"}`,borderRadius:4,color:tab===t?R.c:T.text3,fontSize:"9px",cursor:"pointer",letterSpacing:"0px",fontFamily:"'IBM Plex Mono',monospace",transition:"all 0.2s"}}>{t}</button>)}
                </div>

                {tab==="OVERVIEW"&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
                    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:"16px",boxSizing:"border-box"}}>
                      <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:4,fontFamily:"'IBM Plex Mono',monospace"}}>RISK RADAR</div>
                      <RiskRadar factors={result.factors} score={result.score} T={T}/>
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {Object.entries(result.factors).map(([k,f])=>{const{c}=rPal(f.score,T);return(
                          <div key={k} style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:"8px",color:T.text2,width:110,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'IBM Plex Mono',monospace"}}>{k.toUpperCase()}</span>
                            <div style={{flex:1,height:"2px",background:T.s3,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${f.score*10}%`,background:c,transition:"width 1s ease"}}/></div>
                            <span style={{fontSize:"9px",color:c,width:18,textAlign:"right",fontFamily:"'IBM Plex Mono',monospace"}}>{f.score}</span>
                          </div>
                        );})}
                      </div>
                    </div>
                    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:"16px",boxSizing:"border-box"}}>
                      <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>RECENT TRANSACTIONS</div>
                      <div style={{display:"flex",flexDirection:"column",gap:3}}>
                        {result.txList.slice(0,12).map((tx,i)=>{const hr=HIGH_RISK[tx.to?.toLowerCase()],br=BRIDGES[tx.to?.toLowerCase()];const name=hr?.name||br||DEFI[tx.to?.toLowerCase()]||shortAddr(tx.to);const dc=hr?T.red:br?T.amber:T.green;return(
                          <div key={i} style={{padding:"7px 9px",borderRadius:4,background:T.s2,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>e.currentTarget.style.background=T.s3} onMouseLeave={e=>e.currentTarget.style.background=T.s2}>
                            <div style={{width:4,height:4,borderRadius:"50%",background:dc,flexShrink:0}}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                                <span style={{fontSize:"10px",color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'IBM Plex Mono',monospace"}}>{name}</span>
                                <span style={{fontSize:"10px",color:T.text,flexShrink:0,fontFamily:"'IBM Plex Mono',monospace"}}>{(parseFloat(tx.value||0)/1e18).toFixed(3)}</span>
                              </div>
                              <div style={{fontSize:"9px",color:T.text3,fontFamily:"'IBM Plex Mono',monospace"}}>{new Date(+tx.timeStamp*1000).toLocaleDateString()}</div>
                            </div>
                          </div>
                        );})}
                      </div>
                    </div>
                  </div>
                )}
                {tab==="NETWORK"&&(
                  <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,overflow:"hidden",width:"100%",boxSizing:"border-box"}}>
                    <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:"9px",color:T.text3,letterSpacing:2,fontFamily:"'IBM Plex Mono',monospace"}}>TRANSACTION NETWORK</span></div>
                    <NetworkGraph txList={result.txList} centerAddress={result.address} T={T} onNodeClick={a=>{setInput(a);window.scrollTo({top:0,behavior:"smooth"});runAnalysis(a);}}/>
                  </div>
                )}
                {tab==="TIMELINE"&&(
                  <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:"18px",boxSizing:"border-box"}}>
                    <Timeline txList={result.txList} flagged={result.flagged} T={T}/>
                  </div>
                )}
                {tab==="EVIDENCE"&&<Evidence flagged={result.flagged} factors={result.factors} T={T}/>}

                <div style={{marginTop:10,padding:"8px 0",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",fontSize:"9px",color:T.text3,flexWrap:"wrap",gap:4,fontFamily:"'IBM Plex Mono',monospace"}}>
                  <span>CHAINWATCH v4 · {apiKey?"LIVE":"DEMO"}</span>
                  <span>{new Date().toISOString().slice(0,10)}</span>
                </div>
              </div>
            )}

            {!result&&!loading&&!error&&(
              <div style={{animation:"cw-fadeIn 0.5s ease"}}>
                <div style={{textAlign:"center",padding:"32px 0 20px"}}>
                  <div style={{fontSize:48,opacity:0.06,marginBottom:10,lineHeight:1}}>⬡</div>
                  <div style={{fontSize:"12px",color:T.text3,letterSpacing:"2px",marginBottom:5,fontFamily:"'IBM Plex Mono',monospace"}}>ENTER ANY ETH ADDRESS OR ENS NAME</div>
                  <div style={{fontSize:"9px",color:T.text3,opacity:0.6,letterSpacing:"1px",fontFamily:"'IBM Plex Mono',monospace"}}>NO SIGN-UP · NO API KEY REQUIRED</div>
                </div>
                <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",textAlign:"center",marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>TRY AN EXAMPLE</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,maxWidth:700,margin:"0 auto"}}>
                  {EXAMPLES.map(ex=>(
                    <div key={ex.addr} style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:6,padding:"14px",cursor:"pointer",transition:"border-color 0.2s,transform 0.2s",boxSizing:"border-box"}}
                      onClick={()=>{setInput(ex.addr);runAnalysis(ex.addr);}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderH;e.currentTarget.style.transform="translateY(-2px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="none";}}>
                      <div style={{fontSize:11,color:T.cyan,fontWeight:700,marginBottom:4,fontFamily:"'IBM Plex Mono',monospace"}}>{ex.label}</div>
                      <div style={{fontSize:"9px",color:T.text2,fontFamily:"'IBM Plex Mono',monospace",marginBottom:6,lineHeight:1.5}}>{ex.note}</div>
                      <div style={{fontSize:"9px",color:T.text3,fontFamily:"'IBM Plex Mono',monospace"}}>{shortAddr(ex.addr)}</div>
                    </div>
                  ))}
                </div>
                {history.length>0&&(
                  <div style={{maxWidth:700,margin:"20px auto 0"}}>
                    <div style={{fontSize:"9px",color:T.text3,letterSpacing:"2px",marginBottom:8,fontFamily:"'IBM Plex Mono',monospace",textAlign:"center"}}>RECENT SEARCHES</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                      {history.map(h=>{const hp=rPal(h.score||5,T);return(
                        <div key={h.address} onClick={()=>{setInput(h.address);runAnalysis(h.address);}} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:T.s1,border:`1px solid ${T.border}`,borderRadius:40,cursor:"pointer"}}>
                          <div style={{width:5,height:5,borderRadius:"50%",background:hp.c}}/>
                          <span style={{fontSize:"9px",color:T.text,fontFamily:"'IBM Plex Mono',monospace"}}>{h.ens||shortAddr(h.address)}</span>
                          <span style={{fontSize:"9px",color:hp.c,fontFamily:"'IBM Plex Mono',monospace"}}>{h.score?.toFixed(1)}</span>
                        </div>
                      );})}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        @keyframes cw-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cw-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes cw-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes cw-blink{0%,100%{opacity:1}50%{opacity:0}}
        *{box-sizing:border-box;}
        html,body{max-width:100vw;overflow-x:hidden;margin:0;padding:0;}
        input::placeholder{color:${T.text3};opacity:1;}
        textarea::placeholder{color:${T.text3};}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${T.bg};}
        ::-webkit-scrollbar-thumb{background:${T.scrollThumb};border-radius:3px;}
        input,button,textarea{-webkit-tap-highlight-color:transparent;}
      `}</style>
    </div>
  );
}