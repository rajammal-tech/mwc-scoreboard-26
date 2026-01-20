import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, onDisconnect, serverTimestamp } from "firebase/database";

// --- MWC-Open-Stable-Build 7.4 (BRANDING & LOGIC RESTORED) ----
const firebaseConfig = {
  apiKey: "AIzaSyCwoLIBAh4NMlvp-r8avXucscjVA10ydw0",
  authDomain: "mwc-open---8th-edition.firebaseapp.com",
  databaseURL: https://mwc-open---8th-edition-default-rtdb.firebaseio.com,
  projectId: "mwc-open---8th-edition",
  storageBucket: "mwc-open---8th-edition.firebasestorage.app",
  messagingSenderId: "1056583710011",
  appId: "1:1056583710011:web:998e4f73a657ef69d3b31e",
};

const SPONSORS = [
  { label: "TENNIS BALLS", name: "???" },
  { label: "REFRESHMENTS", name: "???" },
  { label: "VOLUNTARY CONTRIBUTION", name: "???" },
];

const COMMUNITY_TEAM = { 
  chairUmpire: "Raphael Rodgers",
  crew: ["Nagendra Prasad", "Ram", "Kiran", "Rajesh", "Srividya", "Smrithi", "Chetan"]
};

const TEAM_ROSTERS = {
  "Team Alpha": ["Ram", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
  "Team Bravo": ["Kiran", "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20"],
  "Team Charlie": ["Chetan", "P22", "P23", "P24", "P25", "P26", "P27", "P28", "P29", "P30"],
  "Team Delta": ["Rajesh", "P32", "P33", "P34", "P35", "P36", "P37", "P38", "P39", "P40"],
};

const SCHEDULE_DATA = {
  "Feb 7th": [
    { time: "09:00 AM", type: "Singles", t1: "Team Alpha", t2: "Team Bravo" },
    { time: "10:30 AM", type: "Doubles", t1: "Team Charlie", t2: "Team Delta" },
  ],
  "Feb 8th": [
    { time: "09:00 AM", type: "Doubles", t1: "Team Bravo", t2: "Team Delta" },
  ],
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const VIEWS = ["live", "results", "standings", "schedule", "info"];
const TEAMS = Object.keys(TEAM_ROSTERS);

const TennisBallIcon = ({ color, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M5.5 18.5C7.5 16 8.5 12.5 8.5 9s-1-7-3-9.5" transform="rotate(30 12 12)" />
    <path d="M18.5 5.5C16.5 8 15.5 11.5 15.5 15s1 7 3 9.5" transform="rotate(30 12 12)" />
  </svg>
);

const RacquetIcon = ({ color, size = 32, isServing = false }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={isServing ? "racquet-breathe" : ""}
    style={{ filter: isServing ? `drop-shadow(0 0 6px rgba(255,255,255,0.4))` : "none" }}
  >
    <circle cx="15" cy="9" r="6" />
    <path d="M10.5 13.5L3 21" />
    <path d="M13 7l4 4" />
    <path d="M11 9l4 4" />
    <circle cx="20" cy="20" r="2.5" fill={color} stroke="none" />
  </svg>
);

const GreenCheck = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const MWCScoreboard = () => {
  const [view, setView] = useState("live");
  const [infoTab, setInfoTab] = useState("rules");
  const [activeDay, setActiveDay] = useState("Feb 7th");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [history, setHistory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editScores, setEditScores] = useState({ s1: 0, s2: 0 });
  const [match, setMatch] = useState({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles", server: null });
  const [viewers, setViewers] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);

  const theme = { bg: "#000", card: "#111", accent: "#adff2f", text: "#FFF", muted: "#666", server: "#FFF" };

  const handleZoom = () => setZoomLevel(prev => (prev >= 1.2 ? 1 : prev + 0.1));

  const handleLogin = () => {
    if (isAdmin) { setIsAdmin(false); } 
    else {
      const p = window.prompt("Umpire PIN:");
      if (p === "121212") { setIsAdmin(true); setLoginError(false); } 
      else if (p !== null) { setLoginError(true); setTimeout(() => setLoginError(false), 3000); }
    }
  };

  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const onTouchStart = (e) => (touchStart.current = e.targetTouches[0].clientX);
  const onTouchMove = (e) => (touchEnd.current = e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const dist = touchStart.current - touchEnd.current;
    if (Math.abs(dist) > 70) {
      const idx = VIEWS.indexOf(view);
      if (dist > 0 && idx < VIEWS.length - 1) setView(VIEWS[idx + 1]);
      if (dist < 0 && idx > 0) setView(VIEWS[idx - 1]);
    }
    touchStart.current = null; touchEnd.current = null;
  };

  useEffect(() => {
    onValue(ref(db, "live/"), (snap) => snap.val() && setMatch(snap.val()));
    onValue(ref(db, "history/"), (snap) => {
      if (snap.val()) {
        const raw = snap.val();
        setHistory(Object.keys(raw).map(k => ({ id: k, ...raw[k] })).sort((a, b) => b.mNo - a.mNo));
      } else setHistory([]);
    });
    const myPresenceRef = push(ref(db, "presence/"));
    onValue(ref(db, ".info/connected"), (snap) => {
      if (snap.val() === true) { onDisconnect(myPresenceRef).remove(); set(myPresenceRef, serverTimestamp()); }
    });
    onValue(ref(db, "presence/"), (snap) => setViewers(snap.exists() ? Object.keys(snap.val()).length : 1));
    return () => remove(myPresenceRef);
  }, []);

  const standings = useMemo(() => {
    const stats = TEAMS.reduce((acc, t) => { acc[t] = { played: 0, won: 0 }; return acc; }, {});
    history.forEach((m) => {
      if (stats[m.t1]) stats[m.t1].played += 1;
      if (stats[m.t2]) stats[m.t2].played += 1;
      if (Number(m.s1) > Number(m.s2)) { if (stats[m.t1]) stats[m.t1].won += 1; }
      else if (Number(m.s2) > Number(m.s1)) { if (stats[m.t2]) stats[m.t2].won += 1; }
    });
    return Object.entries(stats).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.won - a.won || b.played - a.played);
  }, [history]);

  const playerStats = useMemo(() => {
    const stats = {};
    history.forEach((m) => {
      const sides = m.players.split(" vs ");
      if (sides.length !== 2) return;
      const t1p = sides[0].split("/").map(p => p.trim());
      const t2p = sides[1].split("/").map(p => p.trim());
      const all = [...t1p, ...t2p];
      all.forEach(p => { if (!stats[p]) stats[p] = { name: p, mp: 0, mw: 0 }; });
      all.forEach(p => stats[p].mp += 1);
      if (Number(m.s1) > Number(m.s2)) t1p.forEach(p => stats[p].mw += 1);
      else if (Number(m.s2) > Number(m.s1)) t2p.forEach(p => stats[p].mw += 1);
    });
    const sorted = Object.values(stats).sort((a, b) => b.mw - a.mw);
    const maxWins = sorted.length > 0 ? sorted[0].mw : 0;
    return { sorted, maxWins };
  }, [history]);

  const sync = (d) => { setMatch(d); if (isAdmin) set(ref(db, "live/"), d); };
  const isPlayerUsed = (p, currentSlot) => ["p1a", "p1b", "p2a", "p2b"].some(s => s !== currentSlot && match[s] === p);

  const handleScoreUpdate = (teamNum, currentScore) => {
    if (currentScore > 7) return; 
    const nextServer = match.server === 1 ? 2 : 1;
    sync({ ...match, [`s${teamNum}`]: currentScore, server: nextServer });
  };

  const handleScoreReduce = (teamNum) => {
    const newScore = Math.max(0, (match[`s${teamNum}`] || 0) - 1);
    const prevServer = match.server === 1 ? 2 : 1;
    sync({ ...match, [`s${teamNum}`]: newScore, server: prevServer });
  };

  const isServingForSet = (teamNum) => {
    if (!match.server || match.server !== teamNum) return false;
    const s1 = Number(match.s1 || 0);
    const s2 = Number(match.s2 || 0);
    // Target is 7 points.
    if (teamNum === 1) return s1 === 6 || (s1 === 5 && s1 > s2);
    if (teamNum === 2) return s2 === 6 || (s2 === 5 && s2 > s1);
    return false;
  };

  const isMatchInProgress = Number(match.s1 || 0) > 0 || Number(match.s2 || 0) > 0;

  const getUmpireSelectStyle = (isDisabled, isHalfWidth = false) => ({
    width: isHalfWidth ? "48%" : "100%",
    padding: "14px",
    background: "#111",
    color: isDisabled ? theme.accent : "#FFF",
    border: "1px solid #333",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: isDisabled ? "900" : "normal",
    textAlign: isDisabled ? "center" : "left",
    opacity: 1, 
    WebkitTextFillColor: isDisabled ? theme.accent : "initial",
    appearance: isDisabled ? "none" : "auto"
  });

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} 
         style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", fontFamily: "-apple-system, sans-serif", paddingBottom: "110px", zoom: zoomLevel }}>
      
      <header style={{ padding: "15px 10px", borderBottom: "1px solid #222", backgroundColor: "#000", position: "sticky", top: 0, zIndex: 1000 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "500px", margin: "0 auto" }}>
          <div style={{ minWidth: "95px", display: "flex", flexDirection: "column", gap: "5px" }}>
            <div className="pulse" style={{ color: theme.accent, fontSize: "9px", fontWeight: "bold", border: `1px solid ${theme.accent}`, padding: "3px 7px", borderRadius: "12px", textAlign: "center" }}>● {viewers} VIEWERS</div>
            <button onClick={handleZoom} style={{ background: "#222", color: "#FFF", border: "1px solid #444", borderRadius: "8px", fontSize: "10px", padding: "4px", fontWeight: "bold" }}>A± {Math.round(zoomLevel * 100)}%</button>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <h1 style={{ color: theme.accent, margin: 0, fontSize: "18px", fontStyle: "italic", fontWeight: "900" }}>MWC OPEN'26</h1>
            <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px" }}>8TH EDITION - V7.4</div>
          </div>
          <div style={{ minWidth: "95px", textAlign: "right", position: "relative" }}>
            {loginError && <div style={{ position: "absolute", top: "-18px", right: 0, color: "#ff4444", fontSize: "9px", fontWeight: "900" }}>INCORRECT PIN</div>}
            <button onClick={handleLogin} style={{ padding: "6px 12px", borderRadius: "20px", border: `1px solid ${isAdmin ? theme.accent : "#FFF"}`, backgroundColor: isAdmin ? theme.accent : "transparent", color: isAdmin ? "#000" : "#FFF", fontSize: "10px", fontWeight: "900" }}>{isAdmin ? "LOGOUT" : "UMPIRE"}</button>
          </div>
        </div>
      </header>

      <div style={{ background: "rgba(20,20,20,0.8)", borderBottom: "1px solid #222", overflow: "hidden", whiteSpace: "nowrap", padding: "8px 0" }}>
        <div style={{ display: "inline-block", animation: "ticker 30s linear infinite" }}>
          {[...SPONSORS, ...SPONSORS].map((s, i) => (
            <span key={i} style={{ margin: "0 30px", fontSize: "10px", fontWeight: "800" }}>
              <span style={{ color: theme.accent, marginRight: "5px" }}>{s.label}:</span>{s.name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "10px" }}>
        {view === "live" && (
           <div className="fade-in">
             {isAdmin && (
               <select 
                disabled={isMatchInProgress}
                style={{ ...getUmpireSelectStyle(isMatchInProgress), marginBottom: "10px" }} 
                value={match.mType} 
                onChange={(e) => sync({ ...match, mType: e.target.value })}
               >
                 <option value="Singles">Singles</option><option value="Doubles">Doubles</option>
               </select>
             )}

             {[1, 2].map(n => {
               const setPoint = isServingForSet(n);
               const isServing = match.server === n;
               return (
                 <div 
                   key={n} 
                   className={isServing ? "serving-card-active" : ""} 
                   style={{ 
                     backgroundColor: theme.card, 
                     padding: "18px", 
                     borderRadius: "15px", 
                     margin: "15px 0", 
                     border: isServing ? `2px solid #EEE` : "1px solid #222", 
                     textAlign: "center", 
                     position: "relative", 
                     transition: "all 0.4s ease" 
                   }}
                 >
                   
                   {setPoint && (
                     <div className="set-point-blinker" style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: theme.accent, color: "#000", fontSize: "9px", fontWeight: "900", padding: "4px 12px", borderRadius: "20px", letterSpacing: "1px", zIndex: 100, boxShadow: `0 0 12px ${theme.accent}`, border: "2px solid #000" }}>
                       SERVING FOR THE SET
                     </div>
                   )}

                   <div style={{ position: "absolute", bottom: "12px", left: "12px" }}>
                      {isAdmin && !match.server && match.t1 && match.t2 ? (
                        <button onClick={() => sync({ ...match, server: n })} style={{ background: "transparent", border: `1px solid #FFF`, color: "#FFF", fontSize: "8px", padding: "4px 8px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "5px", fontWeight: "bold" }}>
                           <RacquetIcon color="#FFF" size={14} /> SET SERVER
                        </button>
                      ) : (
                        isServing && <RacquetIcon color="#FFF" size={28} isServing={true} />
                      )}
                   </div>
                   
                   {isAdmin ? (
                     <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "5px", textAlign: "center" }}>
                       {!isMatchInProgress ? (
                         <select style={getUmpireSelectStyle(false)} value={match[`t${n}`]} onChange={(e) => sync({ ...match, [`t${n}`]: e.target.value, [`p${n}a`]: "", [`p${n}b`]: "", server: null })}><option value="">Select Team</option>{TEAMS.map(t => <option key={t} disabled={n === 1 ? match.t2 === t : match.t1 === t}>{t}</option>)}</select>
                       ) : (
                         <div style={{ fontSize: "16px", fontWeight: "900", color: theme.accent, textTransform: "uppercase" }}>{match[`t${n}`]}</div>
                       )}
                       
                       <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "5px" }}>
                          {!isMatchInProgress ? (
                            <>
                              <select style={getUmpireSelectStyle(false, match.mType === "Doubles")} value={match[`p${n}a`]} onChange={(e) => sync({ ...match, [`p${n}a`]: e.target.value })}><option value="">Player 1</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p} disabled={isPlayerUsed(p, `p${n}a`)}>{p}</option>)}</select>
                              {match.mType === "Doubles" && (
                                <>
                                  <span style={{ color: theme.muted, fontWeight: "900", fontSize: "12px" }}>/</span>
                                  <select style={getUmpireSelectStyle(false, true)} value={match[`p${n}b`]} onChange={(e) => sync({ ...match, [`p${n}b`]: e.target.value })}><option value="">Player 2</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p} disabled={isPlayerUsed(p, `p${n}b`)}>{p}</option>)}</select>
                                </>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#FFF" }}>
                              {match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && ` / ${match[`p${n}b`]}`}
                            </div>
                          )}
                       </div>
                     </div>
                   ) : (
                     <div style={{ marginTop: "10px" }}>
                       <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "900", letterSpacing: "-1px" }}>{match[`t${n}`] || "---"}</h2>
                       <p style={{ color: "#AAA", fontSize: "12px", fontWeight: "700" }}>
                         {match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && ` / ${match[`p${n}b`]}`}
                       </p>
                     </div>
                   )}
                   
                   <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                     {isAdmin && <button disabled={!match.server} onClick={() => handleScoreReduce(n)} style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#222", color: "#ff4444", border: "1px solid #333", opacity: !match.server ? 0.2 : 1, fontSize: "28px", fontWeight: "900" }}>-</button>}
                     <span style={{ fontSize: "60px", fontWeight: "900", margin: "0 20px", opacity: !match.server && isAdmin ? 0.3 : 1 }}>{match[`s${n}`] || 0}</span>
                     {isAdmin && <button disabled={!match.server || (match[`s${n}`] >= 7)} onClick={() => handleScoreUpdate(n, (match[`s${n}`] || 0) + 1)} style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#222", color: theme.accent, border: "1px solid #333", opacity: (!match.server || match[`s${n}`] >= 7) ? 0.2 : 1, fontSize: "28px", fontWeight: "900" }}>+</button>}
                   </div>
                 </div>
               );
             })}
             {isAdmin && match.t1 && <button onClick={() => {
                if(!window.confirm("Finalize Match?")) return;
                const pLine = match.mType === "Singles" ? `${match.p1a} vs ${match.p2a}` : `${match.p1a}/${match.p1b} vs ${match.p2a}/${match.p2b}`;
                const now = new Date();
                const ts = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                push(ref(db, "history/"), { mNo: Date.now(), t1: match.t1, t2: match.t2, players: pLine, s1: match.s1, s2: match.s2, time: ts });
                sync({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles", server: null });
             }} style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "#FFF", color: "#000", fontWeight: "900", border: "none", marginTop: "10px" }}>CLOSE THE MATCH</button>}
           </div>
        )}

        {view === "standings" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <button onClick={() => setInfoTab("team_std")} style={{ flex: 1, padding: "14px", background: infoTab !== "player_std" ? theme.accent : "#111", color: infoTab !== "player_std" ? "#000" : "#FFF", border: "none", borderRadius: "12px", fontWeight: "900", fontSize: "10px" }}>TEAMS</button>
              <button onClick={() => setInfoTab("player_std")} style={{ flex: 1, padding: "14px", background: infoTab === "player_std" ? theme.accent : "#111", color: infoTab === "player_std" ? "#000" : "#FFF", border: "none", borderRadius: "12px", fontWeight: "900", fontSize: "10px" }}>PLAYERS (MVP)</button>
            </div>
            <div style={{ backgroundColor: theme.card, borderRadius: "15px", border: "1px solid #222", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                {infoTab === "player_std" ? (
                  <>
                    <thead style={{ background: "#050505" }}><tr style={{ textAlign: "left" }}><th style={{ padding: "15px", fontSize: "10px", color: theme.accent }}>PLAYER</th><th style={{ textAlign: "center", fontSize: "10px" }}>MP</th><th style={{ textAlign: "right", paddingRight: "20px", fontSize: "10px", color: theme.accent }}>WINS</th></tr></thead>
                    <tbody>{playerStats.sorted.map((p, i) => (
                      <tr key={p.name} style={{ borderBottom: "1px solid #222" }}>
                        <td style={{ padding: "15px" }}><span style={{ marginRight: "8px" }}>{p.mw === playerStats.maxWins && p.mw > 0 ? "👑" : <span style={{color: "#444", fontWeight: "900", fontSize: "10px"}}>#{i + 1}</span>}</span><span style={{ fontWeight: "700", fontSize: "14px", color: p.mw === playerStats.maxWins && p.mw > 0 ? theme.accent : "#FFF" }}>{p.name}</span></td>
                        <td style={{ textAlign: "center", color: "#888" }}>{p.mp}</td><td style={{ textAlign: "right", paddingRight: "20px", fontWeight: "900", color: theme.accent, fontSize: "18px" }}>{p.mw}</td>
                      </tr>
                    ))}</tbody>
                  </>
                ) : (
                  <>
                    <thead style={{ background: "#050505" }}><tr style={{ textAlign: "left" }}><th style={{ padding: "15px", fontSize: "10px", color: theme.accent }}>TEAM</th><th style={{ textAlign: "center", fontSize: "10px" }}>MP</th><th style={{ textAlign: "right", paddingRight: "20px", fontSize: "10px", color: theme.accent }}>WINS</th></tr></thead>
                    <tbody>{standings.map((team, i) => (
                      <tr key={team.name} style={{ borderBottom: "1px solid #222" }}>
                        <td style={{ padding: "15px" }}><span style={{ color: i===0 ? theme.accent : "#555", fontWeight: "900", marginRight: "8px" }}>#{i+1}</span><span style={{ fontWeight: "700", fontSize: "14px" }}>{team.name}</span></td>
                        <td style={{ textAlign: "center" }}>{team.played}</td><td style={{ textAlign: "right", paddingRight: "20px", fontWeight: "900", color: theme.accent, fontSize: "18px" }}>{team.won}</td>
                      </tr>
                    ))}</tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        )}

        {view === "results" && (
           <div className="fade-in" style={{ backgroundColor: theme.card, borderRadius: "12px", overflow: "hidden", border: "1px solid #222" }}>
             {history.length === 0 ? <p style={{textAlign:"center", padding: "40px", color: "#555"}}>No results yet.</p> : history.map((h) => (
               <div key={h.id} style={{ padding: "18px", borderBottom: "1px solid #222" }}>
                 <div style={{ display: "flex", alignItems: "center" }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: "800", fontSize: "14px" }}>{h.t1} {Number(h.s1) > Number(h.s2) && <GreenCheck color={theme.accent}/>} <span style={{color: "#444"}}>vs</span> {h.t2} {Number(h.s2) > Number(h.s1) && <GreenCheck color={theme.accent}/>}</div>
                     <div style={{ fontSize: "11px", color: "#BBB", marginTop: "4px" }}>{h.players}</div>
                     <div style={{ fontSize: "9px", color: theme.accent, marginTop: "8px", fontWeight: "bold" }}>{h.time}</div>
                   </div>
                   {editingId === h.id ? (
                     <div style={{ display: "flex", gap: "5px" }}>
                        <input type="number" style={{ width: "40px", padding: "5px", background: "#222", color: "#FFF", border: "1px solid #444" }} value={editScores.s1} onChange={e=>setEditScores({...editScores, s1: e.target.value})} />
                        <input type="number" style={{ width: "40px", padding: "5px", background: "#222", color: "#FFF", border: "1px solid #444" }} value={editScores.s2} onChange={e=>setEditScores({...editScores, s2: e.target.value})} />
                        <button onClick={()=> { update(ref(db, `history/${h.id}`), { s1: Number(editScores.s1), s2: Number(editScores.s2) }); setEditingId(null); }} style={{ background: theme.accent, padding: "5px 10px", borderRadius: "4px", fontWeight: "bold" }}>SAVE</button>
                     </div>
                   ) : (<div style={{ textAlign: "right" }}><span style={{ color: theme.accent, fontWeight: "900", fontSize: "22px" }}>{h.s1} - {h.s2}</span></div>)}
                 </div>
                 {isAdmin && editingId !== h.id && (
                   <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
                     <button onClick={() => {setEditingId(h.id); setEditScores({s1:h.s1, s2:h.s2})}} style={{ color: theme.accent, background: "none", border: "1px solid #333", padding: "5px 10px", fontSize: "10px", borderRadius: "5px" }}>EDIT</button>
                     <button onClick={() => window.confirm("Delete?") && remove(ref(db, `history/${h.id}`))} style={{ color: "#ff4444", background: "none", border: "1px solid #333", padding: "5px 10px", fontSize: "10px", borderRadius: "5px" }}>DELETE</button>
                   </div>
                 )}
               </div>
             ))}
           </div>
        )}

        {view === "schedule" && (
           <div className="fade-in">
             <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
               {Object.keys(SCHEDULE_DATA).map(d => (
                 <button key={d} onClick={() => setActiveDay(d)} style={{ flex: 1, padding: "14px", background: activeDay === d ? theme.accent : "#111", color: activeDay === d ? "#000" : "#FFF", border: "none", borderRadius: "12px", fontWeight: "900", fontSize: "10px" }}>{d.toUpperCase()}</button>
               ))}
             </div>
             <div style={{ background: theme.card, borderRadius: "15px", border: "1px solid #222", overflow: "hidden" }}>
               {SCHEDULE_DATA[activeDay].map((m, i) => (
                 <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "20px", borderBottom: "1px solid #222" }}>
                   <div style={{ color: theme.accent, fontWeight: "900", fontSize: "14px" }}>{m.time}</div>
                   <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "800", fontSize: "15px" }}>
                        {m.t1} <span style={{ color: "#555", fontWeight: "400", margin: "0 4px" }}>vs</span> {m.t2}
                      </div>
                      <div style={{ fontSize: "10px", color: theme.accent, fontWeight: "bold", marginTop: "4px" }}>{m.type.toUpperCase()}</div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        )}

        {view === "info" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: "6px", marginBottom: "15px", overflowX: "auto", paddingBottom: "8px" }}>
              {["rules", "teams", "crew", "sponsors"].map(tab => (
                <button key={tab} onClick={() => setInfoTab(tab)} style={{ flex: "1 0 auto", minWidth: "85px", padding: "14px 10px", background: infoTab === tab ? theme.accent : "#111", color: infoTab === tab ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900", fontSize: "10px", textTransform: "uppercase" }}>{tab.toUpperCase()}</button>
              ))}
            </div>
            {infoTab === "rules" && (
              <div style={{ padding: "20px", background: theme.card, borderRadius: "15px", border: "1px solid #333" }}>
                <ul style={{ color: "#EEE", lineHeight: "2.2", margin: 0, paddingLeft: "20px", fontSize: "14px" }}>
                  <li>Best of 3 sets to 7 points.</li>
                  <li>Golden Point at 6-all.</li>
                  <li>1 Point per match win.</li>
                </ul>
              </div>
            )}
            {infoTab === "teams" && (
              <div className="fade-in">
                <div style={{ background: theme.card, padding: "18px", borderRadius: "12px", border: `1px solid ${theme.accent}`, textAlign: "center", marginBottom: "15px" }}>
                   <div style={{ color: theme.accent, fontSize: "9px", fontWeight: "900", marginBottom: "4px", letterSpacing: "1px" }}>CHAIR UMPIRE</div>
                   <div style={{ fontSize: "18px", fontWeight: "900" }}>{COMMUNITY_TEAM.chairUmpire}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {Object.entries(TEAM_ROSTERS).map(([t, ps]) => (
                    <div key={t} style={{ background: theme.card, padding: "15px", borderRadius: "12px", border: "1px solid #222" }}>
                      <h4 style={{ margin: "0 0 10px 0", color: theme.accent, fontSize: "11px", letterSpacing: "0.5px" }}>{t.toUpperCase()}</h4>
                      {ps.map((p, i) => <div key={i} style={{ fontSize: "12px", color: "#DDD", marginBottom: "3px" }}>{p}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {infoTab === "crew" && (
              <div className="fade-in" style={{ background: theme.card, borderRadius: "15px", border: "1px solid #222", padding: "15px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {COMMUNITY_TEAM.crew.map((name, i) => (
                    <div key={i} style={{ background: "#050505", padding: "12px", borderRadius: "10px", fontSize: "13px", color: "#EEE", textAlign: "center", border: "1px solid #222" }}>{name}</div>
                  ))}
                </div>
              </div>
            )}
            {infoTab === "sponsors" && (
              <div className="fade-in" style={{ background: theme.card, borderRadius: "15px", border: "1px solid #222", padding: "15px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {SPONSORS.map((s, i) => (
                    <div key={i} style={{ background: "#050505", padding: "15px", borderRadius: "10px", border: "1px solid #222", textAlign: "center" }}>
                      <div style={{ color: theme.accent, fontSize: "9px", fontWeight: "900", marginBottom: "2px" }}>{s.label}</div>
                      <div style={{ fontSize: "16px", fontWeight: "800" }}>{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", display: "flex", background: "rgba(10,10,10,0.95)", backdropFilter: "blur(15px)", borderTop: "1px solid #222", paddingBottom: "35px", paddingTop: "15px", zIndex: 100 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#555", fontSize: "10px", fontWeight: "900" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
                {v === "live" ? <TennisBallIcon color={view === v ? theme.accent : "#555"} /> : 
                 v === "results" ? <span style={{fontSize: "20px", marginBottom: "5px"}}>✅</span> : 
                 v === "standings" ? <span style={{fontSize: "20px", marginBottom: "5px"}}>🏆</span> : 
                 v === "schedule" ? <span style={{fontSize: "20px", marginBottom: "5px"}}>📅</span> : 
                 <span style={{fontSize: "20px", marginBottom: "5px"}}>📋</span>}
            </div>
            {v.toUpperCase()}
          </button>
        ))}
      </nav>

      <style>{`
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .pulse { animation: softPulse 2s infinite; }
        @keyframes softPulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        button:active { transform: scale(0.95); transition: 0.1s; }
        
        .serving-card-active { animation: breathingBorder 2s infinite ease-in-out; }
        .racquet-breathe { animation: breathingRacquet 2s infinite ease-in-out; }

        @keyframes breathingBorder {
          0% { border-color: #333; box-shadow: 0 0 4px rgba(255, 255, 255, 0.05); }
          50% { border-color: #EEE; box-shadow: 0 0 10px rgba(255, 255, 255, 0.15); }
          100% { border-color: #333; box-shadow: 0 0 4px rgba(255, 255, 255, 0.05); }
        }

        @keyframes breathingRacquet {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }

        .set-point-blinker { animation: badgeBlink 0.8s infinite alternate ease-in-out; }
        @keyframes badgeBlink {
          from { opacity: 1; transform: translateX(-50%) scale(1); }
          to { opacity: 0.7; transform: translateX(-50%) scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default MWCScoreboard;
