import React, { useMemo, useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./styles.css";
import { initDiscordActivity, getApiBaseUrl } from "./discordActivity.js";


function getBotDifficultySetting() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("bot");
    const saved = window.localStorage.getItem("wordfrontBotDifficulty");
    const value = (fromQuery || saved || "medium").toLowerCase();
    return ["easy", "medium", "hard", "godlike"].includes(value) ? value : "medium";
  } catch {
    return "medium";
  }
}

function saveWordfrontSession(gameData, playerIdValue) {
  try {
    if (gameData?.id && playerIdValue) {
      window.localStorage.setItem("wordfrontSession", JSON.stringify({
        gameId: gameData.id,
        playerId: playerIdValue,
        savedAt: Date.now(),
      }));
    }
  } catch {}
}

function getWordfrontSession() {
  try {
    const raw = window.localStorage.getItem("wordfrontSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.gameId || !parsed?.playerId) return null;
    if (Date.now() - Number(parsed.savedAt || 0) > 6 * 60 * 60 * 1000) {
      window.localStorage.removeItem("wordfrontSession");
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}


const SERVER_URL = getApiBaseUrl();
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LETTER_VALUES = {
  A: 16, B: 18, C: 18, D: 18, E: 10, F: 18, G: 10, H: 18, I: 18, J: 18, K: 18, L: 16, M: 16,
  N: 10, O: 20, P: 20, Q: 20, R: 18, S: 16, T: 18, U: 18, V: 18, W: 18, X: 18, Y: 18, Z: 18,
};

function App() {
  const socket = useMemo(() => io(SERVER_URL), []);
  const [name, setName] = useState(localStorage.getItem("wordfrontName") || "Domain");
  const [joinCode, setJoinCode] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  
  const [soloSetupOpen, setSoloSetupOpen] = useState(false);
  const [selectedBotDifficulty, setSelectedBotDifficulty] = useState("medium");
const [selectedLetter, setSelectedLetter] = useState(null);
  const [dragLetter, setDragLetter] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [error, setError] = useState("");
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [discordContext, setDiscordContext] = useState(null);
  const [discordError, setDiscordError] = useState("");
  const lastBoardKeyRef = useRef("");
  const lastTurnKeyRef = useRef("");
  const ignoreGameUpdatesRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    initDiscordActivity()
      .then((ctx) => {
        if (cancelled) return;
        setDiscordContext(ctx);
        if (ctx?.user?.username) {
          setName((current) => localStorage.getItem("wordfrontName") || ctx.user.username || current);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setDiscordError(error.message || "Discord Activity initialization failed.");
      });
  
  function openSoloSetup() {
    setSelectedBotDifficulty("medium");
    setSoloSetupOpen(true);
  }

  function startSoloWithDifficulty() {
    try {
      window.localStorage.setItem("wordfrontBotDifficulty", selectedBotDifficulty);
    } catch {}
    setSoloSetupOpen(false);
    startSoloGame(selectedBotDifficulty);
  }
return () => { cancelled = true; };
  }, []);
function makeBoardKey(next) {
    if (!next?.map) return "";
    return next.map.flat().map((cell) => `${cell.row}:${cell.col}:${cell.letter || ""}:${cell.ownerId || ""}`).join("|");
  }

  useEffect(() => {
    
    const reattachSession = () => {
      const saved = getWordfrontSession();
      if (!saved) return;
      socket.emit("reattachSession", saved, (response) => {
        if (response?.ok) {
          setGame(response.game);
          setPlayerId(response.playerId || saved.playerId);
          saveWordfrontSession(response.game, response.playerId || saved.playerId);
        }
      });
    };

    socket.on("connect", reattachSession);
    socket.io?.on?.("reconnect", reattachSession);

    socket.on("gameState", (next) => {
      if (ignoreGameUpdatesRef.current) return;
      const boardKey = makeBoardKey(next);
      const turnKey = `${next?.currentPlayer?.id || ""}:${next?.requiredLetter || ""}:${next?.status || ""}`;
      const boardChanged = lastBoardKeyRef.current && lastBoardKeyRef.current !== boardKey;
      const turnChanged = lastTurnKeyRef.current && lastTurnKeyRef.current !== turnKey;
      lastBoardKeyRef.current = boardKey;
      lastTurnKeyRef.current = turnKey;
      setGame(next);
      // The server broadcasts timer updates every second. Do NOT clear pending placements
      // for timer-only updates, or dropped tiles appear to vanish from the board.
      if (boardChanged || turnChanged) {
        setPlacements([]);
        setSelectedLetter(null);
        setDragLetter(null);
      }
    });
    return () => socket.off("gameState");
  }, [socket]);

  function saveName() { localStorage.setItem("wordfrontName", name.trim() || "Player"); }
  function handleResponse(res) {
    if (!res?.ok) return setError(res?.error || "Something went wrong.");
    ignoreGameUpdatesRef.current = false;
    setError(""); setGame(res.game); setPlayerId(res.playerId); saveName();
  }
  function createGame() { socket.emit("createGame", { name }, handleResponse); }
  function soloGame() {
    try { window.localStorage.setItem("wordfrontBotDifficulty", selectedBotDifficulty); } catch {}
    socket.emit("soloGame", { name, botDifficulty: selectedBotDifficulty || getBotDifficultySetting() }, handleResponse);
  }
  function joinGame() { socket.emit("joinGame", { gameId: joinCode, name }, handleResponse); }

  function currentWord() { return placements.map((p) => p.letter).join(""); }
  function clearPending() { setPlacements([]); setError(""); }

  function addPending(letter, row, col) {
    if (!letter) return;
    if (placements.some((p) => p.row === row && p.col === col)) return setError("You already placed a pending letter there.");
    if (placements.length === 0 && game?.requiredLetter && letter !== game.requiredLetter) return setError(`This word must start with ${game.requiredLetter}.`);
    setPlacements((prev) => [...prev, { letter, row, col, order: prev.length }]);
    setSelectedLetter(null);
    setError("");
  }

  function movePending(fromRow, fromCol, toRow, toCol) {
    if (game?.map?.[toRow]?.[toCol]?.letter) return setError("That board space is already occupied.");
    if (placements.some((p) => p.row === toRow && p.col === toCol)) return setError("You already placed a pending letter there.");
    setPlacements((prev) => prev.map((p) => (p.row === fromRow && p.col === fromCol ? { ...p, row: toRow, col: toCol } : p)));
    setError("");
  }

  function removePending(row, col) {
    setPlacements((prev) => prev.filter((p) => !(p.row === row && p.col === col)).map((p, i) => ({ ...p, order: i })));
  }

  function getSpatialPlacements() {
    if (!placements.length) return [];
    const sameRow = placements.every((p) => p.row === placements[0].row);
    const sameCol = placements.every((p) => p.col === placements[0].col);
    const sorted = [...placements].sort((a, b) => {
      if (sameRow) return a.col - b.col;
      if (sameCol) return a.row - b.row;
      return a.order - b.order;
    });
    return sorted.map((p, index) => ({ ...p, order: index }));
  }

  function deployWord() {
    setError("");
    if (!placements.length) return setError("Drop letters onto the board first.");
    const spatialPlacements = getSpatialPlacements();
    socket.emit("playWord", { placements: spatialPlacements }, (res) => {
      if (!res?.ok) setError(res?.error || "Invalid word.");
      else { setError(""); setPlacements([]); setSelectedLetter(null); }
    });
  }

  function surrender() {
    setError("");
    setShowMenu(false);
    setShowSurrenderModal(true);
  }

  function confirmSurrenderAndReturn() {
    setError("");
    socket.emit("surrender", {}, (res) => {
      if (!res?.ok) {
        setError(res?.error || "Could not surrender.");
        setShowSurrenderModal(false);
        return;
      }
      returnToLobby();
    });
  }

  function cancelSurrender() {
    setShowSurrenderModal(false);
    setError("");
  }

  function returnToLobby() {
    ignoreGameUpdatesRef.current = true;
    if (game?.id) socket.emit("leaveGame", { gameId: game.id });
    setGame(null);
    setPlayerId(null);
    setPlacements([]);
    setSelectedLetter(null);
    setDragLetter(null);
    setError("");
    setShowSurrenderModal(false);
    setShowMenu(false);
    lastBoardKeyRef.current = "";
    lastTurnKeyRef.current = "";
  }

  function onDragStart(e, letter) {
    setDragLetter(letter);
    e.dataTransfer.setData("kind", "rack");
    e.dataTransfer.setData("letter", letter);
    e.dataTransfer.setData("text/plain", letter);
    e.dataTransfer.effectAllowed = "copy";
  }

  function onPendingDragStart(e, pending) {
    e.stopPropagation();
    setDragLetter(pending.letter);
    e.dataTransfer.setData("kind", "pending");
    e.dataTransfer.setData("letter", pending.letter);
    e.dataTransfer.setData("fromRow", String(pending.row));
    e.dataTransfer.setData("fromCol", String(pending.col));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropCell(e, row, col) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("kind");
    const letter = e.dataTransfer.getData("letter") || e.dataTransfer.getData("text/plain") || dragLetter;
    if (kind === "pending") {
      const fromRow = Number(e.dataTransfer.getData("fromRow"));
      const fromCol = Number(e.dataTransfer.getData("fromCol"));
      movePending(fromRow, fromCol, row, col);
    } else {
      addPending(letter, row, col);
    }
    setDragLetter(null);
  }

  if (!game) {
    return (
      <main className="homeShell">
        <section className="hero card">
          <p className="eyebrow">LETTER WARFARE DETECTED</p>
          <h1>Wordfront</h1>
          <p className="subtitle">Build chained words on the map. Claim sectors. Break the front.</p>
          <label>Your callsign</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <div className="actions">
            <div className="soloDifficultyInline">
              <p className="eyebrow">BOT LEVEL</p>
              <div className="difficultyGridInline">
                {[
                  { id: "easy", label: "Easy" },
                  { id: "medium", label: "Medium" },
                  { id: "hard", label: "Hard" },
                  { id: "godlike", label: "Godlike" },
                ].map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className={selectedBotDifficulty === level.id ? "difficultyChip active" : "difficultyChip"}
                    onClick={() => setSelectedBotDifficulty(level.id)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={soloGame}>Solo vs Bot</button>
            <button onClick={createGame}>Create Multiplayer Lobby</button>
          </div>
          <div className="joinRow">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Lobby code" />
            <button onClick={joinGame}>Join</button>
          </div>
        </section>
      </main>
    );
  }

  const myTurn = game.currentPlayer?.id === playerId && game.status === "active";
  const me = game.players.find((p) => p.id === playerId);
  const rival = game.players.find((p) => p.id !== playerId);
  const myMapTiles = game.map.flat().filter((cell) => cell.ownerId === playerId).length;
  const rivalMapTiles = game.map.flat().filter((cell) => cell.ownerId && cell.ownerId !== playerId).length;
  const totalOwned = Math.max(1, myMapTiles + rivalMapTiles);
  const myPercent = Math.round((myMapTiles / totalOwned) * 100);
  const rivalPercent = 100 - myPercent;

  return (
    <main className="gameShell">
      <aside className="leftRail">
        <section className="brandBlock">
          <h1 className="wordmark" data-text="WORDFRONT">WORDFRONT</h1>
          <p>v1.4.0</p>
        </section>
        <section className="card lobbyCard">
          <p className="eyebrow">LOBBY</p>
          <h2>{game.id}</h2>
          <p>{game.players.some((p) => p.isBot) ? "SOLO VS BOT" : game.status === "waiting" ? "WAITING" : "MULTIPLAYER"}</p>
          <button className="ghostBtn" onClick={returnToLobby}>Leave Lobby</button>
        </section>
        <section className="card scoreCard youCard">
          <p className="eyebrow">SCOREBOARD</p>
          <h3>♛ {me?.name || "You"} <span></span></h3>
          <label>Territory</label><b>{me?.score || 0}</b>
          <label>Letters</label>
          <div className="ownedLetters">{ownedLetters(game, playerId).length ? ownedLetters(game, playerId).map((l) => <i key={l}>{l}</i>) : <em>—</em>}</div>
        </section>
        <section className="card scoreCard botCard">
          <h3>{rival?.name || "Waiting for rival"}</h3>
          <label>Territory</label><b>{rival?.score || 0}</b>
          <label>Letters</label>
          <div className="ownedLetters enemyLetters">{ownedLetters(game, rival?.id).length ? ownedLetters(game, rival?.id).map((l) => <i key={l}>{l}</i>) : <em>—</em>}</div>
        </section>
<section className="bottomButtons">
          <button className="surrender" onClick={surrender} disabled={game.status !== "active"}>⚑ Surrender</button>
          <button className="menuBtn" onClick={() => setShowMenu(true)}>⚙ Menu</button>
        </section>
      </aside>

      <section className="mainStage">
        <header className="topBar">
          <div className="turnCard card">
            <p className="eyebrow">CURRENT TURN</p>
            <h2>{game.status === "finished" ? (game.winner ? `${game.winner.name} wins` : "Draw") : game.currentPlayer?.name}</h2>
            <p>{game.status === "waiting" ? "Share the lobby code." : myTurn ? (game.requiredLetter ? `Start your word with ${game.requiredLetter}` : "Opening move: build any word anywhere") : "Opponent is moving."}</p>
          </div>
          <div className="timeCard card"><p className="eyebrow">TIME REMAINING</p><b>{formatTime(game.timeLeft)}</b></div>
        </header>

        <section className="boardPanel card">
          <div className="battlefield">
            {game.map.flat().map((cell) => {
              const owner = game.players.find((p) => p.id === cell.ownerId);
              const pending = placements.find((p) => p.row === cell.row && p.col === cell.col);
              const visibleLetter = pending?.letter || cell.letter || "";
              const empty = !cell.letter && !pending;
              return (
                <div
                  role="button"
                  tabIndex={empty && myTurn ? 0 : -1}
                  key={`${cell.row}-${cell.col}`}
                  className={`mapCell ${pending ? "pending" : owner?.id === playerId ? "owned" : owner ? "enemy" : cell.letter ? "starter" : "neutral"} ${cell.multiplier === 2 ? "bonus" : ""} ${cell.contestedBy ? "contested" : ""} ${cell.lastCapturedAt ? "captured" : ""} ${empty && myTurn ? "armed" : ""}`}
                  draggable={Boolean(pending && myTurn)}
                  onDragStart={(e) => { if (pending && myTurn) onPendingDragStart(e, pending); }}
                  onDragOver={(e) => { if (myTurn && empty) e.preventDefault(); }}
                  onDrop={(e) => { if (myTurn && empty) onDropCell(e, cell.row, cell.col); }}
                  onClick={() => { if (pending) removePending(cell.row, cell.col); else if (myTurn && empty && selectedLetter) addPending(selectedLetter, cell.row, cell.col); }}
                  title={pending ? "Drag to move, or click to remove" : cell.letter ? `${cell.letter} | stability ${cell.stability || 0}${cell.contestedBy ? " | contested" : ""}` : selectedLetter ? `Place ${selectedLetter}` : "Drop a letter here"}
                >
                  <span className="dot" />
                  <strong>{visibleLetter}</strong>
                  {cell.multiplier === 2 && !visibleLetter ? <em>2X</em> : null}
                  {visibleLetter && (cell.stability || cell.contestedBy) ? <small className="cellStat">{cell.contestedBy ? "⚡" : Math.min(99, cell.stability || 0)}</small> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rackCard card">
          <div className="rackHeader">
            <div><p className="eyebrow">DRAG LETTERS TO BUILD A WORD</p><span className="hintLine">{game.requiredLetter ? `Next word must start with ${game.requiredLetter}` : "Opening move"}</span></div>
</div>
          <p className="error errorTop">{error || ""}</p>
          <div className="rack">
            {LETTERS.map((letter) => (
              <button type="button" className={`letterTile ${selectedLetter === letter ? "selected" : ""}`} draggable={myTurn} disabled={!myTurn}
                onClick={() => myTurn && setSelectedLetter(letter)} onDragStart={(e) => onDragStart(e, letter)} onDragEnd={() => setDragLetter(null)} key={letter}>
                <span>{letter}</span><small>{LETTER_VALUES[letter]}</small>
              </button>
            ))}
          </div>
            <div className="wfFooterActionDock" aria-label="Word actions">
              <button type="button" className="wfClearButton" onClick={clearPending}>CLEAR</button>
              <button type="button" className="wfDeployButton" onClick={deployWord}>DEPLOY WORD</button>
            </div>

</section>
      </section>

      <aside className="rightRail">
        <section className="card rulesCard">
          <p className="eyebrow">CURRENT RULES</p>
          <ul>
            <li>Build one full word each turn.</li>
            <li>After each word, the next word must start with the last letter played.</li>
          </ul>
        </section>

        <section className="card controlCard">
          <p className="eyebrow">TERRITORY CONTROL</p>
          <div className="controlRow">
            <span>{myPercent}%</span>
            <div><i style={{ width: `${myPercent}%` }} /><b style={{ width: `${rivalPercent}%` }} /></div>
            <span>{rivalPercent}%</span>
          </div>
        </section>

        <section className="card legendCard">
          <p className="eyebrow">LEGEND</p>
          <p><i className="legend mine" /> Your Territory</p>
          <p><i className="legend enemy" /> Bot/Rival Territory</p>
          <p><i className="legend starter" /> Neutral Letter</p>
          <p><i className="legend pendingLegend" /> Pending Word</p>
          <p><i className="legend bonus" /> 2X Influence</p>
          <p><i className="legend contested" /> Contested</p>
          <p><i className="legend captured" /> Fresh Capture</p>
        </section>
      </aside>



      {soloSetupOpen && (
        <div className="soloSetupOverlay">
          <div className="soloSetupCard">
            <p className="eyebrow">SOLO VS BOT</p>
            <h2>Choose Bot Difficulty</h2>
            <p className="soloSetupCopy">Select a level before starting your match.</p>

            <div className="difficultyGrid">
              {[
                { id: "easy", label: "Easy", copy: "Shorter words, more mistakes." },
                { id: "medium", label: "Medium", copy: "Balanced 5–7 letter plays." },
                { id: "hard", label: "Hard", copy: "Sharper words and endings." },
                { id: "godlike", label: "Godlike", copy: "Maximum pressure." },
              ].map((level) => (
                <button
                  key={level.id}
                  type="button"
                  className={selectedBotDifficulty === level.id ? "difficultyBtn active" : "difficultyBtn"}
                  onClick={() => setSelectedBotDifficulty(level.id)}
                >
                  <strong>{level.label}</strong>
                  <span>{level.copy}</span>
                </button>
              ))}
            </div>

            <div className="soloSetupActions">
              <button type="button" className="ghostBtn" onClick={() => setSoloSetupOpen(false)}>
                Cancel
              </button>
              <button type="button" className="deployBtn" onClick={startSoloWithDifficulty}>
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}


      {helpOpen && (
        <div className="wfHelpOverlay" role="dialog" aria-modal="true" aria-labelledby="wf-help-title">
          <div className="wfHelpModal">
            <div className="wfHelpHeader">
              <div>
                <p className="eyebrow">FIELD MANUAL</p>
                <h2 id="wf-help-title">How to Play Wordfront</h2>
              </div>
              <button type="button" className="wfHelpClose" onClick={() => setHelpOpen(false)} aria-label="Close help">×</button>
            </div>

            <div className="wfHelpBody">
              <section>
                <h3>Goal</h3>
                <p>Build words on the board to claim territory. Whoever controls the most territory has the advantage.</p>
              </section>
              <section>
                <h3>Turns</h3>
                <ul>
                  <li>Drag letters from your rack onto the grid.</li>
                  <li>Build one complete word each turn.</li>
                  <li>After each word, the next word must start with the last letter played.</li>
                </ul>
              </section>
              <section>
                <h3>Territory</h3>
                <ul>
                  <li>Green tiles are your territory.</li>
                  <li>Purple tiles are your rival or the bot.</li>
                  <li>Contested tiles are being fought over by both sides.</li>
                </ul>
              </section>
              <section>
                <h3>Special Tiles</h3>
                <ul>
                  <li><strong>2X Influence</strong> gives extra control value.</li>
                  <li><strong>Fresh Capture</strong> marks newly claimed territory.</li>
                  <li><strong>Pending Word</strong> shows letters before deployment.</li>
                </ul>
              </section>
              <section>
                <h3>Actions</h3>
                <ul>
                  <li><strong>Clear</strong> removes pending letters.</li>
                  <li><strong>Deploy Word</strong> locks in your word and ends your turn.</li>
                  <li><strong>Surrender</strong> ends the match.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="errorCorner" role="alert">
          <p className="eyebrow">INVALID MOVE</p>
          <strong>{error}</strong>
        </div>
      )}

      {showSurrenderModal && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <section className="modalCard card">
            <p className="eyebrow">SURRENDER</p>
            <h2>Abandon the front?</h2>
            <p>YES surrenders the match and returns to the lobby. NO resumes the game.</p>
            <div className="modalActions">
              <button className="deployBtn" onClick={confirmSurrenderAndReturn}>Yes</button>
              <button className="ghostBtn" onClick={cancelSurrender}>No</button>
            </div>
          </section>
        </div>
      )}

      {showMenu && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <section className="modalCard card">
            <p className="eyebrow">MENU</p>
            <h2>Wordfront Control</h2>
            <div className="menuList">
              <button type="button" onClick={() => { setShowMenu(false); setHelpOpen(true); }}>Help / How to Play</button>
              <button onClick={() => setShowMenu(false)}>Resume Game</button>
              <button onClick={clearPending}>Clear Pending Word</button>
              <button onClick={() => { setShowMenu(false); soloGame(); }}>Restart Solo vs Bot</button>
              <button onClick={returnToLobby}>Return to Lobby</button>
            </div>
          </section>
        </div>
      )}

    </main>
  );
}

function ownedLetters(game, ownerId) {
  if (!ownerId) return [];
  return Object.values(game.alphabet || {}).filter((tile) => tile.ownerId === ownerId).map((tile) => tile.letter);
}
function letterValue(letter) {
  if ("QZ".includes(letter)) return 10;
  if ("JKX".includes(letter)) return 8;
  if ("FHVWY".includes(letter)) return 4;
  if ("BCMP".includes(letter)) return 3;
  if ("DG".includes(letter)) return 2;
  return 1;
}
function formatTime(seconds = 0) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
createRoot(document.getElementById("root")).render(<App />);
