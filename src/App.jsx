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
    { time: "5:00 PM", type: "Doubles", t1: "Bravo", t2: "Delta" },
  ],
  "Feb 8th": [
    { time: "09:00 AM", type: "Doubles", t1: "Bravo", t2: "Delta" },
  ],
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const VIEWS = ["live", "results", "standings", "schedule", "info"];
const TEAMS = Object.keys(TEAM_ROSTERS);

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
  const [history, setHistory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editScores, setEditScores] = useState({ s1: 0, s2: 0 });
  const [match, setMatch] = useState({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles" });
  const [viewers, setViewers] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);

  const theme = { bg: "#000", card: "#111", accent: "#adff2f", text: "#FFF", muted: "#666" };

  const handleZoom = () => setZoomLevel(prev => (prev >= 1.2 ? 1 : prev + 0.1));

  const handleLogin = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      const p = window.prompt("Admin PIN:");
      if (p === null) return; 
      if (p === "121212") {
        setIsAdmin(true);
      } else {
        alert("Incorrect PIN");
      }
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

  const sync = (d) => { setMatch(d); if (isAdmin) set(ref(db, "live/"), d); };
  const isPlayerUsed = (p, currentSlot) => ["p1a", "p1b", "p2a", "p2b"].some(s => s !== currentSlot && match[s] === p);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} 
         style={{ 
            backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", fontFamily: "-apple-system, sans-serif", paddingBottom: "110px", touchAction: "pan-y",
            zoom: zoomLevel,
            WebkitTextSizeAdjust: "100%"
         }}>
      
      <header style={{ padding: "15px 10px", borderBottom: "1px solid #222", backgroundColor: "#000", position: "sticky", top: 0, zIndex: 1000 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "500px", margin: "0 auto" }}>
          <div style={{ minWidth: "85px", display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ color: theme.accent, fontSize: "9px", fontWeight: "bold", border: `1px solid ${theme.accent}`, padding: "3px 7px", borderRadius: "12px", textAlign: "center" }}>● {viewers} VIEWERS</div>
            <button onClick={handleZoom} style={{ background: "#222", color: "#FFF", border: "1px solid #444", borderRadius: "8px", fontSize: "10px", padding: "4px", fontWeight: "bold" }}>A± {Math.round(zoomLevel * 100)}%</button>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <h1 style={{ color: theme.accent, margin: 0, fontSize: "18px", fontStyle: "italic", fontWeight: "900" }}>MWC OPEN'26</h1>
            <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", marginTop: "1px" }}>
              <span style={{ fontSize: "18px" }}>8</span><span style={{ fontSize: "8px", verticalAlign: "top" }}>th</span> Edition
            </div>
          </div>
          <div style={{ minWidth: "85px", textAlign: "right" }}>
            <button onClick={handleLogin} style={{ padding: "6px 12px", borderRadius: "20px", border: `1px solid ${isAdmin ? theme.accent : "#FFF"}`, backgroundColor: isAdmin ? theme.accent : "transparent", color: isAdmin ? "#000" : "#FFF", fontSize: "10px", fontWeight: "900" }}>
              {isAdmin ? "LOGOUT" : "UMPIRE"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "10px" }}>
        {view === "live" && (
           <div>
             {isAdmin && (
               <select style={{ width: "100%", padding: "12px", background: "#111", color: theme.accent, border: "1px solid #333", borderRadius: "8px", marginBottom: "10px", fontSize: "16px" }} value={match.mType} onChange={(e) => sync({ ...match, mType: e.target.value })}>
                 <option value="Singles">Singles Match</option><option value="Doubles">Doubles Match</option>
               </select>
             )}
             {[1, 2].map(n => (
               <div key={n} style={{ backgroundColor: theme.card, padding: "20px", borderRadius: "15px", margin: "10px 0", border: "1px solid #222", textAlign: "center" }}>
                 <p style={{ color: theme.accent, fontSize: "10px", fontWeight: "900", margin: "0 0 10px 0", opacity: 0.8 }}>TEAM {n}</p>
                 {isAdmin ? (
                   <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                     <select style={{ width: "100%", padding: "12px", background: "#111", color: "#FFF", border: "1px solid #333", borderRadius: "8px", fontSize: "16px" }} value={match[`t${n}`]} onChange={(e) => sync({ ...match, [`t${n}`]: e.target.value, [`p${n}a`]: "", [`p${n}b`]: "" })}><option value="">Select Team</option>{TEAMS.map(t => <option key={t} disabled={n === 1 ? match.t2 === t : match.t1 === t}>{t}</option>)}</select>
                     <select style={{ width: "100%", padding: "12px", background: "#111", color: "#FFF", border: "1px solid #333", borderRadius: "8px", fontSize: "16px" }} value={match[`p${n}a`]} onChange={(e) => sync({ ...match, [`p${n}a`]: e.target.value })}><option value="">Player 1</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p} disabled={isPlayerUsed(p, `p${n}a`)}>{p}</option>)}</select>
                     {match.mType === "Doubles" && <select style={{ width: "100%", padding: "12px", background: "#111", color: "#FFF", border: "1px solid #333", borderRadius: "8px", fontSize: "16px" }} value={match[`p${n}b`]} onChange={(e) => sync({ ...match, [`p${n}b`]: e.target.value })}><option value="">Player 2</option>{(TEAM_ROSTERS[match[`t${n}`]] || []).map(p => <option key={p} disabled={isPlayerUsed(p, `p${n}b`)}>{p}</option>)}</select>}
                   </div>
                 ) : (
                   <div><h2 style={{ fontSize: "32px", margin: 0, fontWeight: "900" }}>{match[`t${n}`] || "---"}</h2><p style={{ color: "#AAA", fontSize: "15px", marginTop: "8px" }}>{match[`p${n}a`]} {match.mType === "Doubles" && match[`p${n}b`] && `& ${match[`p${n}b`]}`}</p></div>
                 )}
                 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "15px" }}>
                   {isAdmin && <button onClick={() => sync({ ...match, [`s${n}`]: Math.max(0, match[`s${n}`] - 1) })} style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#222", color: "#ff4444", border: "1px solid #333", fontSize: "24px" }}>-</button>}
                   <span style={{ fontSize: "80px", fontWeight: "900", margin: "0 25px", minWidth: "90px" }}>{match[`s${n}`] || 0}</span>
                   {isAdmin && <button onClick={() => sync({ ...match, [`s${n}`]: (match[`s${n}`] || 0) + 1 })} style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#222", color: theme.accent, border: "1px solid #333", fontSize: "24px" }}>+</button>}
                 </div>
               </div>
             ))}
             {isAdmin && match.t1 && <button onClick={() => {
                const pLine = match.mType === "Singles" ? `${match.p1a} vs ${match.p2a}` : `${match.p1a}/${match.p1b} vs ${match.p2a}/${match.p2b}`;
                const now = new Date();
                const ts = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                push(ref(db, "history/"), { mNo: Date.now(), t1: match.t1, t2: match.t2, players: pLine, s1: match.s1, s2: match.s2, time: ts });
                sync({ t1: "", p1a: "", p1b: "", t2: "", p2a: "", p2b: "", s1: 0, s2: 0, mType: "Singles" });
             }} style={{ width: "100%", padding: "20px", borderRadius: "12px", background: theme.accent, color: "#000", fontWeight: "900", border: "none", marginTop: "10px", fontSize: "16px" }}>FINALIZE MATCH</button>}
           </div>
        )}

        {view === "results" && (
           <div style={{ backgroundColor: theme.card, borderRadius: "12px", overflow: "hidden", border: "1px solid #222" }}>
             {history.map((h) => (
               <div key={h.id} style={{ padding: "18px", borderBottom: "1px solid #222" }}>
                 <div style={{ display: "flex", alignItems: "center" }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: "800", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{h.t1} {Number(h.s1) > Number(h.s2) && <GreenCheck color={theme.accent}/>}</span>
                        <span style={{color: "#444"}}>vs</span>
                        <span>{h.t2} {Number(h.s2) > Number(h.s1) && <GreenCheck color={theme.accent}/>}</span>
                     </div>
                     <div style={{ fontSize: "11px", color: "#BBB", marginTop: "4px" }}>{h.players}</div>
                     <div style={{ fontSize: "9px", color: theme.accent, marginTop: "8px", fontWeight: "bold" }}>{h.time}</div>
                   </div>
                   {editingId === h.id ? (
                     <div style={{ display: "flex", gap: "5px" }}>
                        <input type="number" style={{ width: "40px", padding: "5px" }} value={editScores.s1} onChange={e=>setEditScores({...editScores, s1: e.target.value})} />
                        <input type="number" style={{ width: "40px", padding: "5px" }} value={editScores.s2} onChange={e=>setEditScores({...editScores, s2: e.target.value})} />
                        <button onClick={()=> { update(ref(db, `history/${h.id}`), { s1: Number(editScores.s1), s2: Number(editScores.s2) }); setEditingId(null); }} style={{ background: theme.accent, border: "none", padding: "5px 10px", borderRadius: "4px", fontWeight: "bold" }}>SAVE</button>
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

        {view === "standings" && (
          <div style={{ backgroundColor: theme.card, borderRadius: "12px", border: "1px solid #222", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#050505" }}><tr style={{ textAlign: "left" }}><th style={{ padding: "15px", fontSize: "10px", color: theme.accent }}>TEAM</th><th style={{ textAlign: "center", fontSize: "10px" }}>MP</th><th style={{ textAlign: "center", fontSize: "10px" }}>WON</th><th style={{ textAlign: "right", paddingRight: "15px", fontSize: "10px", color: theme.accent }}>PTS</th></tr></thead>
              <tbody>{standings.map((team, i) => (
                <tr key={team.name} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "15px" }}><span style={{ color: i===0 ? theme.accent : "#555", fontWeight: "900", marginRight: "8px" }}>#{i+1}</span><span style={{ fontWeight: "700", fontSize: "14px" }}>{team.name}</span></td>
                  <td style={{ textAlign: "center" }}>{team.played}</td><td style={{ textAlign: "center" }}>{team.won}</td>
                  <td style={{ textAlign: "right", paddingRight: "15px", fontWeight: "900", color: theme.accent, fontSize: "16px" }}>{team.won}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {view === "schedule" && (
           <div style={{ background: theme.card, borderRadius: "12px", border: "1px solid #222" }}>
             <div style={{ display: "flex", borderBottom: "1px solid #222" }}>{Object.keys(SCHEDULE_DATA).map(d => <button key={d} onClick={() => setActiveDay(d)} style={{ flex: 1, padding: "15px", background: activeDay === d ? "transparent" : "#050505", color: activeDay === d ? theme.accent : "#666", border: "none", fontWeight: "bold", borderBottom: activeDay === d ? `2px solid ${theme.accent}` : "none" }}>{d}</button>)}</div>
             {SCHEDULE_DATA[activeDay].map((m, i) => (
               <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "20px", borderBottom: "1px solid #222" }}>
                 <div style={{ color: theme.accent, fontWeight: "900", fontSize: "14px" }}>{m.time}</div>
                 <div style={{ textAlign: "right" }}><div style={{ fontWeight: "800", fontSize: "15px" }}>{m.t1} vs {m.t2}</div><div style={{ fontSize: "10px", color: theme.accent, fontWeight: "bold", marginTop: "4px" }}>{m.type.toUpperCase()}</div></div>
               </div>
             ))}
           </div>
        )}

        {view === "info" && (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
              <button onClick={() => setInfoTab("rules")} style={{ flex: 1, padding: "14px", background: infoTab === "rules" ? theme.accent : "#111", color: infoTab === "rules" ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900" }}>RULES</button>
              <button onClick={() => setInfoTab("teams")} style={{ flex: 1, padding: "14px", background: infoTab === "teams" ? theme.accent : "#111", color: infoTab === "teams" ? "#000" : "#FFF", border: "none", borderRadius: "10px", fontWeight: "900" }}>TEAMS</button>
            </div>
            {infoTab === "rules" ? (
              <div style={{ padding: "20px", background: theme.card, borderRadius: "15px", border: "1px solid #333" }}><ul style={{ paddingLeft: "20px", color: "#EEE", lineHeight: "2" }}><li>Best of 3 sets to 21 points.</li><li>Golden Point at 20-all.</li><li>1 Point per match win.</li></ul></div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>{Object.entries(TEAM_ROSTERS).map(([t, ps]) => (
                <div key={t} style={{ background: theme.card, padding: "15px", borderRadius: "12px", border: "1px solid #222" }}><h4 style={{ margin: "0 0 10px 0", color: theme.accent, fontSize: "11px" }}>{t.toUpperCase()}</h4>{ps.map((p, i) => <div key={i} style={{ fontSize: "12px", color: "#DDD" }}>{p}</div>)}</div>
              ))}</div>
            )}
          </div>
        )}
      </div>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", display: "flex", background: "rgba(10,10,10,0.95)", backdropFilter: "blur(15px)", borderTop: "1px solid #222", paddingBottom: "35px", paddingTop: "15px", zIndex: 100 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", color: view === v ? theme.accent : "#555", fontSize: "10px", fontWeight: "900" }}>
            <div style={{ fontSize: "22px", marginBottom: "5px" }}>{v === "live" ? "🎾" : v === "results" ? "✅" : v === "standings" ? "🏆" : v === "schedule" ? "📅" : "📋"}</div>
            {v.toUpperCase()}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MWCScoreboard;
