import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push } from "firebase/database";

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

// ==========================================
// 2. CONFIGURABLE TOURNAMENT DATA
// ==========================================
const TOURNAMENT_RULES = [
  "Matches are best of 3 sets to 21 points.",
  "Sudden death at 20-all (Golden point).",
  "Umpire decision is final.",
  "Teams must arrive 10 mins before start time.",
  "Standard MWC'26 tournament regulations apply.",
];

const TEAM_ROSTERS = {
  "Team Alpha": ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
  "Team Bravo": [
    "P11",
    "P12",
    "P13",
    "P14",
    "P15",
    "P16",
    "P17",
    "P18",
    "P19",
    "P20",
  ],
  "Team Charlie": [
    "P21",
    "P22",
    "P23",
    "P24",
    "P25",
    "P26",
    "P27",
    "P28",
    "P29",
    "P30",
  ],
  "Team Delta": [
    "P31",
    "P32",
    "P33",
    "P34",
    "P35",
    "P36",
    "P37",
    "P38",
    "P39",
    "P40",
  ],
};

const SCHEDULE_DATA = {
  "Feb 7th": [
    { time: "09:00 AM", type: "Singles", t1: "Alpha", t2: "Bravo" },
    { time: "10:30 AM", type: "Doubles", t1: "Charlie", t2: "Delta" },
    { time: "12:00 PM", type: "Singles", t1: "Alpha", t2: "Charlie" },
  ],
  "Feb 8th": [
    { time: "09:00 AM", type: "Doubles", t1: "Bravo", t2: "Delta" },
    { time: "10:30 AM", type: "Singles", t1: "Delta", t2: "Alpha" },
  ],
};

