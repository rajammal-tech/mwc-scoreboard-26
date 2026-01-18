import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, onDisconnect, serverTimestamp } from "firebase/database";

// --- CONFIGURATION ---
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
  crew: ["Ram", "Kiran", "Rajesh", "Srividya", "Smrithi", "Nagendra Prasad", "Chetan"]
};

const TEAM_ROSTERS = {
  "Team Alpha": ["Ram", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
  "Team Bravo": ["Kiran", "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20"],
  "Team Charlie": ["Chetan", "P22", "P23", "P24", "P25", "P26", "P27", "P28", "P29", "P30"],
  "Team Delta": ["Rajesh", "P32", "P33", "P34", "P35", "P36", "P37", "P38", "P39", "P40"],
};

const SCHEDULE_DATA = {
  "Feb 7th": [
    { time: "09:00 AM", type: "Singles", t1: "Alpha", t2: "Bravo" },
    { time: "10:30 AM", type: "Doubles", t1: "Charlie", t2: "Delta" },
    { time: "04:00 PM", type: "Singles", t1: "Alpha", t2: "Delta" },
    { time: "05:00 PM", type: "Doubles", t1: "Bravo", t2: "Delta" },
  ],
  "Feb 8th": [
    { time: "09:00 AM", type: "Doubles", t1: "Bravo", t2: "Delta" },
  ],
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const VIEWS = ["live", "results", "standings", "schedule", "info"];
const TEAMS = Object.keys(TEAM_ROSTERS);

const MWCScoreboard = () => {
  const [view, setView] = useState("live");
  const [infoTab, setInfoTab] = useState("rules");
  const [activeDay, setActiveDay] = useState("Feb 7th");
  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState([]);
  const [match, setMatch] = useState({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles" });
  const [viewers, setViewers] = useState(1);

  const theme = { bg: "#000", card: "#111", accent: "#adff2f", text: "#FFF" };

  useEffect(() => {
    onValue(ref(db, "live/"), (snap) => snap.val() && setMatch(snap.val()));
    onValue(ref(db, "history/"), (snap) => {
      if (snap.val()) {
        const raw = snap.val();
        setHistory(Object.keys(raw).map(k => ({ id: k, ...raw[k] })).sort((a, b) => b.mNo - a.mNo));
      } else setHistory([]);
    });
    onValue(ref(db, "presence/"), (snap) => setViewers(snap.exists() ? Object.keys(snap.val()).length : 1));
  }, []);

  const sync = (d) => { setMatch(d); if (isAdmin) set(ref(db, "live/"), d); };

  const standings = useMemo(() => {
    const stats = TEAMS.reduce((acc, t) => { acc[t] = { played: 0, won: 0 }; return acc; }, {});
    history.forEach((m) => {
      if (stats[m.t1]) stats[m.t1].played += 1;
      if (stats[m.t2]) stats[m.t2].played += 1;
      if (Number(m.s1) > Number(m.s2)) { if (stats[m.t1]) stats[m.t1].won += 1; }
      else if (Number(m.s2) > Number(m.s1)) { if (stats[m.t2]) stats[m.t2].won += 1; }
    });
    return Object.entries(stats).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.won - a.won);
  }, [history]);

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", paddingBottom: "110px", fontFamily: "sans-serif" }}>
      
      <header style={{ padding: "15px", borderBottom: "1px solid #222", textAlign: "center" }}>
        <h1 style={{ color: theme.accent, margin: 0, fontSize: "20px", fontWeight: "900" }}>MWC OPEN'26</h1>
        <div style={{ fontSize: "10px", fontWeight: "700" }}>8th Edition • {viewers} LIVE</div>
        <button onClick={() => {const p = window.prompt("PIN:"); if(p==="121212") setIsAdmin(!isAdmin)}} style={{ marginTop: "10px", padding: "5px 15px", borderRadius: "20px", background: isAdmin ? theme.accent : "#222", color: isAdmin ? "#000" : "#FFF", border: "none", fontSize: "10px" }}>{isAdmin ? "LOGOUT" : "UMPIRE"}</button>
      </header>

      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "10px" }}>
        {view === "live" && (
           <div className="fade-in">
             {[1, 2].map(n => (
               <div key={n} style={{ backgroundColor: theme.card, padding: "20px", borderRadius: "15px", margin: "10px 0", border: "1px solid #222", textAlign: "center" }}>
                 <p style={{ color: theme.accent, fontSize: "10px", fontWeight: "900", margin: "0 0 10px 0" }}>TEAM {n}</p>
                 {isAdmin ? (
                   <select value={match[`t${n}`]} onChange={(e) => sync({...match, [`t${n}`]: e.target.value})} style={{ background: "#000", color: "#FFF", padding: "10px", width: "100%" }}><option value="">Select Team</option>{TEAMS.map(t => <option key={t}>{t}</option>)}</select>
                 ) : (
                   <h2 style={{ fontSize: "28px", margin: 0 }}>{match[`t${n}`] || `---`}</h2>
                 )}
                 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "15px" }}>
                   {isAdmin && <button onClick={() => sync({...match, [`s${n}`]: Math.max(0, match[`s${n}`]-1)})} style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#222", color: "red", border: "none", fontSize: "20px" }}>-</button>}
                   <span style={{ fontSize: "80px", fontWeight: "900", margin: "0 25px" }}>{match[`s${n}`] || 0}</span>
                   {isAdmin && <button onClick={() => sync({...match, [`s${n}`]: (match[`s${n}`] || 0) + 1})} style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#222", color: theme.accent, border: "none", fontSize: "20px" }}>+</button>}
                 </div>
               </div>
             ))}
             {isAdmin && match.t1 && <button onClick={() => {
                push(ref(db, "history/"), { mNo: Date.now(), t1: match.t1, t2: match.t2, players: "Match", s1: match.s1, s2: match.s2, time: new Date().toLocaleTimeString() });
                sync({ t1: "", t2: "", s1: 0, s2: 0, mType: "Singles" });
             }} style={{ width: "100%", padding: "15px", background: theme.accent, color: "#000", fontWeight: "900", borderRadius: "10px", marginTop: "10px", border: "none" }}>FINALIZE MATCH</button>}
           </div>
        )}

        {view === "results" && (
          <div className="fade-in">
            {history.map(h => (
              <div key={h.id} style={{ background: theme.card, padding: "15px", borderRadius: "10px", marginBottom: "10px", display: "flex", justifyContent: "space-between", border: "1px solid #222" }}>
                <div><div style={{ fontWeight: "bold" }}>{h.t1} vs {h.t2}</div><div style={{ fontSize: "10px", opacity: 0.5 }}>{h.time}</div></div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: theme.accent }}>{h.s1} - {h.s2}</div>
              </div>
            ))}
          </div>
        )}

        {view === "standings" && (
          <div className="fade-in" style={{ background: theme.card, borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", textAlign: "left" }}>
              <thead style={{ background: "#222" }}><tr><th style={{ padding: "10px" }}>TEAM</th><th style={{ padding: "10px" }}>WINS</th></tr></thead>
              <tbody>{standings.map(t => (<tr key={t.name} style={{ borderBottom: "1px solid #222" }}><td style={{ padding: "10px" }}>{t.name}</td><td style={{ padding: "10px", fontWeight: "bold", color: theme.accent }}>{t.won}</td></tr>))}</tbody>
            </table>
          </div>
        )}

        {view === "schedule" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
               {Object.keys(SCHEDULE_DATA).map(day => (
                 <button key={day} onClick={() => setActiveDay(day)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: activeDay === day ? theme.accent : "#222", color: activeDay === day ? "#000" : "#FFF", fontWeight: "bold" }}>{day.toUpperCase()}</button>
               ))}
            </div>
            {SCHEDULE_DATA[activeDay].map((m, i) => (
              <div key={i} style={{ background: theme.card, padding: "15px", borderRadius: "12px", marginBottom: "10px", border: "1px solid #222" }}>
                <div style={{ color: theme.accent, fontSize: "10px", fontWeight: "900" }}>{m.time} • {m.type.toUpperCase()}</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", marginTop: "5px" }}>{m.t1} vs {m.t2}</div>
              </div>
            ))}
          </div>
        )}

        {view === "info" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
              {["rules", "teams", "sponsors", "credits"].map(t => (
                <button key={t} onClick={() => setInfoTab(t)} style={{ flex: 1, padding: "10px", fontSize: "10px", background: infoTab === t ? theme.accent : "#222", color: infoTab === t ? "#000" : "#FFF", border: "none", borderRadius: "5px" }}>{t.toUpperCase()}</button>
              ))}
            </div>
            {infoTab === "rules" && <div style={{ background: theme.card, padding: "15px", borderRadius: "10px" }}><ul style={{ lineHeight: "2" }}><li>Best of 3 sets to 21.</li><li>Golden Point at 20-all.</li><li>1 Point per match win.</li></ul></div>}
            {infoTab === "teams" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>{Object.entries(TEAM_ROSTERS).map(([n, r]) => (<div key={n} style={{ background: theme.card, padding: "10px", borderRadius: "8px", border: "1px solid #333" }}><div style={{ color: theme.accent, fontWeight: "bold", fontSize: "10px", marginBottom: "5px" }}>{n}</div>{r.map(p => <div key={p} style={{ fontSize: "12px", opacity: 0.8 }}>{p}</div>)}</div>))}</div>}
            {infoTab === "sponsors" && <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>{SPONSORS.map((s, i) => (<div key={i} style={{ background: theme.card, padding: "15px", borderRadius: "10px", textAlign: "center" }}><div style={{ color: theme.accent, fontSize: "10px" }}>{s.label}</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{s.name}</div></div>))}</div>}
            {infoTab === "credits" && (
              <div style={{ background: theme.card, padding: "20px", borderRadius: "10px", textAlign: "center" }}>
                <div style={{ color: theme.accent, fontSize: "10px", fontWeight: "bold", marginBottom: "5px" }}>CHAIR UMPIRE</div>
                <div style={{ fontSize: "20px", fontWeight: "900", marginBottom: "15px" }}>{COMMUNITY_TEAM.chairUmpire}</div>
                <div style={{ color: theme.accent, fontSize: "10px", fontWeight: "bold", marginBottom: "10px" }}>CREW</div>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px" }}>{COMMUNITY_TEAM.crew.map(c => <span key={c} style={{ background: "#222", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", border: "1px solid #333" }}>{c}</span>)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", display: "flex", background: "rgba(0,0,0,0.95)", borderTop: "1px solid #222", padding: "15px 0 35px", zIndex: 100 }}>
        {VIEWS.map(v => <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#555", fontSize: "10px", fontWeight: "bold" }}>{v.toUpperCase()}</button>)}
      </nav>

      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default MWCScoreboard;
