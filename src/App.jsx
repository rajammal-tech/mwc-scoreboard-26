import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, onDisconnect, serverTimestamp } from "firebase/database";

// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCwoLIBAh4NMlvp-r8avXucscjVA10ydw0",
  authDomain: "mwc-open---8th-edition.firebaseapp.com",
  databaseURL: "https://mwc-open---8th-edition-default-rtdb.firebaseio.com",
  projectId: "mwc-open---8th-edition",
  storageBucket: "mwc-open---8th-edition.firebasestorage.app",
  messagingSenderId: "1056583710011",
  appId: "1:1056583710011:web:998e4f73a657ef69d3b31e",
};

const TEAM_ROSTERS = {
  "Team Alpha": ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
  "Team Bravo": ["P11", "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20"],
  "Team Charlie": ["P21", "P22", "P23", "P24", "P25", "P26", "P27", "P28", "P29", "P30"],
  "Team Delta": ["P31", "P32", "P33", "P34", "P35", "P36", "P37", "P38", "P39", "P40"],
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const VIEWS = ["live", "results", "standings", "schedule", "info"];
const TEAMS = Object.keys(TEAM_ROSTERS);

const MWCScoreboard = () => {
  const [view, setView] = useState("live");
  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState([]);
  const [match, setMatch] = useState({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles" });
  const [viewers, setViewers] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);

  const theme = { bg: "#000", card: "#121212", accent: "#adff2f", text: "#FFF", border: "#222" };

  // --- STYLES ---
  const glassStyle = { background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" };

  // --- EFFECTS ---
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
      if (Number(m.s1) > Number(m.s2)) stats[m.t1] && (stats[m.t1].won += 1);
      else if (Number(m.s2) > Number(m.s1)) stats[m.t2] && (stats[m.t2].won += 1);
    });
    return Object.entries(stats).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.won - a.won || b.played - a.played);
  }, [history]);

  const sync = (d) => { setMatch(d); if (isAdmin) set(ref(db, "live/"), d); };

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", fontFamily: "-apple-system, system-ui, sans-serif", paddingBottom: "120px", zoom: zoomLevel }}>
      
      {/* HEADER */}
      <header style={{ ...glassStyle, padding: "12px 10px", borderBottom: `1px solid ${theme.border}`, position: "sticky", top: 0, zIndex: 1000 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "500px", margin: "0 auto" }}>
          <div style={{ minWidth: "85px" }}>
            <div style={{ color: theme.accent, fontSize: "9px", fontWeight: "900", border: `1px solid ${theme.accent}`, padding: "4px 8px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span className="pulse-dot"></span> {viewers} VIEWERS
            </div>
            <button onClick={() => setZoomLevel(z => z >= 1.2 ? 1 : z + 0.1)} style={{ background: "transparent", color: "#666", border: "none", fontSize: "10px", marginTop: "5px", fontWeight: "bold" }}>A± {Math.round(zoomLevel*100)}%</button>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ color: theme.accent, fontStyle: "italic", fontWeight: "900", fontSize: "18px", letterSpacing: "-0.5px" }}>MWC OPEN'26</div>
            <div style={{ fontSize: "10px", fontWeight: "bold", opacity: 0.8 }}>
                <span style={{ fontSize: "16px", color: "#fff" }}>8</span><span style={{ fontSize: "8px", verticalAlign: "super" }}>th</span> Edition
            </div>
          </div>

          <div style={{ minWidth: "85px", textAlign: "right" }}>
            <button onClick={() => { if(isAdmin) setIsAdmin(false); else { const p = window.prompt("Pin:"); if(p==="121212") setIsAdmin(true); }}} 
                    style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${isAdmin ? theme.accent : "#333"}`, backgroundColor: isAdmin ? theme.accent : "#111", color: isAdmin ? "#000" : "#FFF", fontSize: "10px", fontWeight: "900", boxShadow: isAdmin ? `0 0 10px ${theme.accent}44` : "none" }}>
              {isAdmin ? "UMPIRE ON" : "UMPIRE"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "15px" }}>
        {view === "live" && (
            <div className="fade-in">
                {isAdmin && (
                    <select style={{ width: "100%", padding: "12px", background: "#111", color: theme.accent, border: "1px solid #222", borderRadius: "10px", marginBottom: "15px", fontSize: "16px", fontWeight: "bold" }} value={match.mType} onChange={(e) => sync({ ...match, mType: e.target.value })}>
                        <option value="Singles">Singles Match</option><option value="Doubles">Doubles Match</option>
                    </select>
                )}
                {[1, 2].map(n => (
                    <div key={n} style={{ background: `linear-gradient(145deg, #161616, #0c0c0c)`, padding: "25px", borderRadius: "24px", marginBottom: "15px", border: "1px solid #222", textAlign: "center", boxShadow: "0 10px 20px rgba(0,0,0,0.5)" }}>
                        <p style={{ color: theme.accent, fontSize: "11px", fontWeight: "900", marginBottom: "10px", opacity: 0.7, letterSpacing: "1px" }}>TEAM {n}</p>
                        {isAdmin ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <select style={{ padding: "12px", borderRadius: "8px", background: "#222", color: "#fff", border: "none", fontSize: "16px" }} value={match[`t${n}`]} onChange={(e) => sync({ ...match, [`t${n}`]: e.target.value })}><option value="">Select Team</option>{TEAMS.map(t => <option key={t}>{t}</option>)}</select>
                                <select style={{ padding: "12px", borderRadius: "8px", background: "#222", color: "#fff", border: "none", fontSize: "16px" }} value={match[`p${n}a`]} onChange={(e) => sync({ ...match, [`p${n}a`]: e.target.value })}><option value="">Player 1</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p}>{p}</option>)}</select>
                                {match.mType === "Doubles" && <select style={{ padding: "12px", borderRadius: "8px", background: "#222", color: "#fff", border: "none", fontSize: "16px" }} value={match[`p${n}b`]} onChange={(e) => sync({ ...match, [`p${n}b`]: e.target.value })}><option value="">Player 2</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p}>{p}</option>)}</select>}
                            </div>
                        ) : (
                            <div>
                                <h2 style={{ fontSize: "36px", margin: 0, fontWeight: "900", letterSpacing: "-1px" }}>{match[`t${n}`] || "---"}</h2>
                                <p style={{ color: "#888", fontSize: "16px", marginTop: "5px", fontWeight: "500" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && `& ${match[`p${n}b`]}`}</p>
                            </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "20px" }}>
                            {isAdmin && <button onClick={() => sync({ ...match, [`s${n}`]: Math.max(0, match[`s${n}`] - 1) })} style={{ width: "45px", height: "45px", borderRadius: "12px", background: "#222", color: "#ff4444", border: "1px solid #333", fontSize: "20px" }}>-</button>}
                            <span style={{ fontSize: "90px", fontWeight: "900", margin: "0 20px", fontFamily: "monospace", textShadow: `0 0 20px ${theme.accent}33` }}>{match[`s${n}`] || 0}</span>
                            {isAdmin && <button onClick={() => sync({ ...match, [`s${n}`]: (match[`s${n}`] || 0) + 1 })} style={{ width: "45px", height: "45px", borderRadius: "12px", background: "#222", color: theme.accent, border: "1px solid #333", fontSize: "20px" }}>+</button>}
                        </div>
                    </div>
                ))}
                {isAdmin && match.t1 && <button onClick={() => {
                    const pLine = match.mType === "Singles" ? `${match.p1a} vs ${match.p2a}` : `${match.p1a}/${match.p1b} vs ${match.p2a}/${match.p2b}`;
                    const now = new Date();
                    const ts = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    push(ref(db, "history/"), { mNo: Date.now(), t1: match.t1, t2: match.t2, players: pLine, s1: match.s1, s2: match.s2, time: ts });
                    sync({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles" });
                }} style={{ width: "100%", padding: "20px", borderRadius: "18px", background: theme.accent, color: "#000", fontWeight: "900", fontSize: "18px", border: "none", boxShadow: `0 10px 20px ${theme.accent}33` }}>FINALIZE MATCH</button>}
            </div>
        )}

        {view === "results" && (
            <div className="fade-in">
                {history.map(h => (
                    <div key={h.id} style={{ background: theme.card, padding: "20px", borderRadius: "16px", marginBottom: "12px", border: "1px solid #222" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "14px", fontWeight: "800" }}>{h.t1} vs {h.t2}</div>
                                <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>{h.players}</div>
                                <div style={{ fontSize: "9px", color: theme.accent, fontWeight: "bold", marginTop: "8px" }}>{h.time}</div>
                            </div>
                            <div style={{ fontSize: "24px", fontWeight: "900", color: theme.accent }}>{h.s1} - {h.s2}</div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {view === "standings" && (
            <div className="fade-in" style={{ background: theme.card, borderRadius: "20px", border: "1px solid #222", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#1a1a1a" }}><tr>
                        <th style={{ padding: "15px", textAlign: "left", fontSize: "10px", color: "#555" }}>TEAM</th>
                        <th style={{ padding: "15px", textAlign: "center", fontSize: "10px", color: "#555" }}>PL</th>
                        <th style={{ padding: "15px", textAlign: "right", fontSize: "10px", color: theme.accent }}>PTS</th>
                    </tr></thead>
                    <tbody>{standings.map((t, i) => (
                        <tr key={t.name} style={{ borderBottom: "1px solid #222" }}>
                            <td style={{ padding: "15px", fontWeight: "700" }}><span style={{ color: theme.accent }}>#{i+1}</span> {t.name}</td>
                            <td style={{ padding: "15px", textAlign: "center", opacity: 0.6 }}>{t.played}</td>
                            <td style={{ padding: "15px", textAlign: "right", fontWeight: "900", color: theme.accent, fontSize: "18px" }}>{t.won}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav style={{ ...glassStyle, position: "fixed", bottom: 0, width: "100%", display: "flex", borderTop: `1px solid ${theme.border}`, paddingBottom: "40px", paddingTop: "15px", zIndex: 1000 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#444", fontWeight: "900", fontSize: "10px", transition: "0.2s" }}>
            <div style={{ fontSize: "22px", marginBottom: "4px", filter: view === v ? "none" : "grayscale(1) opacity(0.5)" }}>{v === "live" ? "🎾" : v === "results" ? "✅" : v === "standings" ? "🏆" : v === "schedule" ? "📅" : "📋"}</div>
            {v.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* INJECTED ANIMATIONS */}
      <style>{`
        .pulse-dot { width: 6px; height: 6px; background: #adff2f; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.5); } 100% { opacity: 1; transform: scale(1); } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        select, button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.96); }
      `}</style>
    </div>
  );
};

export default MWCScoreboard;
