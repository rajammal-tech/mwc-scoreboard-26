import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, onDisconnect, serverTimestamp } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCwoLIBAh4NMlvp-r8avXucscjVA10ydw0",
  authDomain: "mwc-open---8th-edition.firebaseapp.com",
  databaseURL: "https://mwc-open---8th-edition-default-rtdb.firebaseio.com",
  projectId: "mwc-open---8th-edition",
  storageBucket: "mwc-open---8th-edition.firebasestorage.app",
  messagingSenderId: "1056583710011",
  appId: "1:1056583710011:web:998e4f73a657ef69d3b31e",
};

const SPONSORS = [
  { label: "TENNIS BALLS", name: "Smrithi" },
  { label: "REFRESHMENTS", name: "???" }, 
  { label: "VOLUNTARY CONTRIBUTION", name: "???" },
];

const COMMUNITY_TEAM = { 
  chairUmpire: "Raphael Rodgers",
  crew: ["Nagendra Prasad", "Ram", "Kiran", "Rajesh", "Srividya", "Smrithi", "Chetan"]
};

const TEAM_ROSTERS = {
  "Team Alpha": ["Ram", "P2", "P3", "P4", "P5", "P6"],
  "Team Bravo": ["Kiran", "P12", "P13", "P14", "P15", "P16"],
  "Team Charlie": ["Chetan", "P22", "P23", "P24", "P25", "P26"],
  "Team Delta": ["Rajesh", "P32", "P33", "P34", "P35", "P36"],
};

