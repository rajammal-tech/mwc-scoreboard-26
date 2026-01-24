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

const TennisBallIcon = ({ color, size = 28 }) => (
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
      all.forEach(p => { stats[p].mp += 1; });
      if (Number(m.s1) > Number(m.s2)) t1p.forEach(p => stats[p].mw += 1);
      else if (Number(m.s2) > Number(m.s1)) t2p.forEach(p => stats[p].mw += 1);
    });
    const sorted = Object.values(stats).sort((a, b) => b.mw - a.mw);
    return { sorted };
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
    textAlign: "center",
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
           overflow: "hidden", // Prevents horizontal overflow on iOS
           boxSizing: "border-box"
         }}>
      
      {/* HEADER & TICKER */}
      <div style={{ flexShrink: 0, zIndex: 1000, background: "#000", width: "100%" }}>
        <header style={{ padding: "15px 10px", borderBottom: "1px solid #222" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "500px", margin: "0 auto", width: "100%" }}>
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
          <div className="banner-ticker" style={{ display: "inline-block", paddingLeft: "100%", animation: "ticker 25s linear infinite" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#f0f0f0", letterSpacing: "0.5px" }}>
              {bannerText} &nbsp;&nbsp; — &nbsp;&nbsp; {bannerText}
            </span>
          </div>
        </div>
      </div>

      {/* UNIVERSAL SCROLLABLE CONTENT (Applies to all tabs) */}
      <div className="scroll-container" style={{ 
        flexGrow: 1, 
        overflowY: "auto", 
        WebkitOverflowScrolling: "touch",
        width: "100%",
        maxWidth: "500px",
        margin: "0 auto",
        padding: "15px",
        paddingBottom: "130px",
        boxSizing: "border-box",
        touchAction: "pan-y"
      }}>
        {view === "live" && (
           <div className="fade-in">
             {!isAdmin && <div style={{ textAlign: "center", marginBottom: "15px", fontSize: "12px", fontWeight: "900", color: theme.accent, letterSpacing: "2px", textTransform: "uppercase" }}>{(match.mType || "Singles")} MATCH</div>}
             {isAdmin && <select disabled={isMatchInProgress} style={{ ...getUmpireSelectStyle(isMatchInProgress), marginBottom: "15px" }} value={match.mType} onChange={(e) => sync({ ...match, mType: e.target.value })}><option value="Singles">Singles</option><option value="Doubles">Doubles</option></select>}
             {[1, 2].map(n => (
                 <div key={n} className={match.server === n ? "serving-card-active" : ""} style={{ backgroundColor: theme.card, padding: "20px", borderRadius: "15px", margin: "15px 0", border: match.server === n ? `2px solid #EEE` : "1px solid #222", textAlign: "center", position: "relative" }}>
                   {isServingForSet(n) && <div className="set-point-blinker" style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: theme.accent, color: "#000", fontSize: "9px", fontWeight: "900", padding: "4px 12px", borderRadius: "20px", zIndex: 100, border: "2px solid #000" }}>SERVING FOR THE SET</div>}
                   <div style={{ position: "absolute", bottom: "12px", left: "12px" }}>
                      {isAdmin && !match.server && match.t1 && match.t2 ? (
                        <button disabled={!arePlayersSelected} onClick={() => sync({ ...match, server: n })} style={{ background: "transparent", border: `1px solid #FFF`, color: "#FFF", fontSize: "9px", padding: "4px 8px", borderRadius: "4px", fontWeight: "900" }}>SERVER</button>
                      ) : (match.server === n && <RacquetIcon color="#FFF" size={28} isServing={true} />)}
                   </div>
                   {isAdmin && !isMatchInProgress ? (
                     <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                       <select style={getUmpireSelectStyle(false)} value={match[`t${n}`]} onChange={(e) => sync({ ...match, [`t${n}`]: e.target.value, [`p${n}a`]: "", [`p${n}b`]: "", server: null })}><option value="">Select Team</option>{TEAMS.map(t => <option key={t} disabled={n === 1 ? match.t2 === t : match.t1 === t}>{t}</option>)}</select>
                       <div style={{ display: "flex", justifyContent: "center", gap: "5px" }}>
                          <select style={getUmpireSelectStyle(false, match.mType === "Doubles")} value={match[`p${n}a`]} onChange={(e) => sync({ ...match, [`p${n}a`]: e.target.value })}><option value="">P1</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p} disabled={isPlayerUsed(p, `p${n}a`)}>{p}</option>)}</select>
                          {match.mType === "Doubles" && <select style={getUmpireSelectStyle(false, true)} value={match[`p${n}b`]} onChange={(e) => sync({ ...match, [`p${n}b`]: e.target.value })}><option value="">P2</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p} disabled={isPlayerUsed(p, `p${n}b`)}>{p}</option>)}</select>}
                       </div>
                     </div>
                   ) : (
                     <div>
                       <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "900" }}>{match[`t${n}`] || "---"}</h2>
                       <p style={{ color: "#AAA", fontSize: "16px", fontWeight: "700" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && ` / ${match[`p${n}b`]}`}</p>
                     </div>
                   )}
                   <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                     {isAdmin && <button onClick={() => handleScoreReduce(n)} style={{ width: "55px", height: "55px", borderRadius: "50%", background: "#222", color: "#ff4444", fontSize: "24px", border: "1px solid #333" }}>-</button>}
                     <span style={{ fontSize: "65px", fontWeight: "900", margin: "0 20px" }}>{match[`s${n}`] || 0}</span>
                     {isAdmin && <button onClick={() => handleScoreUpdate(n, (match[`s${n}`] || 0) + 1)} style={{ width: "55px", height: "55px", borderRadius: "50%", background: "#222", color: theme.accent, fontSize: "24px", border: "1px solid #333" }}>+</button>}
                   </div>
                 </div>
               ))}
           </div>
        )}

        {view === "info" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: "6px", marginBottom: "15px", overflowX: "auto" }}>
              {["rules", "teams", "crew", "sponsors", ...(isAdmin ? ["banner"] : [])].map(tab => (
                <button key={tab} onClick={() => setInfoTab(tab)} style={{ flex: "1 0 auto", padding: "12px", background: infoTab === tab ? theme.accent : "#111", color: infoTab === tab ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900", fontSize: "11px" }}>{tab.toUpperCase()}</button>
              ))}
            </div>
            {infoTab === "rules" && (
              <div style={{ padding: "20px", background: theme.card, borderRadius: "15px", border: "1px solid #333" }}>
                 <ul style={{ color: "#EEE", lineHeight: "2.2", fontSize: "15px", paddingLeft: "20px" }}>
                  <li>All matches are of 1 full set (6 Games)</li>
                  <li>Sudden Death at Deuce (Receiver Chooses Side)</li>
                  <li>7-point Tie-breaker in case of 6-6</li>
                 </ul>
              </div>
            )}
            {infoTab === "teams" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {Object.entries(TEAM_ROSTERS).map(([t, ps]) => (
                    <div key={t} style={{ background: theme.card, padding: "15px", borderRadius: "12px", border: "1px solid #222" }}>
                       <h4 style={{ margin: "0 0 10px 0", color: theme.accent, fontSize: "12px" }}>{t.toUpperCase()}</h4>
                       {ps.map((p, i) => <div key={i} style={{ fontSize: "13px", color: "#DDD", marginBottom: "4px" }}>{p}</div>)}
                    </div>
                  ))}
                </div>
            )}
            {infoTab === "crew" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {COMMUNITY_TEAM.crew.map((name, i) => (
                  <div key={i} style={{ background: theme.card, padding: "15px", borderRadius: "10px", fontSize: "14px", textAlign: "center", border: "1px solid #222" }}>{name}</div>
                ))}
              </div>
            )}
            {infoTab === "sponsors" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {SPONSORS.map((s, i) => (
                  <div key={i} style={{ background: theme.card, padding: "20px", borderRadius: "12px", border: "1px solid #222", textAlign: "center" }}>
                    <div style={{ color: theme.accent, fontSize: "11px", fontWeight: "900", marginBottom: "5px" }}>{s.label}</div>
                    <div style={{ fontSize: "16px" }}>{s.name}</div>
                  </div>
                ))}
              </div>
            )}
            {infoTab === "banner" && isAdmin && (
               <div style={{ padding: "20px", background: theme.card, borderRadius: "15px", border: `1px solid ${theme.accent}` }}>
                 <textarea rows="3" value={bannerText} onChange={(e) => updateBanner(e.target.value)} style={{ width: "100%", background: "#000", color: "#FFF", border: "1px solid #333", padding: "12px", borderRadius: "8px", fontSize: "14px" }} />
               </div>
            )}
          </div>
        )}

        {view === "standings" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <button onClick={() => setInfoTab("team_std")} style={{ flex: 1, padding: "14px", background: infoTab !== "player_std" ? theme.accent : "#111", color: infoTab !== "player_std" ? "#000" : "#FFF", border: "none", borderRadius: "12px", fontWeight: "900" }}>TEAMS</button>
              <button onClick={() => setInfoTab("player_std")} style={{ flex: 1, padding: "14px", background: infoTab === "player_std" ? theme.accent : "#111", color: infoTab === "player_std" ? "#000" : "#FFF", border: "none", borderRadius: "12px", fontWeight: "900" }}>PLAYERS</button>
            </div>
            <div style={{ background: theme.card, borderRadius: "15px", border: "1px solid #222", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#050505" }}><tr><th style={{ padding: "15px", textAlign: "left", color: theme.accent, fontSize: "11px" }}>RANK & NAME</th><th style={{ textAlign: "right", paddingRight: "20px", color: theme.accent, fontSize: "11px" }}>WINS</th></tr></thead>
                <tbody>
                  {(infoTab === "player_std" ? playerStats.sorted : standings).map((item, i) => (
                    <tr key={item.name} style={{ borderBottom: "1px solid #222" }}>
                      <td style={{ padding: "15px" }}><span style={{ color: theme.accent, fontWeight: "900", marginRight: "10px" }}>#{i+1}</span>{item.name}</td>
                      <td style={{ textAlign: "right", paddingRight: "20px", fontWeight: "900", fontSize: "18px" }}>{item.mw || item.won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "schedule" && (
           <div className="fade-in">
             <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
               {Object.keys(SCHEDULE_DATA).map(d => (
                 <button key={d} onClick={() => setActiveDay(d)} style={{ flex: 1, padding: "14px", background: activeDay === d ? theme.accent : "#111", color: activeDay === d ? "#000" : "#FFF", border: "none", borderRadius: "12px", fontWeight: "900" }}>{d.toUpperCase()}</button>
               ))}
             </div>
             {SCHEDULE_DATA[activeDay].map((m, i) => (
               <div key={i} style={{ background: theme.card, padding: "20px", borderRadius: "15px", marginBottom: "10px", border: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
                 <div style={{ color: theme.accent, fontWeight: "900" }}>{m.time}</div>
                 <div style={{ textAlign: "right" }}><div style={{ fontWeight: "800" }}>{m.t1} vs {m.t2}</div><div style={{ fontSize: "11px", opacity: 0.6 }}>{m.type}</div></div>
               </div>
             ))}
           </div>
        )}
        
        {view === "results" && (
           <div className="fade-in">
             {history.map(h => (
               <div key={h.id} style={{ background: theme.card, padding: "18px", borderRadius: "12px", marginBottom: "10px", border: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <div>
                   <div style={{ fontWeight: "800", fontSize: "14px" }}>{h.t1} vs {h.t2}</div>
                   <div style={{ fontSize: "11px", color: "#888" }}>{h.players}</div>
                 </div>
                 <div style={{ color: theme.accent, fontWeight: "900", fontSize: "20px" }}>{h.s1}-{h.s2}</div>
               </div>
             ))}
           </div>
        )}
      </div>

      {/* BIGGER NAVIGATION */}
      <nav style={{ 
        flexShrink: 0, 
        display: "flex", 
        background: "rgba(10,10,10,0.98)", 
        backdropFilter: "blur(20px)", 
        borderTop: "1px solid #222", 
        paddingBottom: "calc(25px + env(safe-area-inset-bottom))", 
        paddingTop: "15px", 
        zIndex: 1000,
        width: "100%"
      }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#666", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ height: "30px", marginBottom: "8px" }}>
              {v === "live" ? <TennisBallIcon color={view === v ? theme.accent : "#666"} size={28} /> : 
               v === "results" ? "📊" : v === "standings" ? "🏆" : v === "schedule" ? "📅" : "📋"}
            </div>
            <span style={{ fontSize: "11px", fontWeight: "900", letterSpacing: "0.5px" }}>{v.toUpperCase()}</span>
          </button>
        ))}
      </nav>

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; padding: 0; overflow: hidden; position: fixed; width: 100%; height: 100%; background: #000; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        .pulse { animation: softPulse 2s infinite; }
        @keyframes softPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .serving-card-active { animation: breathingBorder 2s infinite ease-in-out; }
        @keyframes breathingBorder { 0%, 100% { border-color: #333; } 50% { border-color: #EEE; } }
        .set-point-blinker { animation: blink 0.8s infinite alternate; }
        @keyframes blink { from { opacity: 1; } to { opacity: 0.6; } }
        .scroll-container::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default MWCScoreboard;
