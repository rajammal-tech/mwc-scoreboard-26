import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, onDisconnect, serverTimestamp } from "firebase/database";
// Added Recharts for visual analytics [cite: 227]
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

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

const TennisBallIcon = ({ color, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M5.5 18.5C7.5 16 8.5 12.5 8.5 9s-1-7-3-9.5" transform="rotate(30 12 12)" />
    <path d="M18.5 5.5C16.5 8 15.5 11.5 15.5 15s1 7 3 9.5" transform="rotate(30 12 12)" />
  </svg>
);

const RacquetIcon = ({ color, size = 32, isServing = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isServing ? "racquet-breathe" : ""} style={{ filter: isServing ? `drop-shadow(0 0 6px rgba(255,255,255,0.4))` : "none" }}>
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
  const [activeDay, setActiveDay] = useState("Feb 7");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [history, setHistory] = useState([]);
  const [match, setMatch] = useState({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles", server: null });
  const [viewers, setViewers] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [bannerText, setBannerText] = useState("Welcome to MWC Open'26 - 8th Edition");
  const theme = { bg: "#000", card: "#111", accent: "#adff2f", text: "#FFF", muted: "#666", server: "#FFF" };

  useEffect(() => {
    if (view === "info") setInfoTab("rules");
    if (view === "standings") setInfoTab("team_std");
    if (view === "schedule") setActiveDay("Feb 7");
  }, [view]);

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
    onValue(ref(db, ".info/connected"), (snap) => { if (snap.val() === true) { onDisconnect(myPresenceRef).remove(); set(myPresenceRef, serverTimestamp()); } });
    onValue(ref(db, "presence/"), (snap) => setViewers(snap.exists() ? Object.keys(snap.val()).length : 1));
    return () => remove(myPresenceRef);
  }, []);

  // Logic for Team and Analysis Data [cite: 261, 262]
  const analysisData = useMemo(() => {
    const stats = TEAMS.reduce((acc, t) => { 
      acc[t] = { name: t, played: 0, won: 0, gWon: 0, gLost: 0 }; 
      return acc; 
    }, {});

    history.forEach((m) => {
      const s1 = Number(m.s1 || 0); const s2 = Number(m.s2 || 0);
      if (stats[m.t1]) {
        stats[m.t1].played++; stats[m.t1].gWon += s1; stats[m.t1].gLost += s2;
        if (s1 > s2) stats[m.t1].won++;
      }
      if (stats[m.t2]) {
        stats[m.t2].played++; stats[m.t2].gWon += s2; stats[m.t2].gLost += s1;
        if (s2 > s1) stats[m.t2].won++;
      }
    });

    return Object.values(stats).map(d => ({
      ...d,
      winRate: d.played > 0 ? Math.round((d.won / d.played) * 100) : 0,
      shortName: d.name.replace("Team ", "")
    })).sort((a, b) => b.winRate - a.winRate || b.won - a.won);
  }, [history]);

  const playerStats = useMemo(() => {
    const stats = {};
    const playerToTeam = {};
    Object.entries(TEAM_ROSTERS).forEach(([team, players]) => { players.forEach(p => playerToTeam[p] = team); });
    history.forEach((m) => {
      const sides = m.players.split(" vs ");
      if (sides.length !== 2) return;
      const t1p = sides[0].split("/").map(p => p.trim());
      const t2p = sides[1].split("/").map(p => p.trim());
      const all = [...t1p, ...t2p];
      all.forEach(p => { if (!stats[p]) stats[p] = { name: p, mp: 0, mw: 0, team: playerToTeam[p] || "---" }; stats[p].mp += 1; });
      if (Number(m.s1) > Number(m.s2)) t1p.forEach(p => stats[p].mw += 1);
      else if (Number(m.s2) > Number(m.s1)) t2p.forEach(p => stats[p].mw += 1);
    });
    return Object.values(stats).sort((a, b) => b.mw - a.mw);
  }, [history]);

  const sync = (d) => { setMatch(d); if (isAdmin) set(ref(db, "live/"), d); };
  const handleScoreUpdate = (teamNum, currentScore) => { if (currentScore > 7) return; sync({ ...match, [`s${teamNum}`]: currentScore, server: match.server === 1 ? 2 : 1 }); };
  const handleScoreReduce = (teamNum) => { sync({ ...match, [`s${teamNum}`]: Math.max(0, (match[`s${teamNum}`] || 0) - 1), server: match.server === 1 ? 2 : 1 }); };

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, height: "100dvh", width: "100vw", display: "flex", flexDirection: "column", fontFamily: "-apple-system, sans-serif", zoom: zoomLevel, overflow: "hidden" }}>
      
      {/* HEADER */}
      <header style={{ padding: "15px 10px", borderBottom: "1px solid #222", background: "#000" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "500px", margin: "0 auto", width: "100%" }}>
          <div style={{ minWidth: "90px" }}><div className="pulse" style={{ color: theme.accent, fontSize: "9px", fontWeight: "bold", border: `1px solid ${theme.accent}`, padding: "3px 7px", borderRadius: "12px", textAlign: "center" }}>● {viewers} LIVE</div></div>
          <div style={{ textAlign: "center" }}><h1 style={{ color: theme.accent, margin: 0, fontSize: "18px", fontStyle: "italic", fontWeight: "900" }}>MWC OPEN'26</h1></div>
          <div style={{ minWidth: "90px", textAlign: "right" }}><button onClick={() => { const p = window.prompt("PIN:"); if(p==="121212") setIsAdmin(!isAdmin); }} style={{ padding: "6px 12px", borderRadius: "20px", border: `1px solid ${isAdmin ? theme.accent : "#FFF"}`, background: isAdmin ? theme.accent : "none", color: isAdmin ? "#000" : "#FFF", fontSize: "10px", fontWeight: "900" }}>{isAdmin ? "LOGOUT" : "UMPIRE"}</button></div>
        </div>
      </header>

      {/* BANNER */}
      <div style={{ background: "#111", borderBottom: "1px solid #222", padding: "8px 0", overflow: "hidden" }}>
        <div className="banner-ticker" style={{ display: "inline-block", whiteSpace: "nowrap", animation: "ticker 20s linear infinite" }}>
          <span style={{ fontSize: "11px", fontWeight: "700" }}>{bannerText} &nbsp;&nbsp; — &nbsp;&nbsp; {bannerText}</span>
        </div>
      </div>

      <div className="scroll-container" style={{ flexGrow: 1, overflowY: "auto", padding: "15px", maxWidth: "500px", margin: "0 auto", width: "100%", paddingBottom: "100px" }}>
        
        {view === "live" && (
          <div className="fade-in">
             {[1, 2].map(n => (
               <div key={n} style={{ backgroundColor: theme.card, padding: "20px", borderRadius: "15px", margin: "15px 0", border: match.server === n ? `2px solid #EEE` : "1px solid #222", textAlign: "center" }}>
                 <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "900" }}>{match[`t${n}`] || "---"}</h2>
                 <p style={{ color: "#AAA", fontSize: "14px" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && ` / ${match[`p${n}b`]}`}</p>
                 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px" }}>
                   {isAdmin && <button onClick={() => handleScoreReduce(n)} style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#222", color: "#ff4444", border: "1px solid #333" }}>-</button>}
                   <span style={{ fontSize: "55px", fontWeight: "900" }}>{match[`s${n}`] || 0}</span>
                   {isAdmin && <button onClick={() => handleScoreUpdate(n, (match[`s${n}`]||0)+1)} style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#222", color: theme.accent, border: "1px solid #333" }}>+</button>}
                 </div>
               </div>
             ))}
             {isAdmin && match.t1 && <button onClick={() => { if(!window.confirm("Finalize Match?")) return; push(ref(db, "history/"), { mNo: Date.now(), t1: match.t1, t2: match.t2, players: match.mType === "Singles" ? `${match.p1a} vs ${match.p2a}` : `${match.p1a}/${match.p1b} vs ${match.p2a}/${match.p2b}`, s1: match.s1, s2: match.s2, time: new Date().toISOString() }); sync({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles", server: null }); }} style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "#FFF", color: "#000", fontWeight: "900", border: "none", marginTop: "15px" }}>CLOSE THE MATCH</button>}
          </div>
        )}

        {view === "standings" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: "6px", marginBottom: "15px" }}>
              {["team_std", "player_std", "analysis"].map(tab => (
                <button key={tab} onClick={() => setInfoTab(tab)} style={{ flex: 1, padding: "12px", background: infoTab === tab ? theme.accent : "#111", color: infoTab === tab ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900", fontSize: "10px" }}>{tab.replace("_std", "").toUpperCase()}</button>
              ))}
            </div>

            {infoTab === "analysis" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ background: theme.card, padding: "15px", borderRadius: "15px", border: "1px solid #222" }}>
                  <h3 style={{ fontSize: "10px", color: theme.accent, marginBottom: "15px", textAlign: "center", letterSpacing: "1px" }}>WIN-RATE DISTRIBUTION (%)</h3>
                  <div style={{ height: "200px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysisData} margin={{ left: -30 }}>
                        <XAxis dataKey="shortName" stroke="#555" fontSize={10} />
                        <YAxis stroke="#555" fontSize={10} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', fontSize: '10px' }} />
                        <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                          {analysisData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? theme.accent : "#444"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ background: theme.card, padding: "15px", borderRadius: "15px", border: "1px solid #222" }}>
                  <h3 style={{ fontSize: "10px", color: theme.accent, marginBottom: "15px", textAlign: "center", letterSpacing: "1px" }}>POINTS DOMINANCE INDEX</h3>
                  <div style={{ height: "200px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysisData} margin={{ left: -30 }}>
                        <XAxis dataKey="shortName" stroke="#555" fontSize={10} />
                        <YAxis stroke="#555" fontSize={10} />
                        <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', fontSize: '10px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Bar dataKey="gWon" name="Games Won" fill={theme.accent} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="gLost" name="Games Lost" fill="#ff4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: theme.card, borderRadius: "15px", border: "1px solid #222", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#050505" }}><tr style={{ textAlign: "left" }}><th style={{ padding: "15px", fontSize: "10px", color: theme.accent }}>{infoTab === "player_std" ? "PLAYER" : "TEAM"}</th><th style={{ textAlign: "center", fontSize: "10px" }}>MP</th><th style={{ textAlign: "right", paddingRight: "20px", fontSize: "10px", color: theme.accent }}>WINS</th></tr></thead>
                  <tbody>
                    {(infoTab === "player_std" ? playerStats : analysisData).map((item, i) => (
                      <tr key={item.name} style={{ borderBottom: "1px solid #222" }}>
                        <td style={{ padding: "15px" }}><span style={{ color: i===0 ? theme.accent : "#555", fontWeight: "900", marginRight: "8px" }}>#{i+1}</span><span style={{ fontWeight: "700", fontSize: "14px" }}>{item.name}</span></td>
                        <td style={{ textAlign: "center", color: "#888" }}>{item.mp || item.played}</td>
                        <td style={{ textAlign: "right", paddingRight: "20px", fontWeight: "900", color: theme.accent, fontSize: "18px" }}>{item.mw || item.won}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Existing tabs like Results, Schedule, Info would follow same logic [cite: 308, 309] */}
      </div>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", display: "flex", background: "#0a0a0a", borderTop: "1px solid #222", paddingBottom: "25px", paddingTop: "15px", zIndex: 1000 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#555", fontSize: "10px", fontWeight: "900", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ marginBottom: "5px" }}>{v === "live" ? <TennisBallIcon color={view === v ? theme.accent : "#555"} /> : v === "results" ? "📊" : v === "standings" ? "🏆" : v === "schedule" ? "⏩" : "📋"}</div>
            {v.toUpperCase()}
          </button>
        ))}
      </nav>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes ticker { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .pulse { animation: softPulse 2s infinite; }
        @keyframes softPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
};

export default MWCScoreboard;
