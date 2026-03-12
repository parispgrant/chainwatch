import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const HIGH_RISK = {
  "0x722122df12d4e14e13ac3b6895a86e84145b6967": { name: "Tornado Cash 0.1ETH", cat: "MIXER" },
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936": { name: "Tornado Cash 1ETH",   cat: "MIXER" },
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": { name: "Tornado Cash 10ETH",  cat: "MIXER" },
  "0xa160cdab225685da1d56aa342ad8841c3b53f291": { name: "Tornado Cash 100ETH", cat: "MIXER" },
  "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3": { name: "Tornado Cash DAI",    cat: "MIXER" },
  "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144": { name: "Tornado Cash USDC",   cat: "MIXER" },
  "0x07687e702b410fa43f4cb4af7fa097918ffd2730": { name: "Tornado Cash USDT",   cat: "MIXER" },
  "0x7f367cc41522ce07553e823bf3be79a889debe1b": { name: "OFAC Sanctioned (Lazarus)", cat: "SANCTIONED" },
  "0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b": { name: "OFAC Sanctioned",     cat: "SANCTIONED" },
  "0x901bb9583b24d97e995513c6778dc6888ab6870e": { name: "OFAC Sanctioned",     cat: "SANCTIONED" },
};
const BRIDGES = {
  "0x3ee18b2214aff97000d974cf647e7c347e8fa585": { name: "Wormhole Bridge" },
  "0xa0c68c638235ee32657e8f720a23cec1bfc77c77": { name: "Polygon Bridge" },
  "0xce16f69375520ab01377ce7b88f5ba8c48f8d666": { name: "Stargate Finance" },
  "0x5a3810e82561e58ee51a02a9ec94dc5cc0f9b80e": { name: "Hop Protocol" },
  "0x8eb8a3b98659cce290402893d0123abb75e3ab28": { name: "Avalanche Bridge" },
  "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f": { name: "Arbitrum Bridge" },
};
const DEFI = {
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { name: "Uniswap V2" },
  "0xe592427a0aece92de3edee1f18e0157c05861564": { name: "Uniswap V3" },
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": { name: "SushiSwap" },
  "0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714": { name: "Curve 3Pool" },
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": { name: "Aave V2" },
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": { name: "Aave V3" },
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": { name: "Lido stETH" },
  "0x00000000219ab540356cbb839cbe05303d7705fa": { name: "ETH2 Deposit" },
  "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643": { name: "Compound cDAI" },
  "0x1111111254fb6c44bac0bed2854e76f90643097d": { name: "1inch V4" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const riskColor = s => s <= 3
  ? { c: "#22c55e", bg: "rgba(34,197,94,0.08)",  br: "rgba(34,197,94,0.25)" }
  : s <= 6
  ? { c: "#f59e0b", bg: "rgba(245,158,11,0.08)", br: "rgba(245,158,11,0.25)" }
  : { c: "#ef4444", bg: "rgba(239,68,68,0.08)",  br: "rgba(239,68,68,0.25)" };

const riskLabel = s => s <= 3 ? "LOW" : s <= 6 ? "MEDIUM" : "HIGH";

const knownLabel = addr => {
  const a = addr?.toLowerCase();
  return HIGH_RISK[a]?.name || BRIDGES[a]?.name || DEFI[a]?.name || null;
};

const nodeCategory = addr => {
  const a = addr?.toLowerCase();
  if (HIGH_RISK[a]) return "high";
  if (BRIDGES[a])   return "bridge";
  if (DEFI[a])      return "defi";
  return "unknown";
};

// ─── RISK ENGINE ─────────────────────────────────────────────────────────────

function computeRisk(txList, address) {
  if (!txList?.length) return { score: 5, factors: {}, flags: [], flagged: [], byMonth: {}, firstTs: Date.now()/1000, ageInDays: 0, uniqueContracts: 0 };

  const flagged = [];
  const addr = address.toLowerCase();
  const ts = txList.map(t => +t.timeStamp).filter(Boolean).sort((a,b)=>a-b);
  const firstTs  = ts[0] || Date.now()/1000;
  const ageInDays = (Date.now()/1000 - firstTs) / 86400;

  // Mixer
  const mixerTx = txList.filter(tx => HIGH_RISK[tx.to?.toLowerCase()]?.cat === "MIXER");
  const mixerScore = mixerTx.length === 0 ? 1 : mixerTx.length === 1 ? 8 : 10;
  mixerTx.forEach(tx => flagged.push({...tx, flag:"MIXER_INTERACTION", sev:"critical"}));

  // Sanctions
  const sancTx = txList.filter(tx => HIGH_RISK[tx.to?.toLowerCase()]?.cat === "SANCTIONED");
  const sancScore = sancTx.length > 0 ? 10 : 1;
  sancTx.forEach(tx => flagged.push({...tx, flag:"SANCTIONS_HIT", sev:"critical"}));

  // Bridges
  const bridgeTx = txList.filter(tx => BRIDGES[tx.to?.toLowerCase()]);
  const bridgeScore = bridgeTx.length === 0 ? 1 : bridgeTx.length <= 3 ? 3 : bridgeTx.length <= 8 ? 5 : 7;
  bridgeTx.slice(0,3).forEach(tx => flagged.push({...tx, flag:"BRIDGE_USAGE", sev:"medium"}));

  // Velocity spike
  const byMonth = {};
  txList.forEach(tx => {
    const m = new Date(+tx.timeStamp*1000).toISOString().slice(0,7);
    byMonth[m] = (byMonth[m]||0)+1;
  });
  const counts = Object.values(byMonth);
  const avg = counts.reduce((a,b)=>a+b,0) / Math.max(counts.length,1);
  const max = Math.max(...counts, 0);
  const velScore = max > avg*4 ? 8 : max > avg*2.5 ? 5 : 2;

  // Age
  const ageScore = ageInDays > 1095 ? 1 : ageInDays > 365 ? 3 : ageInDays > 180 ? 5 : ageInDays > 90 ? 7 : 9;

  // High-value new wallet
  const bigTx = txList.filter(tx => parseFloat(tx.value||0)/1e18 > 10);
  const hvScore = (ageInDays < 180 && bigTx.length > 0) ? 8 : bigTx.length > 5 ? 4 : 2;

  // Contract diversity
  const contracts = new Set(txList.map(tx=>tx.to?.toLowerCase()).filter(Boolean));
  contracts.delete(addr);
  const uniqueContracts = contracts.size;
  const divScore = uniqueContracts > 100 ? 2 : uniqueContracts > 30 ? 3 : uniqueContracts > 10 ? 4 : 6;

  const factors = {
    walletAge:          { score: ageScore,    w: 0.15, label: ageInDays>1095?"Established (3y+)":ageInDays>365?"Mature (1-3y)":"New wallet",              value:`${Math.floor(ageInDays)} days` },
    mixerInteraction:   { score: mixerScore,  w: 0.25, label: mixerTx.length===0?"None detected":`${mixerTx.length} hit${mixerTx.length>1?"s":""}`,        value:`${mixerTx.length} txns` },
    sanctionedExposure: { score: sancScore,   w: 0.25, label: sancTx.length>0?"⚠ OFAC ADJACENT":"None found",                                             value:`${sancTx.length} hits` },
    bridgeActivity:     { score: bridgeScore, w: 0.10, label: bridgeTx.length===0?"None":`${bridgeTx.length} bridge events`,                               value:`${bridgeTx.length} events` },
    velocitySpike:      { score: velScore,    w: 0.10, label: velScore>5?"Spike detected":"Normal pattern",                                                value:`${Math.round(avg)} avg/mo` },
    highValueNewWallet: { score: hvScore,     w: 0.10, label: hvScore>6?"Flagged":"Normal",                                                                value:`${bigTx.length} large txns` },
    contractDiversity:  { score: divScore,    w: 0.05, label: `${uniqueContracts} unique protocols`,                                                       value:`${uniqueContracts} contracts` },
  };

  const weighted = Object.values(factors).reduce((s,f)=>s+f.score*f.w,0);
  const score = parseFloat(Math.min(10, Math.max(1, weighted)).toFixed(1));

  const flags = [];
  if (mixerTx.length)    flags.push("MIXER_INTERACTION");
  if (sancTx.length)     flags.push("SANCTIONS_HIT");
  if (velScore>5)        flags.push("VELOCITY_SPIKE");
  if (hvScore>6)         flags.push("HIGH_VALUE_NEW_WALLET");
  if (bridgeTx.length>5) flags.push("EXCESSIVE_BRIDGING");

  return { score, factors, flags, flagged: flagged.slice(0,30), byMonth, firstTs, ageInDays, uniqueContracts };
}

// ─── DEMO DATA GENERATOR (deterministic by address) ──────────────────────────

function makeDemoData(address) {
  const seed = parseInt(address.replace("0x","").slice(0,8), 16) || 12345;
  const rng  = n => Math.abs(Math.sin(seed * (n+1) * 9301 + 49297) * 233280) % 1;
  const ageD = Math.floor(180 + rng(1)*1400);
  const now  = Date.now()/1000;
  const first= now - ageD*86400;
  const n    = Math.floor(30 + rng(2)*400);
  const hasMixer   = rng(3) > 0.75;
  const hasSanction= rng(4) > 0.92;
  const bridgeCount= Math.floor(rng(5)*8);
  const knownAddrs = Object.keys(DEFI);
  const bridgeAddrs= Object.keys(BRIDGES);

  const txList = Array.from({length: Math.min(n,200)}, (_,i) => {
    const t = first + rng(i*7+10)*ageD*86400;
    let to;
    if (hasMixer && i===4)        to = "0x722122df12d4e14e13ac3b6895a86e84145b6967";
    else if (hasSanction && i===9) to = "0x7f367cc41522ce07553e823bf3be79a889debe1b";
    else if (i < bridgeCount)     to = bridgeAddrs[Math.floor(rng(i)*bridgeAddrs.length)];
    else                          to = knownAddrs[Math.floor(rng(i*3+1)*knownAddrs.length)];
    return {
      hash: "0x" + Array.from({length:64},(_,j)=>Math.floor(rng(i*100+j)*16).toString(16)).join(""),
      to, from: address.toLowerCase(),
      value: String(Math.floor(rng(i*5+2)*3e18)),
      timeStamp: String(Math.floor(t)),
      isError:"0",
    };
  });
  const balance = String(Math.floor(rng(99)*8e18));
  return { txList, balance, txCount: n };
}

// ─── NETWORK GRAPH ────────────────────────────────────────────────────────────

function NetworkGraph({ txList, centerAddress, onNodeClick }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    if (!txList?.length || !svgRef.current) return;
    const center = centerAddress.toLowerCase();

    // Build interaction map
    const interactions = {};
    txList.forEach(tx => {
      const t = tx.to?.toLowerCase();
      if (!t || t === center) return;
      if (!interactions[t]) interactions[t] = { count:0, vol:0 };
      interactions[t].count++;
      interactions[t].vol += parseFloat(tx.value||0)/1e18;
    });
    const top = Object.entries(interactions).sort((a,b)=>b[1].count-a[1].count).slice(0,28);

    const COL = { center:"#60a5fa", high:"#ef4444", bridge:"#f59e0b", defi:"#22c55e", unknown:"#374151" };
    const nodes = [
      { id: center, label:"TARGET", cat:"center", count: txList.length, isCenter:true },
      ...top.map(([addr,d]) => ({
        id: addr, label: knownLabel(addr)||addr.slice(0,8)+"…",
        cat: nodeCategory(addr), count: d.count, vol: d.vol,
      }))
    ];
    const links = top.map(([addr,d]) => ({ source: center, target: addr, count: d.count }));

    const W = svgRef.current.clientWidth || 720;
    const H = 500;
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current).attr("viewBox",`0 0 ${W} ${H}`).attr("width","100%").attr("height",H);
    svg.append("rect").attr("width",W).attr("height",H).attr("fill","#0b0d14");

    // Glow defs
    const defs = svg.append("defs");
    Object.entries(COL).forEach(([k,c]) => {
      const f = defs.append("filter").attr("id",`glow-${k}`).attr("x","-50%").attr("y","-50%").attr("width","200%").attr("height","200%");
      f.append("feGaussianBlur").attr("in","SourceGraphic").attr("stdDeviation", k==="high"?5:k==="center"?4:2).attr("result","blur");
      const m = f.append("feMerge"); m.append("feMergeNode").attr("in","blur"); m.append("feMergeNode").attr("in","SourceGraphic");
    });

    if (simRef.current) simRef.current.stop();
    const sim = d3.forceSimulation(nodes)
      .force("link",  d3.forceLink(links).id(d=>d.id).distance(110).strength(0.25))
      .force("charge",d3.forceManyBody().strength(-220))
      .force("center",d3.forceCenter(W/2, H/2))
      .force("collide",d3.forceCollide().radius(d=>d.isCenter?38:22));
    simRef.current = sim;

    const g = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.4,3]).on("zoom",e=>g.attr("transform",e.transform)));

    const linkEl = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", d => {
        const tgt = nodes.find(n=>n.id===(typeof d.target==="object"?d.target.id:d.target));
        return tgt ? COL[tgt.cat]+"55" : "#1e2433";
      })
      .attr("stroke-width", d => Math.min(Math.sqrt(d.count)*0.8+0.5, 4))
      .attr("stroke-opacity", 0.7);

    const nodeG = g.append("g").selectAll("g").data(nodes).join("g")
      .attr("cursor","pointer")
      .on("click",(_,d) => { if (!d.isCenter && onNodeClick) onNodeClick(d.id); })
      .call(d3.drag()
        .on("start",(e,d)=>{ if (!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on("drag", (e,d)=>{ d.fx=e.x; d.fy=e.y; })
        .on("end",  (e,d)=>{ if (!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; })
      );

    nodeG.append("circle")
      .attr("r", d => d.isCenter ? 26 : Math.max(8, Math.min(20, 5+Math.sqrt(d.count)*1.8)))
      .attr("fill", d => COL[d.cat]+"18")
      .attr("stroke", d => COL[d.cat])
      .attr("stroke-width", d => d.isCenter ? 2 : 1.5)
      .attr("filter", d => `url(#glow-${d.cat})`);

    nodeG.append("text")
      .attr("text-anchor","middle")
      .attr("dy", d => d.isCenter ? "0.35em" : "-1.5em")
      .attr("fill", d => COL[d.cat])
      .attr("font-size", d => d.isCenter ? "9px" : "8px")
      .attr("font-family","'JetBrains Mono',monospace")
      .attr("pointer-events","none")
      .text(d => d.isCenter ? "TARGET" : d.label.slice(0,14));

    nodeG.filter(d=>!d.isCenter).append("text")
      .attr("text-anchor","middle").attr("dy","0.35em")
      .attr("fill","#6b7280").attr("font-size","7px")
      .attr("font-family","'JetBrains Mono',monospace")
      .attr("pointer-events","none")
      .text(d=>d.count);

    sim.on("tick",()=>{
      linkEl.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
      nodeG.attr("transform",d=>`translate(${d.x},${d.y})`);
    });
    return ()=>{ if(simRef.current) simRef.current.stop(); };
  },[txList,centerAddress]);

  return (
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",top:12,right:12,display:"flex",gap:10,zIndex:10}}>
        {[["center","#60a5fa","Target"],["defi","#22c55e","DeFi"],["bridge","#f59e0b","Bridge"],["high","#ef4444","High Risk"],["unknown","#374151","Unknown"]].map(([k,c,l])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:"9px",color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`}}/>{l}
          </div>
        ))}
      </div>
      <svg ref={svgRef} style={{width:"100%",display:"block",borderRadius:4}}/>
      <div style={{position:"absolute",bottom:10,left:12,fontSize:"9px",color:"#1e2433",fontFamily:"'JetBrains Mono',monospace"}}>
        DRAG · SCROLL TO ZOOM · CLICK NODE TO ANALYZE
      </div>
    </div>
  );
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

function Timeline({ txList, flagged }) {
  const data = useMemo(() => {
    if (!txList?.length) return [];
    const flagHashes = new Set((flagged||[]).map(t=>t.hash));
    const m = {};
    txList.forEach(tx => {
      const d  = new Date(+tx.timeStamp*1000);
      const k  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!m[k]) m[k] = { month:k, txns:0, vol:0, flags:0 };
      m[k].txns++;
      m[k].vol += parseFloat(tx.value||0)/1e18;
      if (flagHashes.has(tx.hash)) m[k].flags++;
    });
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-18);
  },[txList,flagged]);

  const TT = ({ active, payload, label }) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{background:"#0f1219",border:"1px solid #1e2433",padding:"10px 14px",borderRadius:4,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
        <div style={{color:"#9ca3af",marginBottom:6}}>{label}</div>
        {payload.map(p=>(
          <div key={p.name} style={{color:p.color||"#d1d5db"}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(2):p.value}</div>
        ))}
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:28}}>
      <div>
        <div style={{fontSize:"9px",color:"#374151",letterSpacing:"2px",marginBottom:12}}>TRANSACTION FREQUENCY — LAST 18 MONTHS  <span style={{color:"#ef444444"}}>(RED = flagged activity)</span></div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={14}>
            <XAxis dataKey="month" tick={{fill:"#2d3748",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"#2d3748",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="txns" name="Transactions" radius={[2,2,0,0]}>
              {data.map((e,i)=><Cell key={i} fill={e.flags>0?"#ef4444":"#22c55e"} fillOpacity={e.flags>0?0.75:0.35}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div style={{fontSize:"9px",color:"#374151",letterSpacing:"2px",marginBottom:12}}>ETH VOLUME — LAST 18 MONTHS</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{fill:"#2d3748",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"#2d3748",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
            <Tooltip content={<TT/>}/>
            <Area type="monotone" dataKey="vol" name="ETH Volume" stroke="#60a5fa" fill="url(#vg)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── EVIDENCE PANEL ───────────────────────────────────────────────────────────

function Evidence({ flagged, factors }) {
  const sevCol = { critical:"#ef4444", medium:"#f59e0b", low:"#22c55e" };
  const grouped = useMemo(()=>{
    if (!flagged) return {};
    return flagged.reduce((acc,tx)=>{ (acc[tx.flag]??=[]).push(tx); return acc; },{});
  },[flagged]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Methodology */}
      <div style={{background:"#0f1219",border:"1px solid #1e2433",borderRadius:4,padding:"20px 22px"}}>
        <div style={{fontSize:"9px",color:"#374151",letterSpacing:"2px",marginBottom:16}}>SCORING METHODOLOGY — WEIGHTED COMPOSITE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {Object.entries(factors||{}).map(([k,f])=>{
            const {c} = riskColor(f.score);
            return (
              <div key={k} style={{padding:"12px 14px",background:"#0b0d14",border:"1px solid #141822",borderRadius:3}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:"10px",color:"#9ca3af",fontFamily:"'JetBrains Mono',monospace"}}>{k.replace(/([A-Z])/g," $1").toUpperCase()}</span>
                  <span style={{fontSize:"10px",color:c,fontFamily:"'JetBrains Mono',monospace"}}>{f.score}/10 · w={f.w}</span>
                </div>
                <div style={{fontSize:"11px",color:"#d1d5db",fontFamily:"'JetBrains Mono',monospace"}}>{f.label}</div>
                <div style={{fontSize:"10px",color:"#374151",fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>raw: {f.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flagged txns */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{textAlign:"center",padding:"36px",color:"#22c55e",fontSize:"11px",fontFamily:"'JetBrains Mono',monospace",border:"1px solid rgba(34,197,94,0.15)",borderRadius:4,background:"rgba(34,197,94,0.04)"}}>
          ✓ NO FLAGGED TRANSACTIONS DETECTED IN SCANNED HISTORY
        </div>
      ) : Object.entries(grouped).map(([flag,txns])=>(
        <div key={flag} style={{background:"#0f1219",border:"1px solid #1e2433",borderRadius:4,overflow:"hidden"}}>
          <div style={{padding:"10px 16px",background:"rgba(239,68,68,0.04)",borderBottom:"1px solid #1e2433",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:"11px",color:"#ef4444",fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>⚠ {flag.replace(/_/g," ")}</span>
            <span style={{fontSize:"10px",color:"#374151",fontFamily:"'JetBrains Mono',monospace"}}>{txns.length} TRANSACTION{txns.length>1?"S":""}</span>
          </div>
          {txns.slice(0,6).map((tx,i)=>(
            <div key={i} style={{padding:"9px 16px",borderBottom:i<txns.length-1?"1px solid #141822":"none",display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:sevCol[tx.sev]||"#f59e0b",flexShrink:0,boxShadow:`0 0 4px ${sevCol[tx.sev]||"#f59e0b"}`}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:"10px",color:"#d1d5db",fontFamily:"'JetBrains Mono',monospace"}}>{tx.hash?.slice(0,22)}…</span>
                  <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:"9px",color:"#374151",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none",letterSpacing:0.5}}>
                    ETHERSCAN ↗
                  </a>
                </div>
                <div style={{fontSize:"10px",color:"#4b5563",fontFamily:"'JetBrains Mono',monospace"}}>
                  → {knownLabel(tx.to)||tx.to?.slice(0,18)+"…"} · {(parseFloat(tx.value||0)/1e18).toFixed(4)} ETH · {new Date(+tx.timeStamp*1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── GAUGE ────────────────────────────────────────────────────────────────────

function Gauge({ score }) {
  const {c} = riskColor(score);
  const [pct, setPct] = useState(0);
  useEffect(()=>{ setTimeout(()=>setPct(score/10), 80); },[score]);
  const r = 50, circ = Math.PI*r, offset = circ*(1-pct);
  return (
    <svg width="120" height="76" viewBox="0 0 120 80">
      <path d={`M 10 62 A ${r} ${r} 0 0 1 110 62`} fill="none" stroke="#1a1f2e" strokeWidth="8" strokeLinecap="round"/>
      <path d={`M 10 62 A ${r} ${r} 0 0 1 110 62`} fill="none" stroke={c} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{transition:"stroke-dashoffset 1.3s cubic-bezier(0.34,1.56,0.64,1)",filter:`drop-shadow(0 0 5px ${c})`}}/>
      <text x="60" y="54" textAnchor="middle" fill={c} fontSize="20" fontWeight="700" fontFamily="'JetBrains Mono',monospace"
        style={{filter:`drop-shadow(0 0 8px ${c})`}}>{score.toFixed(1)}</text>
      <text x="60" y="68" textAnchor="middle" fill="#374151" fontSize="8" fontFamily="'JetBrains Mono',monospace" letterSpacing="2">/ 10</text>
    </svg>
  );
}

function MetricBar({ label, value, score, description }) {
  const {c} = riskColor(score);
  const [w, setW] = useState(0);
  useEffect(()=>{ setTimeout(()=>setW(score*10), 120); },[score]);
  return (
    <div style={{marginBottom:13}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
        <span style={{fontSize:"10px",color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:"10px",color:"#4b5563",fontFamily:"'JetBrains Mono',monospace"}}>{value}</span>
          <span style={{fontSize:"9px",color:c,background:`${c}18`,padding:"2px 6px",borderRadius:3,fontFamily:"'JetBrains Mono',monospace"}}>{description}</span>
        </div>
      </div>
      <div style={{height:"2px",background:"#1a1f2e",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${w}%`,background:c,borderRadius:2,transition:"width 0.9s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:`0 0 5px ${c}`}}/>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const TABS = ["OVERVIEW","NETWORK GRAPH","ACTIVITY TIMELINE","EVIDENCE"];

export default function App() {
  const [input,    setInput]    = useState("");
  const [apiKey,   setApiKey]   = useState("");
  const [showKey,  setShowKey]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);
  const [tab,      setTab]      = useState("OVERVIEW");
  const [isDemo,   setIsDemo]   = useState(false);

  async function analyze() {
    const addr = input.trim();
    if (!addr) return;
    setLoading(true); setError(null); setResult(null); setTab("OVERVIEW");
    try {
      let txList, balance, txCount;
      if (apiKey.trim()) {
        const base = "https://api.etherscan.io/api";
        const [txR, balR] = await Promise.all([
          fetch(`${base}?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&page=1&offset=500&sort=asc&apikey=${apiKey.trim()}`).then(r=>r.json()),
          fetch(`${base}?module=account&action=balance&address=${addr}&tag=latest&apikey=${apiKey.trim()}`).then(r=>r.json()),
        ]);
        if (txR.status==="0" && txR.message!=="No transactions found") throw new Error(txR.result||"Etherscan API error — check your key");
        txList  = txR.result||[];
        balance = balR.result||"0";
        txCount = txList.length;
        setIsDemo(false);
      } else {
        const d = makeDemoData(addr);
        txList = d.txList; balance = d.balance; txCount = d.txCount;
        setIsDemo(true);
      }
      const risk = computeRisk(txList, addr);
      setResult({
        address:   addr,
        balance:   (parseFloat(balance)/1e18).toFixed(4),
        txCount,
        txList,
        firstSeen: new Date(risk.firstTs*1000).toLocaleDateString(),
        ...risk,
      });
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  }

  const R = result ? riskColor(result.score) : null;

  return (
    <div style={{minHeight:"100vh",background:"#080a10",color:"#e2e8f0",fontFamily:"'JetBrains Mono',monospace",
      backgroundImage:"radial-gradient(ellipse at 15% 40%, rgba(20,30,60,0.5) 0%, transparent 55%), radial-gradient(ellipse at 85% 10%, rgba(15,25,50,0.4) 0%, transparent 50%)"}}>
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.013) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.013) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none",zIndex:0}}/>

      {/* ── Header ── */}
      <div style={{borderBottom:"1px solid #161b27",padding:"0 32px",background:"rgba(8,10,16,0.96)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1320,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 10px #22c55e",animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:13,fontWeight:700,letterSpacing:"3px",color:"#f1f5f9"}}>CHAINWATCH</span>
            <span style={{fontSize:10,color:"#1e2433",letterSpacing:"2px"}}>//&nbsp;COMPLIANCE INTELLIGENCE&nbsp;v3</span>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            {isDemo && <div style={{padding:"3px 10px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:3,fontSize:"9px",color:"#f59e0b",letterSpacing:1}}>DEMO MODE</div>}
            <button onClick={()=>setShowKey(!showKey)}
              style={{padding:"4px 12px",background:apiKey?"rgba(34,197,94,0.08)":"#0c0e15",border:`1px solid ${apiKey?"rgba(34,197,94,0.3)":"#1e2433"}`,borderRadius:3,color:apiKey?"#22c55e":"#374151",fontSize:"9px",cursor:"pointer",letterSpacing:1,fontFamily:"'JetBrains Mono',monospace"}}>
              {apiKey?"✓ API KEY SET":"ADD ETHERSCAN KEY"}
            </button>
          </div>
        </div>
      </div>

      {/* ── API Key bar ── */}
      {showKey && (
        <div style={{background:"#0c0e15",borderBottom:"1px solid #161b27",padding:"10px 32px"}}>
          <div style={{maxWidth:1320,margin:"0 auto",display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:"9px",color:"#374151",letterSpacing:1,whiteSpace:"nowrap"}}>ETHERSCAN KEY</span>
            <input value={apiKey} onChange={e=>setApiKey(e.target.value)}
              placeholder="Get free key at etherscan.io/apis — leave blank for demo mode with generated data"
              style={{flex:1,background:"#080a10",border:"1px solid #1e2433",borderRadius:4,padding:"7px 12px",color:"#f1f5f9",fontSize:11,fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
            <button onClick={()=>setShowKey(false)}
              style={{padding:"7px 16px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:4,color:"#22c55e",fontSize:"10px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>
              SAVE
            </button>
          </div>
        </div>
      )}

      <div style={{maxWidth:1320,margin:"0 auto",padding:"32px 32px",position:"relative",zIndex:1}}>
        {/* ── Search ── */}
        <div style={{marginBottom:32}}>
          <div style={{fontSize:"9px",color:"#1e2433",letterSpacing:"3px",marginBottom:8}}>WALLET RISK ANALYSIS TERMINAL</div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,position:"relative"}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#22c55e",fontSize:13}}>$</span>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()}
                placeholder="Enter Ethereum address (0x…) — try any address in demo mode"
                style={{width:"100%",background:"#0c0e15",border:"1px solid #161b27",borderRadius:4,padding:"13px 14px 13px 30px",color:"#f1f5f9",fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor="#22c55e"}
                onBlur={e=>e.target.style.borderColor="#161b27"}/>
            </div>
            <button onClick={analyze} disabled={loading}
              style={{padding:"13px 30px",background:loading?"#0c0e15":"rgba(34,197,94,0.08)",border:`1px solid ${loading?"#161b27":"rgba(34,197,94,0.4)"}`,borderRadius:4,color:loading?"#374151":"#22c55e",fontSize:"11px",cursor:loading?"not-allowed":"pointer",letterSpacing:"2px",fontFamily:"'JetBrains Mono',monospace",transition:"all 0.2s"}}>
              {loading?"SCANNING…":"ANALYZE →"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{padding:"12px 16px",background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:4,color:"#ef4444",fontSize:11,marginBottom:24,fontFamily:"'JetBrains Mono',monospace"}}>
            ✕ {error}
          </div>
        )}

        {loading && (
          <div style={{textAlign:"center",padding:"80px 0"}}>
            <div style={{width:34,height:34,border:"2px solid #1a1f2e",borderTop:"2px solid #22c55e",borderRadius:"50%",margin:"0 auto 18px",animation:"spin 0.7s linear infinite"}}/>
            <div style={{fontSize:"10px",color:"#1e2433",letterSpacing:"3px"}}>{apiKey?"FETCHING LIVE ETHERSCAN DATA":"GENERATING DETERMINISTIC ANALYSIS"}</div>
          </div>
        )}

        {result && !loading && (
          <div style={{animation:"fadeIn 0.35s ease"}}>
            {/* Identity */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:11,color:"#4b5563",wordBreak:"break-all",marginBottom:8,letterSpacing:"0.5px"}}>{result.address}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {result.flags.map(f=>(
                    <span key={f} style={{fontSize:"10px",color:"#ef4444",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",padding:"3px 8px",borderRadius:3,letterSpacing:"0.5px"}}>⚠ {f.replace(/_/g," ")}</span>
                  ))}
                  {!result.flags.length && <span style={{fontSize:"10px",color:"#22c55e",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",padding:"3px 8px",borderRadius:3}}>✓ NO ACTIVE FLAGS</span>}
                  {isDemo && <span style={{fontSize:"10px",color:"#f59e0b",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",padding:"3px 8px",borderRadius:3}}>DEMO — add Etherscan key for live data</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={{padding:"7px 14px",background:"#0c0e15",border:"1px solid #161b27",borderRadius:4,color:"#374151",fontSize:"9px",cursor:"pointer",letterSpacing:1,fontFamily:"'JetBrains Mono',monospace"}}>EXPORT REPORT</button>
                <button style={{padding:"7px 14px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:4,color:"#ef4444",fontSize:"9px",cursor:"pointer",letterSpacing:1,fontFamily:"'JetBrains Mono',monospace"}}>FLAG FOR REVIEW</button>
              </div>
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1.7fr",gap:10,marginBottom:10}}>
              {[
                {l:"WALLET AGE",     v:`${Math.floor(result.ageInDays/365)}y ${Math.floor((result.ageInDays%365)/30)}mo`, s:`First seen ${result.firstSeen}`},
                {l:"TRANSACTIONS",   v:result.txCount.toLocaleString(),                                                    s:apiKey?"On-chain verified":"Estimated"},
                {l:"CONTRACTS",      v:result.uniqueContracts.toLocaleString(),                                            s:"Unique protocols"},
                {l:"ETH BALANCE",    v:`${result.balance} ETH`,                                                            s:"Current balance"},
              ].map(c=>(
                <div key={c.l} style={{background:"#0c0e15",border:"1px solid #161b27",borderRadius:4,padding:"16px 18px"}}>
                  <div style={{fontSize:"9px",color:"#1e2433",letterSpacing:"2px",marginBottom:8}}>{c.l}</div>
                  <div style={{fontSize:"20px",fontWeight:700,color:"#f1f5f9",marginBottom:3}}>{c.v}</div>
                  <div style={{fontSize:"10px",color:"#374151"}}>{c.s}</div>
                </div>
              ))}
              <div style={{background:"#0c0e15",border:`1px solid ${R.br}`,borderRadius:4,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,boxShadow:`0 0 28px ${R.bg}`}}>
                <Gauge score={result.score}/>
                <div>
                  <div style={{fontSize:"9px",color:"#1e2433",letterSpacing:"2px",marginBottom:6}}>COMPOSITE RISK</div>
                  <div style={{fontSize:"24px",fontWeight:700,color:R.c,letterSpacing:"3px",textShadow:`0 0 14px ${R.c}`}}>{riskLabel(result.score)}</div>
                  <div style={{fontSize:"10px",color:"#374151",marginTop:4}}>{result.flags.length} active flag{result.flags.length!==1?"s":""} · {result.flagged.length} flagged txns</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:"flex",borderBottom:"1px solid #161b27",marginBottom:14}}>
              {TABS.map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{padding:"9px 18px",background:"none",border:"none",borderBottom:`2px solid ${tab===t?R.c:"transparent"}`,color:tab===t?R.c:"#2d3748",fontSize:"9px",cursor:"pointer",letterSpacing:"1.5px",fontFamily:"'JetBrains Mono',monospace",transition:"all 0.2s",marginBottom:-1}}>
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab==="OVERVIEW" && (
              <div style={{display:"grid",gridTemplateColumns:"1.35fr 1fr",gap:12}}>
                <div style={{background:"#0c0e15",border:"1px solid #161b27",borderRadius:4,padding:"20px 22px"}}>
                  <div style={{fontSize:"9px",color:"#1e2433",letterSpacing:"2px",marginBottom:18}}>RISK FACTOR BREAKDOWN — WEIGHTED COMPOSITE</div>
                  {Object.entries(result.factors).map(([k,f])=>(
                    <MetricBar key={k} label={k.replace(/([A-Z])/g," $1").toUpperCase()} value={f.value} score={f.score} description={f.label}/>
                  ))}
                </div>
                <div style={{background:"#0c0e15",border:"1px solid #161b27",borderRadius:4,padding:"20px 22px"}}>
                  <div style={{fontSize:"9px",color:"#1e2433",letterSpacing:"2px",marginBottom:14}}>RECENT TRANSACTIONS</div>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}>
                    {result.txList.slice(0,9).map((tx,i)=>{
                      const hr = HIGH_RISK[tx.to?.toLowerCase()];
                      const br = BRIDGES[tx.to?.toLowerCase()];
                      const prot = hr?.name||br?.name||DEFI[tx.to?.toLowerCase()]?.name||tx.to?.slice(0,10)+"…";
                      const dc = hr?"#ef4444":br?"#f59e0b":"#22c55e44";
                      return (
                        <div key={i} style={{padding:"8px 10px",borderRadius:3,background:"#080a10",border:"1px solid #111520",display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:5,height:5,borderRadius:"50%",background:dc,flexShrink:0,boxShadow:`0 0 4px ${dc}`}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between"}}>
                              <span style={{fontSize:"10px",color:"#d1d5db"}}>{prot}</span>
                              <span style={{fontSize:"10px",color:"#f1f5f9"}}>{(parseFloat(tx.value||0)/1e18).toFixed(3)} ETH</span>
                            </div>
                            <div style={{fontSize:"9px",color:"#2d3748"}}>{tx.hash?.slice(0,16)}… · {new Date(+tx.timeStamp*1000).toLocaleDateString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab==="NETWORK GRAPH" && (
              <div style={{background:"#0c0e15",border:"1px solid #161b27",borderRadius:4,overflow:"hidden"}}>
                <div style={{padding:"14px 18px",borderBottom:"1px solid #161b27",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:"9px",color:"#1e2433",letterSpacing:2}}>INTERACTION NETWORK — FORCE-DIRECTED GRAPH</span>
                  <span style={{fontSize:"9px",color:"#111520"}}>TOP 28 COUNTERPARTIES BY FREQUENCY</span>
                </div>
                <NetworkGraph txList={result.txList} centerAddress={result.address} onNodeClick={addr=>{setInput(addr); window.scrollTo({top:0,behavior:"smooth"});}}/>
              </div>
            )}

            {tab==="ACTIVITY TIMELINE" && (
              <div style={{background:"#0c0e15",border:"1px solid #161b27",borderRadius:4,padding:"22px 24px"}}>
                <Timeline txList={result.txList} flagged={result.flagged}/>
              </div>
            )}

            {tab==="EVIDENCE" && (
              <Evidence flagged={result.flagged} factors={result.factors}/>
            )}

            <div style={{marginTop:14,padding:"8px 0",borderTop:"1px solid #0c0e15",display:"flex",justifyContent:"space-between",fontSize:"9px",color:"#1a1f2e"}}>
              <span>CHAINWATCH v3.0 · {apiKey?"LIVE ETHERSCAN DATA":"DEMO MODE"} · ENGINE: WEIGHTED COMPOSITE v2</span>
              <span>{new Date().toISOString().replace("T"," ").slice(0,19)} UTC</span>
            </div>
          </div>
        )}

        {!result&&!loading&&!error&&(
          <div style={{textAlign:"center",padding:"80px 0"}}>
            <div style={{fontSize:52,opacity:0.05,marginBottom:14}}>⬡</div>
            <div style={{fontSize:"10px",color:"#1a1f2e",letterSpacing:"3px"}}>ENTER ANY ETHEREUM ADDRESS TO BEGIN — NO API KEY REQUIRED</div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        *{box-sizing:border-box}
        input::placeholder{color:#1a1f2e}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#080a10}
        ::-webkit-scrollbar-thumb{background:#1e2433;border-radius:3px}
      `}</style>
    </div>
  );
}
