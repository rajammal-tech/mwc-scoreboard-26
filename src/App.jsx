import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove } from "firebase/database";

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCwoLIBAh4NMlvp-r8avXucscjVA10ydw0",
  authDomain: "mwc-open---8th-edition.firebaseapp.com",
  databaseURL: "https://mwc-open---8th-edition-default-rtdb.firebaseio.com",
  projectId: "mwc-open---8th-edition",
  storageBucket: "mwc-open---8th-edition.firebasestorage.app",
  messagingSenderId: "1056583710011",
  appId: "1:1056583710011:web:998e4f73a657ef69d3b31e",
};

const TOURNAMENT_RULES = [
  "Matches are best of 3 sets to 21 points.",
  "Sudden death at 20-all (Golden point).",
  "Umpire decision is final.",
  "Teams must arrive 10 mins before start time.",
];

const TEAM_ROSTERS = {
  "Team Alpha": ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
  "Team Bravo": ["P11", "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20"],
  "Team Charlie": ["P21", "P22", "P23", "P24", "P25", "P26", "P27", "P28", "P29", "P30"],
  "Team Delta": ["P31", "P32", "P33", "P34", "P35", "P36", "P37", "P38", "P39", "P40"],
};

const SCHEDULE_DATA = {
  "Feb 7th": [
    { time: "09:00 AM", type: "Singles", t1: "Alpha", t2: "Bravo" },
    { time: "10:30 AM", type: "Doubles", t1: "Charlie", t2: "Delta" },
  ],
  "Feb 8th": [
    { time: "09:00 AM", type: "Doubles", t1: "Bravo", t2: "Delta" },
  ],
};

