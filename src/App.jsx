import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, onDisconnect, serverTimestamp } from "firebase/database";

/* ================= FIREBASE ================= */

const firebaseConfig = {
  apiKey: "AIzaSyCwoLIBAh4NMlvp-r8avXucscjVA10ydw0",
  authDomain: "mwc-open---8th-edition.firebaseapp.com",
  databaseURL: "https://mwc-open---8th-edition-default-rtdb.firebaseio.com",
  projectId: "mwc-open---8th-edition",
  storageBucket: "mwc-open---8th-edition.firebasestorage.app",
  messagingSenderId: "1056583710011",
  appId: "1:1056583710011:web:998e4f73a657ef69d3b31e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

/* ================= CONSTANTS ================= */

const VIEWS = ["live", "results", "standings", "schedule", "info"];

const TEAM_ROSTERS = {
  "Team Alpha": ["Ram", "P2", "P3", "P4", "P5", "P6"],
  "Team Bravo": ["Kiran", "P12", "P13", "P14", "P15", "P16"],
  "Team Charlie": ["Chetan", "P22", "P23", "P24", "P25", "P26"],
  "Team Delta": ["Rajesh", "P32", "P33", "P34", "P35", "P36"],
};

const TEAMS = Object.keys(TEAM_ROSTERS);

/* ================= MAIN COMPONENT ================= */

const MWCScoreboard = () => {
  const [view, setView] = useState("live");
  const [infoTab, setInfoTab] = useState("team_std");
  const [history, setHistory] = useState([]);

  const theme = {
    bg: "#000",
    card: "#111",
    accent: "#adff2f",
    text: "#FFF",
    muted: "#666",
  };

  /* ================= FIREBASE HISTORY ================= */

  useEffect(() => {
    onValue(ref(db, "history/"), (snap) => {
      if (!snap.val()) {
        setHistory([]);
        return;
      }
      const raw = snap.val();
      setHistory(
        Object.keys(raw)
          .map((k) => ({ id: k, ...raw[k] }))
          .sort((a, b) => b.mNo - a.mNo)
      );
    });
  }, []);

  /* ================= TEAM STANDINGS (EXISTING) ================= */

  const standings = useMemo(() => {
    const stats = {};
    TEAMS.forEach((t) => {
      stats[t] = { played: 0, won: 0, games: 0 };
    });

    history.forEach((m) => {
      if (!stats[m.t1] || !stats[m.t2]) return;

      stats[m.t1].played++;
      stats[m.t2].played++;

      stats[m.t1].games += Number(m.s1 || 0);
      stats[m.t2].games += Number(m.s2 || 0);

      if (Number(m.s1) > Number(m.s2)) stats[m.t1].won++;
      if (Number(m.s2) > Number(m.s1)) stats[m.t2].won++;
    });

    return Object.entries(stats)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.won - a.won);
  }, [history]);

  /* ================= PLAYER STATS (EXISTING) ================= */

  const playerStats = useMemo(() => {
    const stats = {};
    const playerToTeam = {};

    Object.entries(TEAM_ROSTERS).forEach(([team, players]) => {
      players.forEach((p) => (playerToTeam[p] = team));
    });

    history.forEach((m) => {
      const sides = m.players?.split(" vs ");
      if (!sides || sides.length !== 2) return;

      const t1p = sides[0].split("/").map((p) => p.trim());
      const t2p = sides[1].split("/").map((p) => p.trim());

      [...t1p, ...t2p].forEach((p) => {
        if (!stats[p]) {
          stats[p] = { name: p, mp: 0, mw: 0, team: playerToTeam[p] || "---" };
        }
        stats[p].mp++;
      });

      if (Number(m.s1) > Number(m.s2)) t1p.forEach((p) => stats[p].mw++);
      if (Number(m.s2) > Number(m.s1)) t2p.forEach((p) => stats[p].mw++);
    });

    return Object.values(stats).sort((a, b) => b.mw - a.mw);
  }, [history]);

  /* ================= NEW: TEAM ANALYTICS ================= */

  const teamAnalytics = useMemo(() => {
    const data = {};
    TEAMS.forEach((t) => {
      data[t] = { team: t, played: 0, wins: 0, gamesWon: 0, gamesLost: 0 };
    });

    history.forEach((m) => {
      if (!data[m.t1] || !data[m.t2]) return;

      const s1 = Number(m.s1 || 0);
      const s2 = Number(m.s2 || 0);

      data[m.t1].played++;
      data[m.t2].played++;

      data[m.t1].gamesWon += s1;
      data[m.t1].gamesLost += s2;

      data[m.t2].gamesWon += s2;
      data[m.t2].gamesLost += s1;

      if (s1 > s2) data[m.t1].wins++;
      if (s2 > s1) data[m.t2].wins++;
    });

    return Object.values(data).map((t) => ({
      ...t,
      winRate: t.played ? Math.round((t.wins / t.played) * 100) : 0,
      pdi: t.gamesWon - t.gamesLost,
    }));
  }, [history]);

  /* ================= RENDER ================= */

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: "100vh" }}>
      {view === "standings" && (
        <div style={{ maxWidth: "500px", margin: "0 auto", padding: "15px" }}>
          {/* SUB TABS */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <button onClick={() => setInfoTab("team_std")}
              style={{ flex: 1, padding: "14px", background: infoTab === "team_std" ? theme.accent : "#111", color: infoTab === "team_std" ? "#000" : "#FFF", borderRadius: "12px", fontWeight: "900", fontSize: "10px" }}>
              TEAMS
            </button>

            <button onClick={() => setInfoTab("player_std")}
              style={{ flex: 1, padding: "14px", background: infoTab === "player_std" ? theme.accent : "#111", color: infoTab === "player_std" ? "#000" : "#FFF", borderRadius: "12px", fontWeight: "900", fontSize: "10px" }}>
              PLAYERS
            </button>

            <button onClick={() => setInfoTab("analytics")}
              style={{ flex: 1, padding: "14px", background: infoTab === "analytics" ? theme.accent : "#111", color: infoTab === "analytics" ? "#000" : "#FFF", borderRadius: "12px", fontWeight: "900", fontSize: "10px" }}>
              ANALYTICS
            </button>
          </div>

          {/* TEAM & PLAYER TABLES (UNCHANGED) */}
          {infoTab !== "analytics" && (
            <div style={{ background: theme.card, borderRadius: "15px", overflow: "hidden" }}>
              <table style={{ width: "100%" }}>
                <tbody>
                  {(infoTab === "player_std" ? playerStats : standings).map((item, i) => (
                    <tr key={item.name}>
                      <td style={{ padding: "12px" }}>
                        #{i + 1} {item.name}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px", color: theme.accent }}>
                        {item.mw ?? item.won}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ANALYTICS */}
          {infoTab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* WIN RATE */}
              <div style={{ background: theme.card, padding: "20px", borderRadius: "15px" }}>
                <div style={{ color: theme.accent, fontWeight: "900", marginBottom: "10px" }}>
                  WIN RATE DISTRIBUTION
                </div>
                {teamAnalytics.map((t) => (
                  <div key={t.team} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{t.team}</span>
                      <span style={{ color: theme.accent }}>{t.winRate}%</span>
                    </div>
                    <div style={{ height: "10px", background: "#000" }}>
                      <div style={{ width: `${t.winRate}%`, height: "100%", background: theme.accent }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* PDI */}
              <div style={{ background: theme.card, padding: "20px", borderRadius: "15px" }}>
                <div style={{ color: theme.accent, fontWeight: "900", marginBottom: "10px" }}>
                  POINTS DOMINANCE INDEX
                </div>
                {teamAnalytics.map((t) => {
                  const mag = Math.min(Math.abs(t.pdi), 20) * 5;
                  return (
                    <div key={t.team} style={{ marginBottom: "12px" }}>
                      {t.team} ({t.pdi})
                      <div style={{ position: "relative", height: "10px", background: "#000" }}>
                        {t.pdi >= 0 ? (
                          <div style={{ position: "absolute", left: "50%", width: `${mag}%`, height: "100%", background: theme.accent }} />
                        ) : (
                          <div style={{ position: "absolute", right: "50%", width: `${mag}%`, height: "100%", background: "#ff5555" }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MWCScoreboard;
