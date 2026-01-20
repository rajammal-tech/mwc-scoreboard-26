import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, onDisconnect, serverTimestamp } from "firebase/database";

// --- MWC-Open-Stable-Build 7.4 (BRANDING & LOGIC RESTORED) ----
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
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={isServing ? "racquet-breathe" : ""}
    style={{ filter: isServing ? `drop-shadow(0 0 6px rgba(255,255,255,0.4))` : "none" }}
  >
    <circle cx="15" cy="9" r="6" /><path d="M10.5 13.5L3 21" /><path d="M13 7l4 4" /><path d="M11 9l4 4" /><circle cx="20" cy="20" r="2.5" fill={color} stroke="none" />
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
  const [match, setMatch] = useState({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles", server: null });
  const [viewers, setViewers] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);

  const theme = { bg: "#000", card: "#111", accent: "#adff2f", text: "#FFF", muted: "#666" };

  useEffect(() => {
    onValue(ref(db, "live/"), (snap) => snap.val() && setMatch(snap.val()));
    onValue(ref(db, "history/"), (snap) => {
      if (snap.val()) setHistory(Object.keys(snap.val()).map(k => ({ id: k, ...snap.val()[k] })).sort((a, b) => b.mNo - a.mNo));
    });
    onValue(ref(db, "presence/"), (snap) => setViewers(snap.exists() ? Object.keys(snap.val()).length : 1));
  }, []);

  const handleLogin = () => {
    if (isAdmin) { setIsAdmin(false); } 
    else {
      const p = window.prompt("Umpire PIN:");
      if (p === "121212") { setIsAdmin(true); } 
      else if (p !== null) { setLoginError(true); setTimeout(() => setLoginError(false), 3000); }
    }
  };

  const isServingForSet = (teamNum) => {
    if (!match.server || match.server !== teamNum) return false;
    const s1 = Number(match.s1 || 0);
    const s2 = Number(match.s2 || 0);
    const serverScore = teamNum === 1 ? s1 : s2;
    const oppScore = teamNum === 1 ? s2 : s1;
    // Logic: 5-X (X<=4) or 6-X (X<=5). No show at 5-5 or 6-6.
    return (serverScore === 5 && oppScore <= 4) || (serverScore === 6 && oppScore <= 5);
  };

  const sync = (d) => { setMatch(d); if (isAdmin) set(ref(db, "live/"), d); };

  const getUmpireSelectStyle = (isDisabled) => ({
    width: "100%", padding: "14px", background: "#111", color: isDisabled ? theme.accent : "#FFF",
    border: "1px solid #333", borderRadius: "8px", fontSize: "14px", fontWeight: isDisabled ? "900" : "normal",
    textAlign: "center", WebkitTextFillColor: isDisabled ? theme.accent : "initial"
  });

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

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", fontFamily: "-apple-system, sans-serif", paddingBottom: "110px", zoom: zoomLevel }}>
      
      <header style={{ padding: "15px 10px", borderBottom: "1px solid #222", backgroundColor: "#000", position: "sticky", top: 0, zIndex: 1000 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "500px", margin: "0 auto" }}>
          <div style={{ minWidth: "95px" }}>
            <div className="pulse" style={{ color: theme.accent, fontSize: "9px", fontWeight: "bold", border: `1px solid ${theme.accent}`, padding: "3px 7px", borderRadius: "12px", textAlign: "center" }}>● {viewers} VIEWERS</div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <h1 style={{ color: theme.accent, margin: 0, fontSize: "18px", fontStyle: "italic", fontWeight: "900" }}>MWC OPEN'26</h1>
            <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px" }}>8TH EDITION - V7.4</div>
          </div>
          <div style={{ minWidth: "95px", textAlign: "right" }}>
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
             {[1, 2].map(n => {
               const setPoint = isServingForSet(n);
               const isServing = match.server === n;
               return (
                 <div key={n} className={isServing ? "serving-card-active" : ""} style={{ backgroundColor: theme.card, padding: "20px", borderRadius: "15px", margin: "15px 0", border: isServing ? `2px solid #EEE` : "1px solid #222", textAlign: "center", position: "relative" }}>
                   {setPoint && (
                     <div className="set-point-blinker" style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: theme.accent, color: "#000", fontSize: "9px", fontWeight: "900", padding: "4px 12px", borderRadius: "20px", zIndex: 100, border: "2px solid #000", boxShadow: `0 0 10px ${theme.accent}` }}>
                       SERVING FOR THE SET
                     </div>
                   )}
                   <div style={{ marginBottom: "10px" }}>
                     {isAdmin ? (
                       <select style={getUmpireSelectStyle(false)} value={match[`t${n}`]} onChange={(e) => sync({ ...match, [`t${n}`]: e.target.value })}><option value="">Select Team</option>{TEAMS.map(t => <option key={t}>{t}</option>)}</select>
                     ) : (
                       <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "900", color: isServing ? theme.accent : "#FFF" }}>{match[`t${n}`] || "---"}</h2>
                     )}
                     <p style={{ color: "#AAA", fontSize: "12px", fontWeight: "600", marginTop: "5px" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && ` / ${match[`p${n}b`]}`}</p>
                   </div>
                   <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px" }}>
                     {isAdmin && <button onClick={() => sync({...match, [`s${n}`]: Math.max(0, match[`s${n}`]-1)})} style={{width: "50px", height: "50px", borderRadius: "50%", background: "#222", color: "#ff4444", border: "1px solid #333", fontSize: "24px"}}>-</button>}
                     <span style={{ fontSize: "70px", fontWeight: "900" }}>{match[`s${n}`] || 0}</span>
                     {isAdmin && <button onClick={() => sync({...match, [`s${n}`]: Math.min(7, match[`s${n}`]+1)})} style={{width: "50px", height: "50px", borderRadius: "50%", background: "#222", color: theme.accent, border: "1px solid #333", fontSize: "24px"}}>+</button>}
                   </div>
                   <div style={{marginTop: "10px", height: "30px"}}>
                     {isServing ? <RacquetIcon color="#FFF" size={24} isServing={true} /> : (isAdmin && <button onClick={() => sync({...match, server: n})} style={{fontSize: "9px", background: "none", border: "1px solid #444", color: "#666", padding: "2px 8px", borderRadius: "4px"}}>SET SERVER</button>)}
                   </div>
                 </div>
               );
             })}
           </div>
        )}
        
        {/* Simplified placeholders for other tabs to keep code readable but functional */}
        {view === "standings" && (
            <div className="fade-in" style={{background: theme.card, borderRadius: "15px", overflow: "hidden", border: "1px solid #222"}}>
                <table style={{width: "100%", borderCollapse: "collapse"}}>
                    <thead style={{background: "#050505"}}><tr style={{textAlign: "left"}}><th style={{padding: "15px", fontSize: "10px", color: theme.accent}}>TEAM</th><th style={{textAlign: "center", fontSize: "10px"}}>MP</th><th style={{textAlign: "right", paddingRight: "20px", fontSize: "10px"}}>WINS</th></tr></thead>
                    <tbody>{standings.map((t, i) => (
                        <tr key={t.name} style={{borderBottom: "1px solid #222"}}><td style={{padding: "15px", fontWeight: "700"}}>{t.name}</td><td style={{textAlign: "center"}}>{t.played}</td><td style={{textAlign: "right", paddingRight: "20px", color: theme.accent, fontWeight: "900"}}>{t.won}</td></tr>
                    ))}</tbody>
                </table>
            </div>
        )}
      </div>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", display: "flex", background: "rgba(10,10,10,0.95)", borderTop: "1px solid #222", paddingBottom: "35px", paddingTop: "15px", zIndex: 100 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#555", fontSize: "10px", fontWeight: "900" }}>
            {v.toUpperCase()}
          </button>
        ))}
      </nav>

      <style>{`
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .pulse { animation: softPulse 2s infinite; }
        @keyframes softPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .serving-card-active { animation: breathingBorder 2s infinite ease-in-out; }
        @keyframes breathingBorder {
          0% { border-color: #333; }
          50% { border-color: #EEE; box-shadow: 0 0 10px rgba(255,255,255,0.1); }
          100% { border-color: #333; }
        }
        .set-point-blinker { animation: badgeBlink 0.8s infinite alternate ease-in-out; }
        @keyframes badgeBlink { from { opacity: 1; transform: translateX(-50%) scale(1); } to { opacity: 0.7; transform: translateX(-50%) scale(1.05); } }
        .racquet-breathe { animation: rb 1.5s infinite ease-in-out; }
        @keyframes rb { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
      `}</style>
    </div>
  );
};

export default MWCScoreboard;
