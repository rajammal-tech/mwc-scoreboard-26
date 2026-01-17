import React, { useState, useEffect, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, onDisconnect, increment } from "firebase/database";

// 1. FIREBASE CONFIG
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

const SCHEDULE_DATA = {
  "Feb 7th": [
    { time: "09:00 AM", type: "Singles", t1: "Alpha", t2: "Bravo" },
    { time: "10:30 AM", type: "Doubles", t1: "Charlie", t2: "Delta" },
  ],
  "Feb 8th": [
    { time: "09:00 AM", type: "Doubles", t1: "Bravo", t2: "Delta" },
  ],
};

const VIEWS = ["live", "results", "info", "schedule"];
const TEAMS = Object.keys(TEAM_ROSTERS);
const ALL_PLAYERS = Object.values(TEAM_ROSTERS).flat();

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const MWCScoreboard = () => {
  const [view, setView] = useState("live");
  const [infoTab, setInfoTab] = useState("rules");
  const [activeDay, setActiveDay] = useState("Feb 7th");
  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editScores, setEditScores] = useState({ s1: 0, s2: 0 });
  const [match, setMatch] = useState({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles" });

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
    // Session Tracking
    const userCountRef = ref(db, 'status/activeUsers');
    update(userCountRef, increment(1));
    onDisconnect(userCountRef).update(increment(-1));
    onValue(userCountRef, (snap) => setActiveUsers(snap.val() || 0));

    onValue(ref(db, "live/"), (snap) => snap.val() && setMatch(snap.val()));
    onValue(ref(db, "history/"), (snap) => {
      if (snap.val()) {
        const raw = snap.val();
        const data = Object.keys(raw).map(k => ({ id: k, ...raw[k] }));
        const cleanData = data.filter(m => m.t1 && m.t1.trim() !== "" && m.t2 && m.t2.trim() !== "");
        setHistory(cleanData.sort((a, b) => b.mNo - a.mNo));
      } else { setHistory([]); }
    });
  }, []);

  const sync = (d) => { setMatch(d); if (isAdmin) set(ref(db, "live/"), d); };
  const handleLogin = () => { if (isAdmin) return setIsAdmin(false); const p = window.prompt("PIN:"); if (p === "121212") setIsAdmin(true); };
  const saveEdit = (id) => { update(ref(db, `history/${id}`), { s1: Number(editScores.s1), s2: Number(editScores.s2) }); setEditingId(null); };
  const deleteResult = (id) => { if (window.confirm("Delete this entry forever?")) remove(ref(db, `history/${id}`)); };

  const archiveMatch = () => {
    if (!match.t1 || !match.t2) return alert("Please select both teams!");
    const pLine = match.mType === "Singles" ? `${match.p1a} vs ${match.p2a}` : `${match.p1a}/${match.p1b} vs ${match.p2a}/${match.p2b}`;
    const now = new Date();
    const ts = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} : ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    push(ref(db, "history/"), { mNo: Date.now(), t1: match.t1, t2: match.t2, players: pLine, s1: match.s1, s2: match.s2, time: ts });
    sync({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles" });
  };

  const theme = { bg: "#000", card: "#111", accent: "#adff2f", text: "#FFF", muted: "#BBB", deepMuted: "#777" };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", fontFamily: "sans-serif", paddingBottom: "120px", touchAction: "pan-y" }}>
      <header style={{ padding: "20px", textAlign: "center", borderBottom: "1px solid #333", position: "relative" }}>
        {isAdmin && <div style={{ position: "absolute", left: "15px", top: "25px", fontSize: "9px", color: theme.accent, border: `1px solid ${theme.accent}`, padding: "2px 6px", borderRadius: "10px" }}>● LIVE: {activeUsers}</div>}
        <h1 style={{ color: theme.accent, margin: 0, fontSize: "20px", fontStyle: "italic", lineHeight: "1.1" }}>MWC OPEN'26</h1>
        <div style={{ fontSize: "10px", color: "#888", letterSpacing: "2px", fontWeight: "bold" }}>8TH EDITION</div>
        <button onClick={handleLogin} style={{ position: "absolute", right: "15px", top: "20px", padding: "6px 12px", borderRadius: "20px", border: `1px solid ${isAdmin ? theme.accent : "#FFF"}`, backgroundColor: isAdmin ? theme.accent : "transparent", color: isAdmin ? "#000" : "#FFF", fontSize: "10px", fontWeight: "bold" }}>{isAdmin ? "UMPIRE" : "LOGIN"}</button>
      </header>

      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "10px" }}>
        {view === "live" && (
          <div>
            {isAdmin && <select style={{ width: "100%", padding: "10px", background: "#111", color: theme.accent, border: "1px solid #333", marginBottom: "10px" }} value={match.mType} onChange={(e) => sync({ ...match, mType: e.target.value })}><option value="Singles">Singles</option><option value="Doubles">Doubles</option></select>}
            {[1, 2].map(n => (
              <div key={n} style={{ backgroundColor: theme.card, padding: "15px", borderRadius: "15px", margin: "10px 0", border: "1px solid #222", textAlign: "center" }}>
                <p style={{ color: theme.accent, fontSize: "10px", fontWeight: "900", margin: "0 0 10px 0" }}>TEAM {n}</p>
                {isAdmin ? (
                  <div>
                    <select style={{ width: "100%", padding: "8px", marginBottom: "5px" }} value={match[`t${n}`]} onChange={(e) => sync({ ...match, [`t${n}`]: e.target.value })}><option value="">Team</option>{TEAMS.map(t=><option key={t}>{t}</option>)}</select>
                    <select style={{ width: "100%", padding: "8px", marginBottom: "5px" }} value={match[`p${n}a`]} onChange={(e) => sync({ ...match, [`p${n}a`]: e.target.value })}><option value="">P1</option>{ALL_PLAYERS.map(p=><option key={p}>{p}</option>)}</select>
                    {match.mType === "Doubles" && <select style={{ width: "100%", padding: "8px" }} value={match[`p${n}b`]} onChange={(e) => sync({ ...match, [`p${n}b`]: e.target.value })}><option value="">P2</option>{ALL_PLAYERS.map(p=><option key={p}>{p}</option>)}</select>}
                  </div>
                ) : (
                  <div><h2 style={{ fontSize: "24px", margin: 0 }}>{match[`t${n}`] || "---"}</h2><p style={{ color: theme.muted, fontSize: "14px", marginTop: "5px" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && `& ${match[`p${n}b`]}`}</p></div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                  {isAdmin && <button onClick={() => sync({ ...match, [`s${n}`]: Math.max(0, match[`s${n}`] - 1) })} style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#333", color: "#ff4444", border: "none" }}>-</button>}
                  <span style={{ fontSize: "60px", fontWeight: "bold", margin: "0 20px" }}>{match[`s${n}`] || 0}</span>
                  {isAdmin && <button onClick={() => sync({ ...match, [`s${n}`]: (match[`s${n}`] || 0) + 1 })} style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#333", color: theme.accent, border: "none" }}>+</button>}
                </div>
              </div>
            ))}
            {isAdmin && match.t1 && <button onClick={archiveMatch} style={{ width: "100%", padding: "15px", borderRadius: "10px", background: theme.accent, color: "#000", fontWeight: "bold", marginTop: "10px" }}>SUBMIT FINAL SCORE</button>}
          </div>
        )}

        {view === "results" && (
          <div style={{ backgroundColor: theme.card, borderRadius: "10px" }}>
            {history.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", padding: "15px", borderBottom: "1px solid #222" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px", color: "#FFF" }}>{h.t1} vs {h.t2}</div>
                  <div style={{ fontSize: "12px", color: theme.muted, marginTop: "4px", fontWeight: "500" }}>{h.players}</div>
                  <div style={{ fontSize: "10px", color: theme.accent, marginTop: "6px", opacity: 0.8 }}>{h.time}</div>
                </div>
                {editingId === h.id ? (
                  <div style={{ display: "flex", gap: "5px", marginLeft: "10px" }}>
                    <input type="number" style={{ width: "35px", padding: "5px", background: "#222", color: "#FFF" }} value={editScores.s1} onChange={(e) => setEditScores({ ...editScores, s1: e.target.value })} />
                    <input type="number" style={{ width: "35px", padding: "5px", background: "#222", color: "#FFF" }} value={editScores.s2} onChange={(e) => setEditScores({ ...editScores, s2: e.target.value })} />
                    <button onClick={() => saveEdit(h.id)} style={{ background: theme.accent, border: "none", padding: "5px 10px", borderRadius: "4px", fontSize: "10px" }}>OK</button>
                  </div>
                ) : (
                  <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "10px", marginLeft: "10px" }}>
                    <span style={{ color: theme.accent, fontWeight: "bold", fontSize: "18px" }}>{h.s1} - {h.s2}</span>
                    {isAdmin && (
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => { setEditingId(h.id); setEditScores({s1: h.s1, s2: h.s2}); }} style={{ background: "#333", color: "#FFF", border: "none", padding: "4px 8px", fontSize: "10px", borderRadius: "4px" }}>EDIT</button>
                        <button onClick={() => deleteResult(h.id)} style={{ background: "#441111", color: "#ff4444", border: "none", padding: "4px 8px", fontSize: "10px", borderRadius: "4px" }}>DEL</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === "info" && (
          <div style={{ minHeight: "65vh" }}>
            <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
              <button onClick={() => setInfoTab("rules")} style={{ flex: 1, padding: "12px", background: infoTab === "rules" ? theme.accent : "#222", color: infoTab === "rules" ? "#000" : "#FFF", border: "none", borderRadius: "8px", fontWeight: "bold" }}>RULES</button>
              <button onClick={() => setInfoTab("teams")} style={{ flex: 1, padding: "12px", background: infoTab === "teams" ? theme.accent : "#222", color: infoTab === "teams" ? "#000" : "#FFF", border: "none", borderRadius: "8px", fontWeight: "bold" }}>TEAMS</button>
            </div>
            {infoTab === "rules" ? (
              <div style={{ padding: "20px", background: theme.card, borderRadius: "15px", border: "1px solid #333", lineHeight: "1.6" }}>
                <h3 style={{ color: theme.accent, marginTop: 0 }}>Tournament Rules</h3>
                <ul style={{ paddingLeft: "20px", color: theme.muted }}>
                  <li>Best of 3 sets to 21 points.</li>
                  <li>Golden point at 20-all (No deuce).</li>
                  <li>Umpire's decision is final.</li>
                  <li>Switch sides after each set.</li>
                </ul>
                <div style={{ marginTop: "30px", padding: "15px", border: "1px dashed #444", borderRadius: "10px", textAlign: "center", color: "#666" }}>
                  Court Layout & Warm-up zones available at desk.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {Object.entries(TEAM_ROSTERS).map(([t, ps]) => (
                  <div key={t} style={{ background: theme.card, padding: "15px", borderRadius: "12px", border: "1px solid #222" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: theme.accent, fontSize: "12px", textTransform: "uppercase" }}>{t}</h4>
                    {ps.map((p, i) => <div key={i} style={{ fontSize: "11px", color: theme.muted, padding: "2px 0" }}>{p}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "schedule" && (
          <div>
            <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>{Object.keys(SCHEDULE_DATA).map(d => <button key={d} onClick={() => setActiveDay(d)} style={{ flex: 1, padding: "10px", background: activeDay === d ? theme.accent : "#222", color: activeDay === d ? "#000" : "#FFF", border: "none", borderRadius: "5px", fontWeight: "bold" }}>{d}</button>)}</div>
            <div style={{ background: theme.card, borderRadius: "10px" }}>
              {SCHEDULE_DATA[activeDay].map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "18px", borderBottom: "1px solid #222", alignItems: "center" }}>
                  <div style={{ color: theme.accent, fontWeight: "900", fontSize: "14px" }}>{m.time}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "bold", fontSize: "15px", color: "#FFF" }}>{m.t1} <span style={{ color: "#444" }}>vs</span> {m.t2}</div>
                    <div style={{ fontSize: "11px", color: theme.accent, fontWeight: "bold", marginTop: "3px", textTransform: "uppercase", letterSpacing: "1px" }}>{m.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", display: "flex", background: "#111", borderTop: "1px solid #333", paddingBottom: "35px", paddingTop: "15px", zIndex: 100 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#666", fontSize: "10px", fontWeight: "bold", transition: "0.3s" }}>
            <div style={{ fontSize: "20px", marginBottom: "4px" }}>{v === "live" ? "🎾" : v === "results" ? "🏆" : v === "info" ? "📋" : "📅"}</div>{v.toUpperCase()}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MWCScoreboard;