const TEAMS = Object.keys(TEAM_ROSTERS);
const ALL_PLAYERS = Object.values(TEAM_ROSTERS).flat();

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const MWCScoreboard = () => {
  const [view, setView] = useState("live");
  const [infoTab, setInfoTab] = useState("rules");
  const [activeDay, setActiveDay] = useState("Feb 7th");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [history, setHistory] = useState([]);
  const [match, setMatch] = useState({
    t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles",
  });

  useEffect(() => {
    onValue(ref(db, "live/"), (snap) => snap.val() && setMatch(snap.val()));
    onValue(ref(db, "history/"), (snap) => {
      if (snap.val()) {
        const rawData = snap.val();
        const data = Object.keys(rawData).map((key) => ({ id: key, ...rawData[key] }));
        setHistory(data.sort((a, b) => b.mNo - a.mNo));
      } else {
        setHistory([]);
      }
    });
  }, []);

  const sync = (data) => {
    setMatch(data);
    if (isAdmin) set(ref(db, "live/"), data);
  };

  const deleteResult = (id) => {
    if (window.confirm("Delete this match result forever?")) {
      remove(ref(db, `history/${id}`));
    }
  };

  const handleLogin = () => {
    if (isAdmin) return setIsAdmin(false);
    const input = window.prompt("Enter Umpire PIN:");
    if (input === "121212") {
      setIsAdmin(true);
      setPinError(false);
    } else if (input !== null) {
      setPinError(true);
      setTimeout(() => setPinError(false), 3000);
    }
  };

  const archiveMatch = () => {
    if (!match.t1 || !match.t2) return alert("Select teams first!");
    const playersLine = match.mType === "Singles" ? `${match.p1a} vs ${match.p2a}` : `${match.p1a}/${match.p1b} vs ${match.p2a}/${match.p2b}`;
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;

    const summary = { mNo: history.length + 1, t1: match.t1, t2: match.t2, mType: match.mType, players: playersLine, s1: match.s1, s2: match.s2, time: timestamp };
    push(ref(db, "history/"), summary);
    sync({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles" });
  };

  const theme = { 
    bg: "#000", 
    card: "#111", 
    accent: "#adff2f", 
    text: "#FFFFFF", // Bright white for standard text
    muted: "#888888", // Better visibility for secondary text
    danger: "#ff4444" 
  };

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", fontFamily: "sans-serif", paddingBottom: "160px" }}>
      {/* HEADER */}
      <header style={{ padding: "25px 20px", textAlign: "center", borderBottom: `1px solid #333`, position: "relative" }}>
        <h1 style={{ color: theme.accent, margin: 0, fontSize: "24px", fontWeight: "900", fontStyle: "italic" }}>MWC OPEN'26</h1>
        <button onClick={handleLogin} style={{ position: "absolute", right: "15px", top: "28px", padding: "8px 16px", borderRadius: "20px", border: `1px solid ${isAdmin ? theme.accent : "#FFF"}`, backgroundColor: isAdmin ? theme.accent : "transparent", color: isAdmin ? "#000" : "#FFF", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
          {isAdmin ? "UMPIRE MODE" : "LOGIN"}
        </button>
      </header>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        
        {/* LIVE VIEW */}
        {view === "live" && (
          <div style={{ padding: "10px" }}>
            {isAdmin && (
              <div style={{ backgroundColor: theme.card, padding: "15px", borderRadius: "15px", marginBottom: "10px", border: `1px solid ${theme.accent}33`, textAlign: "center" }}>
                <select style={{ width: "100%", padding: "12px", background: "#000", color: theme.accent, border: "1px solid #333", borderRadius: "8px" }} value={match.mType} onChange={(e) => sync({ ...match, mType: e.target.value })}>
                  <option value="Singles">Singles</option>
                  <option value="Doubles">Doubles</option>
                </select>
              </div>
            )}

            {[1, 2].map((n) => (
              <div key={n} style={{ backgroundColor: theme.card, padding: "20px", borderRadius: "20px", margin: "10px 0", border: "1px solid #222", textAlign: "center" }}>
                <p style={{ color: theme.accent, fontSize: "11px", fontWeight: "900", letterSpacing: "2px", marginBottom: "10px" }}>TEAM {n}</p>
                {isAdmin ? (
                  <div style={{ marginBottom: "15px" }}>
                    <select style={{ width: "100%", padding: "10px", marginBottom: "5px", background: "#222", color: "#FFF" }} value={match[`t${n}`]} onChange={(e) => sync({ ...match, [`t${n}`]: e.target.value })}><option value="">Select Team</option>{TEAMS.map((t) => (<option key={t}>{t}</option>))}</select>
                    <select style={{ width: "100%", padding: "10px", marginBottom: "5px", background: "#222", color: "#FFF" }} value={match[`p${n}a`]} onChange={(e) => sync({ ...match, [`p${n}a`]: e.target.value })}><option value="">Player 1</option>{ALL_PLAYERS.map((p) => (<option key={p}>{p}</option>))}</select>
                    {match.mType === "Doubles" && <select style={{ width: "100%", padding: "10px", background: "#222", color: "#FFF" }} value={match[`p${n}b`]} onChange={(e) => sync({ ...match, [`p${n}b`]: e.target.value })}><option value="">Player 2</option>{ALL_PLAYERS.map((p) => (<option key={p}>{p}</option>))}</select>}
                  </div>
                ) : (
                  <div style={{ marginBottom: "15px" }}>
                    <h2 style={{ fontSize: "32px", margin: 0, color: "#FFF" }}>{match[`t${n}`] || "TBD"}</h2>
                    <p style={{ color: "#AAA", fontSize: "14px" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && ` & ${match[`p${n}b`]}`}</p>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isAdmin && <button onClick={() => sync({ ...match, [`s${n}`]: Math.max(0, match[`s${n}`] - 1) })} style={{ width: "50px", height: "50px", borderRadius: "50%", border: "none", backgroundColor: "#333", color: theme.danger, fontSize: "24px" }}>-</button>}
                  <span style={{ fontSize: "90px", fontWeight: "900", margin: "0 25px", fontFamily: "monospace", color: "#FFF" }}>{match[`s${n}`] || 0}</span>
                  {isAdmin && <button onClick={() => sync({ ...match, [`s${n}`]: (match[`s${n}`] || 0) + 1 })} style={{ width: "50px", height: "50px", borderRadius: "50%", border: "none", backgroundColor: "#333", color: theme.accent, fontSize: "24px" }}>+</button>}
                </div>
              </div>
            ))}
            {isAdmin && match.t1 && <button onClick={archiveMatch} style={{ width: "100%", padding: "20px", borderRadius: "15px", border: "none", backgroundColor: theme.accent, color: "#000", fontWeight: "900", marginTop: "10px", fontSize: "16px" }}>FINALIZE THE MATCH</button>}
          </div>
        )}

        {/* RESULTS VIEW */}
        {view === "history" && (
          <div style={{ padding: "10px" }}>
            <div style={{ backgroundColor: theme.card, borderRadius: "15px", border: "1px solid #222" }}>
              {history.map((h) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", padding: "15px", borderBottom: "1px solid #222" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "16px", color: "#FFF" }}>{h.t1} vs {h.t2}</div>
                    <div style={{ fontSize: "12px", color: "#888" }}>{h.players}</div>
                  </div>
                  <div style={{ textAlign: "right", marginRight: "10px" }}>
                    <div style={{ color: theme.accent, fontWeight: "900", fontSize: "22px" }}>{h.s1} - {h.s2}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteResult(h.id)} style={{ background: "none", border: "none", color: theme.danger, padding: "10px", cursor: "pointer", fontSize: "18px" }}>✕</button>
                  )}
                </div>
              ))}
              {history.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#555" }}>No results yet</div>}
            </div>
          </div>
        )}

        {/* INFO VIEW */}
        {view === "info" && (
          <div style={{ padding: "15px" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <button onClick={() => setInfoTab("rules")} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: infoTab === "rules" ? theme.accent : "#222", color: infoTab === "rules" ? "#000" : "#FFF", fontWeight: "bold" }}>RULES</button>
                <button onClick={() => setInfoTab("teams")} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: infoTab === "teams" ? theme.accent : "#222", color: infoTab === "teams" ? "#000" : "#FFF", fontWeight: "bold" }}>TEAMS</button>
            </div>
            {infoTab === "rules" ? (
              <div style={{ backgroundColor: theme.card, padding: "20px", borderRadius: "15px", border: "1px solid #222" }}>
                <ul style={{ paddingLeft: "15px", color: "#EEE", lineHeight: "2" }}>
                  {TOURNAMENT_RULES.map((rule, idx) => <li key={idx}>{rule}</li>)}
                </ul>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {Object.entries(TEAM_ROSTERS).map(([team, players]) => (
                  <div key={team} style={{ backgroundColor: theme.card, padding: "15px", borderRadius: "15px", border: "1px solid #222" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: theme.accent, fontSize: "12px" }}>{team}</h4>
                    {players.map((p, idx) => <div key={idx} style={{ fontSize: "11px", color: "#AAA" }}>{p}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE VIEW */}
        {view === "schedule" && (
          <div style={{ padding: "15px" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              {Object.keys(SCHEDULE_DATA).map((day) => (
                <button key={day} onClick={() => setActiveDay(day)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", backgroundColor: activeDay === day ? theme.accent : "#222", color: activeDay === day ? "#000" : "#FFF", fontWeight: "bold" }}>{day}</button>
              ))}
            </div>
            <div style={{ backgroundColor: theme.card, borderRadius: "15px", border: "1px solid #222" }}>
              {SCHEDULE_DATA[activeDay].map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "15px 20px", borderBottom: "1px solid #222" }}>
                  <div style={{ color: theme.accent, fontWeight: "bold" }}>{m.time}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "bold", color: "#FFF" }}>{m.t1} vs {m.t2}</div>
                    <div style={{ fontSize: "11px", color: "#888" }}>{m.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER NAV */}
      <nav style={{ position: "fixed", bottom: 0, width: "100%", display: "flex", backgroundColor: "#111", borderTop: `1px solid #333`, paddingBottom: "65px", paddingTop: "10px", zIndex: 1000 }}>
        {["live", "history", "info", "schedule"].map((v) => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "10px 0", background: "none", border: "none", color: view === v ? theme.accent : "#FFFFFF", fontWeight: "bold", fontSize: "11px", transition: "0.2s" }}>
            <div style={{ fontSize: "18px", marginBottom: "4px" }}>
              {v === "live" ? "🎾" : v === "history" ? "🏆" : v === "info" ? "📋" : "📅"}
            </div>
            {v.toUpperCase()}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MWCScoreboard;