const TEAMS = Object.keys(TEAM_ROSTERS);
const ALL_PLAYERS = Object.values(TEAM_ROSTERS).flat();

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const MWCScoreboard = () => {
  const [view, setView] = useState("live");
  const [infoTab, setInfoTab] = useState("rules"); // Rules or Teams
  const [activeDay, setActiveDay] = useState("Feb 7th");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [history, setHistory] = useState([]);
  const [match, setMatch] = useState({
    t1: "",
    p1a: "",
    p1b: "",
    t2: "",
    p2a: "",
    p2b: "",
    s1: 0,
    s2: 0,
    mType: "Singles",
  });

  useEffect(() => {
    onValue(ref(db, "live/"), (snap) => snap.val() && setMatch(snap.val()));
    onValue(ref(db, "history/"), (snap) => {
      if (snap.val()) {
        const rawData = snap.val();
        const data = Object.keys(rawData)
          .map((key) => ({ id: key, ...rawData[key] }))
          .filter((m) => m.t1 && m.t2);
        setHistory(data.sort((a, b) => b.mNo - a.mNo));
      }
    });
  }, []);

  const sync = (data) => {
    setMatch(data);
    if (isAdmin) set(ref(db, "live/"), data);
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
    const playersLine =
      match.mType === "Singles"
        ? `${match.p1a} vs ${match.p2a}`
        : `${match.p1a}/${match.p1b} vs ${match.p2a}/${match.p2b}`;
    const now = new Date();
    const timestamp = `${now.getHours()}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const summary = {
      mNo: history.length + 1,
      t1: match.t1,
      t2: match.t2,
      mType: match.mType,
      players: playersLine,
      s1: match.s1,
      s2: match.s2,
      time: timestamp,
    };
    push(ref(db, "history/"), summary);
    sync({
      t1: "",
      p1a: "",
      p1b: "",
      t2: "",
      p2a: "",
      p2b: "",
      s1: 0,
      s2: 0,
      mType: "Singles",
    });
  };

  const theme = {
    bg: "#000",
    card: "#111",
    accent: "#adff2f",
    text: "#fff",
    muted: "#444",
    danger: "#ff4444",
  };

  return (
    <div
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        minHeight: "100vh",
        fontFamily: "sans-serif",
        paddingBottom: "160px",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          padding: "25px 20px",
          textAlign: "center",
          borderBottom: `1px solid ${theme.muted}`,
          position: "relative",
        }}
      >
        <h1
          style={{
            color: theme.accent,
            margin: 0,
            fontSize: "24px",
            fontWeight: "900",
            fontStyle: "italic",
          }}
        >
          MWC OPEN'26
        </h1>
        <button
          onClick={handleLogin}
          style={{
            position: "absolute",
            right: "15px",
            top: "28px",
            padding: "6px 12px",
            borderRadius: "20px",
            border: `1px solid ${theme.muted}`,
            backgroundColor: isAdmin ? theme.accent : "transparent",
            color: isAdmin ? "#000" : theme.muted,
            fontSize: "10px",
            fontWeight: "bold",
          }}
        >
          {isAdmin ? "UMPIRE" : "LOGIN"}
        </button>
        {pinError && (
          <div
            style={{
              position: "absolute",
              top: "75px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: theme.danger,
              color: "#fff",
              padding: "5px 15px",
              borderRadius: "15px",
              fontSize: "10px",
              fontWeight: "bold",
              zIndex: 2000,
            }}
          >
            Incorrect PIN
          </div>
        )}
      </header>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* LIVE VIEW */}
        {view === "live" && (
          <div style={{ padding: "10px" }}>
            {isAdmin && (
              <div
                style={{
                  backgroundColor: theme.card,
                  padding: "15px",
                  borderRadius: "15px",
                  marginBottom: "10px",
                  border: `1px solid ${theme.accent}33`,
                  textAlign: "center",
                }}
              >
                <select
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#000",
                    color: theme.accent,
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  value={match.mType}
                  onChange={(e) => sync({ ...match, mType: e.target.value })}
                >
                  <option value="Singles">Singles</option>
                  <option value="Doubles">Doubles</option>
                </select>
                <div
                  style={{
                    fontSize: "9px",
                    color: theme.muted,
                    marginTop: "8px",
                  }}
                >
                  MATCH #{history.length + 1}
                </div>
              </div>
            )}

            {[1, 2].map((n) => (
              <div
                key={n}
                style={{
                  backgroundColor: theme.card,
                  padding: "20px",
                  borderRadius: "20px",
                  margin: "10px 0",
                  border: "1px solid #222",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    color: theme.accent,
                    fontSize: "10px",
                    fontWeight: "900",
                    letterSpacing: "2px",
                    marginBottom: "10px",
                  }}
                >
                  TEAM {n}
                </p>
                {isAdmin ? (
                  <div style={{ marginBottom: "15px" }}>
                    <select
                      style={{
                        width: "100%",
                        padding: "10px",
                        marginBottom: "5px",
                      }}
                      value={match[`t${n}`]}
                      onChange={(e) =>
                        sync({ ...match, [`t${n}`]: e.target.value })
                      }
                    >
                      <option value="">Select Team</option>
                      {TEAMS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      style={{
                        width: "100%",
                        padding: "10px",
                        marginBottom: "5px",
                      }}
                      value={match[`p${n}a`]}
                      onChange={(e) =>
                        sync({ ...match, [`p${n}a`]: e.target.value })
                      }
                    >
                      <option value="">Player 1</option>
                      {ALL_PLAYERS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                    {match.mType === "Doubles" && (
                      <select
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: `1px solid ${theme.accent}`,
                        }}
                        value={match[`p${n}b`]}
                        onChange={(e) =>
                          sync({ ...match, [`p${n}b`]: e.target.value })
                        }
                      >
                        <option value="">Player 2</option>
                        {ALL_PLAYERS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div style={{ marginBottom: "15px" }}>
                    <h2 style={{ fontSize: "26px", margin: 0 }}>
                      {match[`t${n}`] || "TBD"}
                    </h2>
                    <p style={{ color: "#888", fontSize: "14px" }}>
                      {match[`p${n}a`]}{" "}
                      {match.mType === "Doubles" &&
                        match[`p${n}b`] &&
                        ` & ${match[`p${n}b`]}`}
                    </p>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isAdmin && (
                    <button
                      onClick={() =>
                        sync({
                          ...match,
                          [`s${n}`]: Math.max(0, match[`s${n}`] - 1),
                        })
                      }
                      style={{
                        width: "45px",
                        height: "45px",
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "#222",
                        color: theme.danger,
                        fontSize: "20px",
                      }}
                    >
                      -
                    </button>
                  )}
                  <span
                    style={{
                      fontSize: "80px",
                      fontWeight: "900",
                      margin: "0 25px",
                      fontFamily: "monospace",
                    }}
                  >
                    {match[`s${n}`] || 0}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() =>
                        sync({ ...match, [`s${n}`]: (match[`s${n}`] || 0) + 1 })
                      }
                      style={{
                        width: "45px",
                        height: "45px",
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "#222",
                        color: theme.accent,
                        fontSize: "20px",
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isAdmin && match.t1 && (
              <button
                onClick={archiveMatch}
                style={{
                  width: "100%",
                  padding: "18px",
                  borderRadius: "15px",
                  border: "none",
                  backgroundColor: theme.accent,
                  color: "#000",
                  fontWeight: "900",
                  marginTop: "10px",
                }}
              >
                FINALIZE THE MATCH
              </button>
            )}
          </div>
        )}

        {/* INFO VIEW (RULES + TEAMS) */}
        {view === "info" && (
          <div style={{ padding: "15px" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <button
                onClick={() => setInfoTab("rules")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor:
                    infoTab === "rules" ? theme.accent : theme.card,
                  color: infoTab === "rules" ? "#000" : theme.text,
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                RULES
              </button>
              <button
                onClick={() => setInfoTab("teams")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor:
                    infoTab === "teams" ? theme.accent : theme.card,
                  color: infoTab === "teams" ? "#000" : theme.text,
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                TEAMS
              </button>
            </div>

            {infoTab === "rules" ? (
              <div
                style={{
                  backgroundColor: theme.card,
                  padding: "20px",
                  borderRadius: "15px",
                  border: "1px solid #222",
                }}
              >
                <ul
                  style={{
                    paddingLeft: "15px",
                    color: "#ccc",
                    lineHeight: "1.8",
                  }}
                >
                  {TOURNAMENT_RULES.map((rule, idx) => (
                    <li
                      key={idx}
                      style={{ marginBottom: "10px", fontSize: "14px" }}
                    >
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                {Object.entries(TEAM_ROSTERS).map(([team, players]) => (
                  <div
                    key={team}
                    style={{
                      backgroundColor: theme.card,
                      padding: "15px",
                      borderRadius: "15px",
                      border: "1px solid #222",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 8px 0",
                        color: theme.accent,
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      {team}
                    </h4>
                    {players.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: "11px",
                          color: "#666",
                          padding: "1px 0",
                        }}
                      >
                        {p}
                      </div>
                    ))}
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
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor:
                      activeDay === day ? theme.accent : theme.card,
                    color: activeDay === day ? "#000" : theme.text,
                    fontWeight: "bold",
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
            <div
              style={{
                backgroundColor: theme.card,
                borderRadius: "15px",
                border: "1px solid #222",
              }}
            >
              {SCHEDULE_DATA[activeDay].map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "15px 20px",
                    borderBottom:
                      i === SCHEDULE_DATA[activeDay].length - 1
                        ? "none"
                        : "1px solid #222",
                  }}
                >
                  <div
                    style={{
                      color: theme.accent,
                      fontWeight: "bold",
                      fontSize: "13px",
                    }}
                  >
                    {m.time}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                      {m.t1} vs {m.t2}
                    </div>
                    <div style={{ fontSize: "10px", color: theme.muted }}>
                      {m.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS VIEW */}
        {view === "history" && (
          <div style={{ padding: "10px" }}>
            <div
              style={{
                backgroundColor: theme.card,
                borderRadius: "15px",
                border: "1px solid #222",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: theme.card,
                    fontSize: "10px",
                    color: theme.muted,
                    borderBottom: "1px solid #333",
                  }}
                >
                  <tr>
                    <th style={{ padding: "15px", textAlign: "left" }}>M#</th>
                    <th style={{ textAlign: "left" }}>MATCHUP</th>
                    <th style={{ padding: "15px", textAlign: "right" }}>
                      SCORE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #222" }}>
                      <td
                        style={{
                          padding: "15px",
                          color: theme.muted,
                          fontSize: "12px",
                        }}
                      >
                        {h.mNo}
                      </td>
                      <td style={{ padding: "10px 0" }}>
                        <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                          {h.t1} vs {h.t2}
                        </div>
                        <div style={{ fontSize: "9px", color: "#666" }}>
                          {h.players}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "15px",
                          textAlign: "right",
                          color: theme.accent,
                          fontWeight: "900",
                          fontSize: "20px",
                        }}
                      >
                        {h.s1} - {h.s2}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER NAV */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          display: "flex",
          backgroundColor: "rgba(17, 17, 17, 0.95)",
          backdropFilter: "blur(10px)",
          borderTop: `1px solid ${theme.muted}`,
          paddingBottom: "65px",
          paddingTop: "5px",
          zIndex: 1000,
        }}
      >
        {["live", "history", "info", "schedule"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              flex: 1,
              padding: "15px 0",
              background: "none",
              border: "none",
              color: view === v ? theme.accent : theme.muted,
              fontWeight: "bold",
              fontSize: "10px",
              textTransform: "uppercase",
            }}
          >
            {v === "live"
              ? "LIVE"
              : v === "history"
              ? "RESULTS"
              : v === "info"
              ? "INFO"
              : "SCHEDULE"}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MWCScoreboard;