const SCHEDULE_DATA = {
  "Feb 7": [
    { time: "09:00 AM", type: "Singles", t1: "Team Alpha", t2: "Team Bravo" },
    { time: "10:30 AM", type: "Doubles", t1: "Team Charlie", t2: "Team Delta" },
  ],
  "Feb 8": [
    { time: "09:00 AM", type: "Doubles", t1: "Team Bravo", t2: "Team Delta" },
  ],
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const VIEWS = ["live", "results", "standings", "schedule", "info"];
const TEAMS = Object.keys(TEAM_ROSTERS);

// Utility for DD/MM HH:MM AM/PM format
const formatMatchTime = (isoString) => {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
  return `${day}/${month}  ${strTime}`;
};

const TennisBallIcon = ({ color, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M5.5 18.5C7.5 16 8.5 12.5 8.5 9s-1-7-3-9.5" transform="rotate(30 12 12)" />
    <path d="M18.5 5.5C16.5 8 15.5 11.5 15.5 15s1 7 3 9.5" transform="rotate(30 12 12)" />
  </svg>
);

const RacquetIcon = ({ color, size = 32, isServing = false }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
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
  const [activeDay, setActiveDay] = useState("Feb 7");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [history, setHistory] = useState([]);
  const [match, setMatch] = useState({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles", server: null });
  const [viewers, setViewers] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [bannerText, setBannerText] = useState("Welcome to MWC Open'26 - 8th Edition");
  const [editingId, setEditingId] = useState(null);
  const [editScores, setEditScores] = useState({ s1: 0, s2: 0 });

  const theme = { bg: "#000", card: "#111", accent: "#adff2f", text: "#FFF", muted: "#666", server: "#FFF" };

  useEffect(() => {
    if (view === "info") setInfoTab("rules");
    if (view === "standings") setInfoTab("team_std");
    if (view === "schedule") setActiveDay("Feb 7");
    if (view !== "results") setEditingId(null);
  }, [view]);

  const handleZoom = () => setZoomLevel(prev => (prev >= 1.2 ? 1 : prev + 0.1));

  const handleLogin = () => {
    if (isAdmin) { 
        setIsAdmin(false);
        if(infoTab === "banner") setInfoTab("rules");
    } else {
      const p = window.prompt("Umpire PIN:");
      if (p === "121212") { setIsAdmin(true); setLoginError(false); } 
      else if (p !== null) { setLoginError(true);
      setTimeout(() => setLoginError(false), 3000); }
    }
  };

  const arePlayersSelected = useMemo(() => {
    const p1Valid = match.mType === "Singles" ? !!match.p1a : (!!match.p1a && !!match.p1b);
    const p2Valid = match.mType === "Singles" ? !!match.p2a : (!!match.p2a && !!match.p2b);
    return p1Valid && p2Valid;
  }, [match]);

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
    touchStart.current = null;
    touchEnd.current = null;
  };

  useEffect(() => {
    onValue(ref(db, "live/"), (snap) => snap.val() && setMatch(snap.val()));
    onValue(ref(db, "banner/"), (snap) => snap.exists() && setBannerText(snap.val()));
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
    const stats = TEAMS.reduce((acc, t) => { acc[t] = { played: 0, won: 0, games: 0, gamesLost: 0 }; return acc; }, {});
    history.forEach((m) => {
      const s1 = Number(m.s1 || 0);
      const s2 = Number(m.s2 || 0);
      if (stats[m.t1]) {
        stats[m.t1].played += 1;
        stats[m.t1].games += s1;
        stats[m.t1].gamesLost += s2;
      }
      if (stats[m.t2]) {
        stats[m.t2].played += 1;
        stats[m.t2].games += s2;
        stats[m.t2].gamesLost += s1;
      }
      if (s1 > s2) { if (stats[m.t1]) stats[m.t1].won += 1; }
      else if (s2 > s1) { if (stats[m.t2]) stats[m.t2].won += 1; }
    });
    return Object.entries(stats)
      .map(([name, d]) => ({ 
        name, 
        ...d, 
        winRate: d.played > 0 ? Math.round((d.won / d.played) * 100) : 0 
      }))
      .sort((a, b) => b.won - a.won || (b.games - b.gamesLost) - (a.games - a.gamesLost));
  }, [history]);

  const playerStats = useMemo(() => {
    const stats = {};
    const playerToTeam = {};
    Object.entries(TEAM_ROSTERS).forEach(([team, players]) => {
      players.forEach(p => playerToTeam[p] = team);
    });

    history.forEach((m) => {
      const sides = m.players.split(" vs ");
      if (sides.length !== 2) return;
      const t1p = sides[0].split("/").map(p => p.trim());
      const t2p = sides[1].split("/").map(p => p.trim());
      const all = [...t1p, ...t2p];
      all.forEach(p => { if (!stats[p]) stats[p] = { name: p, mp: 0, mw: 0, team: playerToTeam[p] || "---" }; });
      all.forEach(p => { stats[p].mp += 1; });
      if (Number(m.s1) > Number(m.s2)) t1p.forEach(p => stats[p].mw += 1);
      else if (Number(m.s2) > Number(m.s1)) t2p.forEach(p => stats[p].mw += 1);
    });
    return Object.values(stats).sort((a, b) => b.mw - a.mw);
  }, [history]);

  const sync = (d) => { setMatch(d); if (isAdmin) set(ref(db, "live/"), d); };
  const updateBanner = (text) => { setBannerText(text); if (isAdmin) set(ref(db, "banner/"), text); };
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
    if (teamNum === 1) return s1 >= 5 && s1 > s2;
    if (teamNum === 2) return s2 >= 5 && s2 > s1;
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
    appearance: isDisabled ? "none" : "auto",
    boxSizing: "border-box"
  });

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} 
         style={{ 
           backgroundColor: theme.bg, 
           color: theme.text, 
           height: "100dvh", 
           width: "100vw",
           display: "flex", 
           flexDirection: "column", 
           fontFamily: "-apple-system, sans-serif", 
           zoom: zoomLevel,
           overflow: "hidden",
           boxSizing: "border-box"
         }}>
      
      {/* HEADER & BANNER */}
      <div style={{ flexShrink: 0, zIndex: 1000, background: "#000", width: "100%" }}>
        <header style={{ padding: "15px 10px", borderBottom: "1px solid #222" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "500px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
            <div style={{ minWidth: "90px", display: "flex", flexDirection: "column", gap: "5px" }}>
              <div className="pulse" style={{ color: theme.accent, fontSize: "9px", fontWeight: "bold", border: `1px solid ${theme.accent}`, padding: "3px 7px", borderRadius: "12px", textAlign: "center" }}>● {viewers} VIEWERS</div>
              <button onClick={handleZoom} style={{ background: "#222", color: "#FFF", border: "1px solid #444", borderRadius: "8px", fontSize: "10px", padding: "4px", fontWeight: "bold" }}>A± {Math.round(zoomLevel * 100)}%</button>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <h1 style={{ color: theme.accent, margin: 0, fontSize: "18px", fontStyle: "italic", fontWeight: "900" }}>MWC OPEN'26</h1>
              <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px" }}>8th Edition</div>
            </div>
            <div style={{ minWidth: "90px", textAlign: "right", position: "relative" }}>
              {loginError && <div style={{ position: "absolute", top: "-18px", right: 0, color: "#ff4444", fontSize: "9px", fontWeight: "900" }}>INCORRECT PIN</div>}
              <button onClick={handleLogin} style={{ padding: "6px 12px", borderRadius: "20px", border: `1px solid ${isAdmin ? theme.accent : "#FFF"}`, backgroundColor: isAdmin ? theme.accent : "transparent", color: isAdmin ? "#000" : "#FFF", fontSize: "10px", fontWeight: "900" }}>{isAdmin ? "LOGOUT" : "UMPIRE"}</button>
            </div>
          </div>
        </header>

        <div style={{ width: "100%", background: "#111", borderBottom: "1px solid #222", padding: "8px 0", overflow: "hidden", whiteSpace: "nowrap" }}>
          <div className="banner-ticker" style={{ display: "inline-block", paddingLeft: "100%", animation: "ticker 20s linear infinite" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#f0f0f0", letterSpacing: "0.5px" }}>
              {bannerText} &nbsp;&nbsp; — &nbsp;&nbsp; {bannerText} &nbsp;&nbsp; — &nbsp;&nbsp; {bannerText}
            </span>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="scroll-container" style={{ 
        flexGrow: 1, 
        overflowY: "auto", 
        WebkitOverflowScrolling: "touch",
        width: "100%",
        maxWidth: "500px",
        margin: "0 auto",
        padding: "15px",
        paddingBottom: "120px",
        boxSizing: "border-box",
        touchAction: "pan-y"
      }}>
        {view === "live" && (
           <div className="fade-in">
             {!isAdmin && <div style={{ textAlign: "center", marginBottom: "15px", fontSize: "12px", fontWeight: "900", color: theme.accent, letterSpacing: "2px", textTransform: "uppercase" }}>{(match.mType || "Singles")} MATCH</div>}
             {isAdmin && <select disabled={isMatchInProgress} style={{ ...getUmpireSelectStyle(isMatchInProgress), marginBottom: "15px" }} value={match.mType} onChange={(e) => sync({ ...match, mType: e.target.value })}><option value="Singles">Singles</option><option value="Doubles">Doubles</option></select>}
             
             {[1, 2].map(n => {
               const setPoint = isServingForSet(n);
               const isTieBreak = Number(match.s1) === 6 && Number(match.s2) === 6;
               const isServing = match.server === n;
               const showBreathing = isTieBreak || isServing;
               const showRacquet = isServing && !isTieBreak;
               return (
                 <div key={n} className={showBreathing ? "serving-card-active" : ""} style={{ backgroundColor: theme.card, padding: "20px", borderRadius: "15px", margin: "15px 0", border: showBreathing ? `2px solid #EEE` : "1px solid #222", textAlign: "center", position: "relative", boxSizing: "border-box" }}>
                   {setPoint && !isTieBreak && <div className="set-point-blinker" style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: theme.accent, color: "#000", fontSize: "9px", fontWeight: "900", padding: "4px 12px", borderRadius: "20px", zIndex: 100, border: "2px solid #000" }}>SERVING FOR THE SET</div>}
                   <div style={{ position: "absolute", bottom: "12px", left: "12px" }}>
                      {isAdmin && !match.server && match.t1 && match.t2 ? (
                        <button disabled={!arePlayersSelected} onClick={() => sync({ ...match, server: n })} style={{ background: "transparent", border: `1px solid ${arePlayersSelected ? "#FFF" : "#444"}`, color: arePlayersSelected ? "#FFF" : "#444", fontSize: "8px", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold", opacity: arePlayersSelected ? 1 : 0.5 }}>SERVER</button>
                      ) : (showRacquet && <RacquetIcon color="#FFF" size={28} isServing={true} />)}
                   </div>
                   {isAdmin ? (
                     <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "5px" }}>
                       {!isMatchInProgress ? (
                         <select style={getUmpireSelectStyle(false)} value={match[`t${n}`]} onChange={(e) => sync({ ...match, [`t${n}`]: e.target.value, [`p${n}a`]: "", [`p${n}b`]: "", server: null })}><option value="">Select Team</option>{TEAMS.map(t => <option key={t} disabled={n === 1 ? match.t2 === t : match.t1 === t}>{t}</option>)}</select>
                       ) : (<div style={{ fontSize: "16px", fontWeight: "900", color: theme.accent, textTransform: "uppercase" }}>{match[`t${n}`] || "---"}</div>)}
                       <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "5px" }}>
                         {!isMatchInProgress ? (
                            <>
                              <select style={getUmpireSelectStyle(false, match.mType === "Doubles")} value={match[`p${n}a`]} onChange={(e) => sync({ ...match, [`p${n}a`]: e.target.value })}><option value="">Select Player</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p} disabled={isPlayerUsed(p, `p${n}a`)}>{p}</option>)}</select>
                              {match.mType === "Doubles" && <><span style={{ color: theme.muted }}>/</span><select style={getUmpireSelectStyle(false, true)} value={match[`p${n}b`]} onChange={(e) => sync({ ...match, [`p${n}b`]: e.target.value })}><option value="">Select Player</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p} disabled={isPlayerUsed(p, `p${n}b`)}>{p}</option>)}</select></>}
                            </>
                         ) : (<div style={{ fontSize: "16px", fontWeight: "600", color: "#FFF" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && ` / ${match[`p${n}b`]}`}</div>)}
                       </div>
                     </div>
                   ) : (
                     <div style={{ marginTop: "10px" }}>
                       <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "900" }}>{match[`t${n}`] || "---"}</h2>
                       <p style={{ color: "#AAA", fontSize: "16px", fontWeight: "700" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && ` / ${match[`p${n}b`]}`}</p>
                    </div>
                   )}
                   <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                     {isAdmin && <button disabled={!match.server} onClick={() => handleScoreReduce(n)} style={{ width: "55px", height: "55px", borderRadius: "50%", background: "#222", color: "#ff4444", fontSize: "24px", fontWeight: "900", border: "1px solid #333" }}>-</button>}
                     <span style={{ fontSize: "55px", fontWeight: "900", margin: "0 20px" }}>{match[`s${n}`] || 0}</span>
                     {isAdmin && <button disabled={!match.server || (match[`s${n}`] >= 7)} onClick={() => handleScoreUpdate(n, (match[`s${n}`] || 0) + 1)} style={{ width: "55px", height: "55px", borderRadius: "50%", background: "#222", color: theme.accent, fontSize: "24px", fontWeight: "900", border: "1px solid #333" }}>+</button>}
                   </div>
                 </div>
               );
             })}
             {isAdmin && match.t1 && <button onClick={() => { if(!window.confirm("Finalize Match?")) return;
                push(ref(db, "history/"), { mNo: Date.now(), t1: match.t1, t2: match.t2, players: match.mType === "Singles" ? `${match.p1a} vs ${match.p2a}` : `${match.p1a}/${match.p1b} vs ${match.p2a}/${match.p2b}`, s1: match.s1, s2: match.s2, time: new Date().toISOString() });
                sync({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles", server: null });
             }} style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "#FFF", color: "#000", fontWeight: "900", border: "none", marginTop: "15px" }}>CLOSE THE MATCH</button>}
           </div>
        )}

        {view === "results" && (
          <div className="fade-in">
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: theme.muted }}>No matches recorded yet.</div>
            ) : (
              history.map((m) => (
                <div key={m.id} style={{ background: theme.card, padding: "20px", borderRadius: "15px", marginBottom: "15px", border: "1px solid #222" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: theme.accent, fontSize: "14px", fontWeight: "900" }}>MATCH #{m.mNo ? String(m.mNo).slice(-3) : "---"}</span>
                    {/* Timestamp with DD/MM format and increased font */}
                    <span style={{ color: theme.muted, fontSize: "14px", fontWeight: "bold" }}>{formatMatchTime(m.time)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      {/* Increased player name fonts */}
                      <div style={{ fontSize: "18px", fontWeight: "800", marginBottom: "4px" }}>{m.t1}</div>
                      <div style={{ fontSize: "15px", color: "#AAA" }}>{m.players.split(" vs ")[0]}</div>
                    </div>

                    {editingId === m.id ? (
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        {/* Score edit controls with + and - (Min 0, Max 7) */}
                        {[1, 2].map(num => (
                          <div key={num} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <button 
                              onClick={() => setEditScores(prev => ({ ...prev, [`s${num}`]: Math.min(7, prev[`s${num}`] + 1) }))}
                              style={{ background: "#222", color: theme.accent, border: "1px solid #444", borderRadius: "4px", width: "28px", height: "28px", fontWeight: "900" }}>+</button>
                            <span style={{ fontSize: "20px", fontWeight: "900", color: theme.accent }}>{editScores[`s${num}`]}</span>
                            <button 
                              onClick={() => setEditScores(prev => ({ ...prev, [`s${num}`]: Math.max(0, prev[`s${num}`] - 1) }))}
                              style={{ background: "#222", color: "#ff4444", border: "1px solid #444", borderRadius: "4px", width: "28px", height: "28px", fontWeight: "900" }}>-</button>
                          </div>
                        ))}
                        <button onClick={() => { update(ref(db, `history/${m.id}`), { s1: editScores.s1, s2: editScores.s2 }); setEditingId(null); }} style={{ background: theme.accent, border: "none", borderRadius: "50%", width: "32px", height: "32px", marginLeft: "5px" }}>✅</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "900", color: theme.accent }}>{m.s1} — {m.s2}</div>
                        {isAdmin && <button onClick={() => { setEditingId(m.id); setEditScores({ s1: m.s1, s2: m.s2 }); }} style={{ background: "none", border: "none", fontSize: "18px" }}>✏️</button>}
                      </div>
                    )}

                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontSize: "18px", fontWeight: "800", marginBottom: "4px" }}>{m.t2}</div>
                      <div style={{ fontSize: "15px", color: "#AAA" }}>{m.players.split(" vs ")[1]}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === "info" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: "6px", marginBottom: "15px", overflowX: "auto", paddingBottom: "8px" }}>
              {["rules", "teams", "crew", "sponsors", ...(isAdmin ? ["banner"] : [])].map(tab => (
                <button key={tab} onClick={() => setInfoTab(tab)} style={{ flex: "1 0 auto", minWidth: "85px", padding: "12px 10px", background: infoTab === tab ? theme.accent : "#111", color: infoTab === tab ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900", fontSize: "10px" }}>{tab.toUpperCase()}</button>
              ))}
            </div>
            {infoTab === "banner" && isAdmin && (
              <div style={{ padding: "20px", background: theme.card, borderRadius: "15px", border: `1px solid ${theme.accent}` }}>
                <label style={{ fontSize: "10px", color: theme.accent, fontWeight: "900", display: "block", marginBottom: "10px" }}>EDIT LIVE ROLLING BANNER</label>
                <textarea rows="3" value={bannerText} onChange={(e) => updateBanner(e.target.value)} style={{ width: "100%", background: "#000", color: "#FFF", border: "1px solid #333", padding: "12px", borderRadius: "8px", fontSize: "14px", outline: "none", resize: "none" }} />
              </div>
            )}
            {infoTab === "rules" && (
              <div style={{ padding: "20px", background: theme.card, borderRadius: "15px", border: "1px solid #333" }}>
                <ul style={{ color: "#EEE", lineHeight: "2.2", margin: 0, paddingLeft: "20px", fontSize: "14px" }}>
                  <li>All matches are of 1 full set</li>
                  <li>7 point Tie-breaker in case of 6-6</li>
                  <li>2 Matches per player is a must in Round robin play</li>
                </ul>
              </div>
            )}
            {infoTab === "teams" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ padding: "10px", textAlign: "center" }}>
                  <div style={{ color: theme.accent, fontSize: "11px", fontWeight: "900" }}>CHAIR UMPIRE</div>
                  <div style={{ fontSize: "12px", color: "#FFF" }}>{COMMUNITY_TEAM.chairUmpire}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {Object.entries(TEAM_ROSTERS).map(([t, ps]) => (
                    <div key={t} style={{ background: theme.card, padding: "15px", borderRadius: "12px", border: "1px solid #222" }}>
                      <h4 style={{ margin: "0 0 10px 0", color: theme.accent, fontSize: "11px" }}>{t.toUpperCase()}</h4>
                      {ps.map((p, i) => <div key={i} style={{ fontSize: "12px", color: "#DDD", marginBottom: "3px" }}>{p}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {infoTab === "crew" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {COMMUNITY_TEAM.crew.map((name, i) => (
                  <div key={i} style={{ background: theme.card, padding: "15px", borderRadius: "10px", fontSize: "13px", color: "#EEE", textAlign: "center", border: "1px solid #222" }}>{name}</div>
                ))}
              </div>
            )}
            {infoTab === "sponsors" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {SPONSORS.map((s, i) => (
                  <div key={i} style={{ background: theme.card, padding: "15px", borderRadius: "10px", border: "1px solid #222", textAlign: "center" }}>
                    <div style={{ color: theme.accent, fontSize: "10px", fontWeight: "900", marginBottom: "4px" }}>{s.label}</div>
                    <div style={{ fontSize: "14px", color: "#FFF" }}>{s.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "standings" && (
          <div className="fade-in">
             <div style={{ display: "flex", gap: "6px", marginBottom: "15px" }}>
               <button onClick={() => setInfoTab("team_std")} style={{ flex: 1, padding: "12px", background: infoTab === "team_std" ? theme.accent : "#111", color: infoTab === "team_std" ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900", fontSize: "10px" }}>TEAM STANDINGS</button>
               <button onClick={() => setInfoTab("player_std")} style={{ flex: 1, padding: "12px", background: infoTab === "player_std" ? theme.accent : "#111", color: infoTab === "player_std" ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900", fontSize: "10px" }}>PLAYER MVP</button>
             </div>
             {infoTab === "team_std" ? (
               <div style={{ background: theme.card, borderRadius: "15px", overflow: "hidden", border: "1px solid #222" }}>
                 <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                   <thead style={{ background: "#222", color: theme.accent }}>
                     <tr>
                        <th style={{ padding: "15px", textAlign: "left" }}>TEAM</th>
                        <th style={{ padding: "15px" }}>P</th>
                        <th style={{ padding: "15px" }}>W</th>
                        <th style={{ padding: "15px" }}>GDIFF</th>
                     </tr>
                   </thead>
                   <tbody>
                     {standings.map((t, i) => (
                       <tr key={t.name} style={{ borderBottom: "1px solid #222" }}>
                         <td style={{ padding: "15px", fontWeight: "700" }}>{i+1}. {t.name}</td>
                         <td style={{ padding: "15px", textAlign: "center" }}>{t.played}</td>
                         <td style={{ padding: "15px", textAlign: "center", color: theme.accent, fontWeight: "900" }}>{t.won}</td>
                         <td style={{ padding: "15px", textAlign: "center" }}>{t.games - t.gamesLost}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div style={{ background: theme.card, borderRadius: "15px", border: "1px solid #222" }}>
                 {playerStats.map((p, i) => (
                   <div key={p.name} style={{ display: "flex", alignItems: "center", padding: "15px", borderBottom: i === playerStats.length - 1 ? "none" : "1px solid #222" }}>
                     <div style={{ width: "25px", fontWeight: "900", color: theme.accent }}>{i + 1}</div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "800", fontSize: "14px" }}>{p.name}</div>
                        <div style={{ fontSize: "10px", color: theme.muted }}>{p.team}</div>
                     </div>
                     <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "900", color: theme.accent }}>{p.mw} Wins</div>
                        <div style={{ fontSize: "10px", color: theme.muted }}>{p.mp} Played</div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {view === "schedule" && (
           <div className="fade-in">
             <div style={{ display: "flex", gap: "6px", marginBottom: "15px" }}>
               {Object.keys(SCHEDULE_DATA).map(day => (
                 <button key={day} onClick={() => setActiveDay(day)} style={{ flex: 1, padding: "12px", background: activeDay === day ? theme.accent : "#111", color: activeDay === day ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900", fontSize: "10px" }}>{day.toUpperCase()}</button>
               ))}
             </div>
             {SCHEDULE_DATA[activeDay].map((s, i) => (
               <div key={i} style={{ background: theme.card, padding: "15px", borderRadius: "15px", marginBottom: "10px", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                 <div style={{ fontSize: "12px", fontWeight: "900", color: theme.accent, width: "65px" }}>{s.time}</div>
                 <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: "14px", fontWeight: "800" }}>{s.t1} <span style={{ color: theme.muted, fontSize: "10px" }}>VS</span> {s.t2}</div>
                    <div style={{ fontSize: "10px", color: theme.muted, marginTop: "2px" }}>{s.type}</div>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

      {/* NAVIGATION BAR */}
      <nav style={{ flexShrink: 0, display: "flex", background: "#000", borderTop: "1px solid #222", padding: "10px 5px 25px 5px", width: "100%", position: "fixed", bottom: 0, zIndex: 1000 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#555", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", fontSize: "9px", fontWeight: "900", transition: "0.2s" }}>
            <div style={{ height: "24px", width: "24px", fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {v === "live" ? <TennisBallIcon color={view === v ? theme.accent : "#555"} size={22} /> : 
               v === "results" ? "📊" : v === "standings" ? "🏆" : v === "schedule" ? "⏩" : "📋"}
            </div>
            {v.toUpperCase()}
          </button>
        ))}
      </nav>

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; padding: 0; overflow: hidden; position: fixed; width: 100%; height: 100%; background: #000; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .pulse { animation: softPulse 2s infinite; }
        @keyframes softPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .serving-card-active { animation: breathingBorder 2s infinite ease-in-out; }
        @keyframes breathingBorder { 0%, 100% { border-color: #222; box-shadow: 0 0 0px rgba(173,255,47,0); } 50% { border-color: #adff2f; box-shadow: 0 0 15px rgba(173,255,47,0.2); } }
        .racquet-breathe { animation: racquetPulse 1.5s infinite ease-in-out; }
        @keyframes racquetPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.15); opacity: 1; } }
        .set-point-blinker { animation: blink 1s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); } 50% { opacity: 0.8; transform: translateX(-50%) scale(0.95); } }
        .scroll-container::-webkit-scrollbar { display: none; }
        .scroll-container { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default MWCScoreboard;
