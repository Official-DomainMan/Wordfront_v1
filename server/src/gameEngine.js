import { v4 as uuid } from "uuid";
import { WORDS, isDictionaryWord } from "./wordList.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const BOT_ID = "BOT";
const MATCH_SECONDS = 600;
const MAP_ROWS = 15;
const MAP_COLS = 15;
const STARTING_NEUTRAL_TILES = 14;
const RARE = new Set(["Q", "X", "Z"]);

export function createGame({ hostName, solo = false, botDifficulty = "medium" }) {
  const host = { id: uuid(), name: hostName || "Player 1", score: 0, isBot: false };
  const players = solo ? [host, { id: BOT_ID, name: "Wordfront Bot", score: 0, isBot: true }] : [host];
  const game = {
    id: uuid().slice(0, 6).toUpperCase(),
    status: solo ? "active" : "waiting",
    botDifficulty: normalizeBotDifficulty(botDifficulty),
    createdAt: Date.now(),
    startedAt: solo ? Date.now() : null,
    durationSeconds: MATCH_SECONDS,
    currentTurnIndex: 0,
    players,
    log: [{ type: "system", text: solo ? "Solo battle initiated. Chain words from the last letter. Enemy sectors can now be stolen." : "Lobby created." }],
    alphabet: createAlphabetBoard(),
    map: createMapWithStarterLetters(),
    requiredLetter: null,
    lastTurn: null,
    winner: null,
    moveCount: 0,
    combo: {}
  };
  updateScores(game);
  return game;
}

function createAlphabetBoard() {
  const board = {};
  for (const letter of LETTERS) board[letter] = { letter, ownerId: null, influence: {}, stability: 0, contestedBy: null };
  return board;
}

function createEmptyMap() {
  return Array.from({ length: MAP_ROWS }, (_, row) =>
    Array.from({ length: MAP_COLS }, (_, col) => ({
      row, col, letter: null, ownerId: null, influence: {}, stability: 0,
      contestedBy: null, multiplier: 1, starter: false, lastCapturedAt: null
    }))
  );
}

function createMapWithStarterLetters() {
  const map = createEmptyMap();
  const bonusCells = [[0,2],[0,12],[2,7],[4,0],[4,14],[6,13],[8,1],[9,4],[10,11],[13,6],[7,7],[12,2]];
  for (const [row, col] of bonusCells) map[row][col].multiplier = 2;

  const cells = [];
  for (let row = 1; row < MAP_ROWS - 1; row++) {
    for (let col = 1; col < MAP_COLS - 1; col++) if (map[row][col].multiplier === 1) cells.push({ row, col });
  }
  shuffle(cells);
  const chosen = [];
  while (chosen.length < STARTING_NEUTRAL_TILES && cells.length) {
    let bestIndex = 0, bestScore = -1;
    const sample = cells.slice(0, Math.min(cells.length, 60));
    for (const candidate of sample) {
      const minDist = chosen.length ? Math.min(...chosen.map((c) => Math.abs(c.row - candidate.row) + Math.abs(c.col - candidate.col))) : 99;
      const centerPull = 8 - Math.abs(7 - candidate.row) * .12 - Math.abs(7 - candidate.col) * .12;
      const score = minDist + centerPull + Math.random() * 0.35;
      const idx = cells.indexOf(candidate);
      if (score > bestScore) { bestScore = score; bestIndex = idx; }
    }
    chosen.push(cells.splice(bestIndex, 1)[0]);
  }
  for (const { row, col } of chosen) {
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    Object.assign(map[row][col], { letter, starter: true, ownerId: null, stability: 18 });
  }
  return map;
}


function isValidWord(word) {
  return isDictionaryWord(word);
}

function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

export function addPlayer(game, name) {
  if (game.status !== "waiting") throw new Error("Game already started.");
  if (game.players.length >= 2) throw new Error("This MVP supports 2 players per match.");
  const player = { id: uuid(), name: name || `Player ${game.players.length + 1}`, score: 0, isBot: false };
  game.players.push(player);
  game.log.unshift({ type: "system", text: `${player.name} joined the front.` });
  if (game.players.length === 2) startGame(game);
  return player;
}

export function startGame(game) {
  game.status = "active";
  game.startedAt = Date.now();
  game.log.unshift({ type: "system", text: "Match started. Build chained words. Attack enemy tiles by connecting through them." });
}

export function getPublicGame(game) {
  updateTimerAndWinner(game);
  return { ...game, timeLeft: getTimeLeft(game), currentPlayer: game.players[game.currentTurnIndex] || null };
}

export function playWord(game, playerId, rawPlacements) {
  updateTimerAndWinner(game);
  if (game.status !== "active") throw new Error("Game is not active.");
  if (game.winner) throw new Error("Game is already over.");
  const currentPlayer = game.players[game.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) throw new Error("It is not your turn.");

  const placements = normalizePlacements(rawPlacements);
  if (placements.length < 1) throw new Error("Drop letters onto the board first.");
  const resolved = resolveWordLine(game, placements, game.moveCount > 0);
  const word = resolved.word;
  if (word.length < 2) throw new Error("Build at least a 2-letter word.");
  if (!/^[A-Z]+$/.test(word)) throw new Error("Use letters only.");
  if (!isValidWord(word)) throw new Error(`"${word}" is not a valid English word.`);
  if (game.requiredLetter && word[0] !== game.requiredLetter) throw new Error(`Your word must start with ${game.requiredLetter}. Use an existing ${game.requiredLetter} tile as the anchor or place ${game.requiredLetter} first.`);

  const effects = applyWordEffects(game, currentPlayer, resolved);
  game.requiredLetter = word.at(-1);
  game.moveCount = (game.moveCount || 0) + 1;
  game.combo[currentPlayer.id] = (game.combo[currentPlayer.id] || 0) + 1;
  for (const p of game.players) if (p.id !== currentPlayer.id) game.combo[p.id] = 0;
  game.lastTurn = { playerId: currentPlayer.id, playerName: currentPlayer.name, word, placements: resolved.cells.map(({ row, col, letter }) => ({ row, col, letter })) };
  const captureText = effects.captures.length ? ` Captured ${effects.captures.join(", ")}.` : "";
  const contestedText = effects.contested.length ? ` Contested ${effects.contested.join(", ")}.` : "";
  game.log.unshift({ type: "move", text: `${currentPlayer.name} deployed ${word}. Next word starts with ${game.requiredLetter}.${captureText}${contestedText}` });
  rotateTurn(game);
  updateScores(game);
  updateTimerAndWinner(game);
  return { ok: true };
}

function normalizePlacements(rawPlacements) {
  if (!Array.isArray(rawPlacements)) throw new Error("Drop letters onto the board first.");
  return rawPlacements.map((p, index) => ({
    letter: String(p?.letter || "").trim().toUpperCase(), row: Number(p?.row), col: Number(p?.col),
    order: Number.isFinite(Number(p?.order)) ? Number(p.order) : index
  })).sort((a, b) => a.order - b.order);
}

function resolveWordLine(game, placements, mustTouchExisting) {
  const seen = new Set();
  for (const p of placements) {
    if (!LETTERS.includes(p.letter)) throw new Error("Invalid letter tile.");
    if (!Number.isInteger(p.row) || !Number.isInteger(p.col) || p.row < 0 || p.row >= MAP_ROWS || p.col < 0 || p.col >= MAP_COLS) throw new Error("A tile is outside the board.");
    const key = `${p.row}:${p.col}`;
    if (seen.has(key)) throw new Error("Two letters cannot occupy the same space.");
    seen.add(key);
    const existing = game.map[p.row][p.col].letter;
    if (existing && existing !== p.letter) throw new Error("You can only overlap an existing tile with the same letter.");
  }

  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  let dir;
  if (placements.length === 1) {
    const p = placements[0];
    const horizontal = Boolean(game.map[p.row]?.[p.col - 1]?.letter || game.map[p.row]?.[p.col + 1]?.letter);
    const vertical = Boolean(game.map[p.row - 1]?.[p.col]?.letter || game.map[p.row + 1]?.[p.col]?.letter);
    if (horizontal && !vertical) dir = { dr: 0, dc: 1 };
    else if (vertical && !horizontal) dir = { dr: 1, dc: 0 };
    else dir = { dr: 0, dc: 1 };
  } else if (rows.size === 1) dir = { dr: 0, dc: 1 };
  else if (cols.size === 1) dir = { dr: 1, dc: 0 };
  else throw new Error("Letters must form one straight horizontal or vertical word.");

  const placementByKey = new Map(placements.map((p) => [`${p.row}:${p.col}`, p]));
  const ordered = [...placements].sort((a, b) => dir.dr === 0 ? a.col - b.col : a.row - b.row);

  // Read the full word along the selected line. Existing board letters are allowed to fill
  // the spaces between pending letters, so a player can play E-A-S through an enemy R to make EARS.
  let start = { row: ordered[0].row, col: ordered[0].col };
  while (true) {
    const nr = start.row - dir.dr, nc = start.col - dir.dc;
    if (nr < 0 || nr >= MAP_ROWS || nc < 0 || nc >= MAP_COLS) break;
    if (!game.map[nr][nc].letter && !placementByKey.has(`${nr}:${nc}`)) break;
    start = { row: nr, col: nc };
  }

  const cells = [];
  let row = start.row, col = start.col;
  while (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
    const key = `${row}:${col}`;
    const pending = placementByKey.get(key);
    const existing = game.map[row][col];
    const letter = pending?.letter || existing.letter;
    if (!letter) break;
    cells.push({ row, col, letter, pending: Boolean(pending), existingOwnerId: existing.ownerId });
    row += dir.dr; col += dir.dc;
  }

  for (const p of placements) {
    if (!cells.some((c) => c.row === p.row && c.col === p.col)) throw new Error("Could not read your word from the board.");
  }

  // Make sure the submitted move is one continuous word. Gaps are only invalid when the gap
  // is truly empty; existing letters in the middle count as connected/stealable tiles.
  const pendingIndexes = placements.map((p) => cells.findIndex((c) => c.row === p.row && c.col === p.col)).sort((a, b) => a - b);
  const firstPendingIndex = pendingIndexes[0];
  const lastPendingIndex = pendingIndexes[pendingIndexes.length - 1];
  if (firstPendingIndex < 0 || lastPendingIndex < 0) throw new Error("Could not read your word from the board.");
  for (let i = firstPendingIndex; i <= lastPendingIndex; i++) {
    if (!cells[i]?.letter) throw new Error("Letters must be connected with no gaps.");
  }

  const touchesBoard = placements.some((p) => hasOccupiedNeighbor(game, p.row, p.col) || game.map[p.row][p.col].letter);
  const usesExistingInWord = cells.some((c) => !c.pending && game.map[c.row]?.[c.col]?.letter);
  if (mustTouchExisting && !touchesBoard && !usesExistingInWord) throw new Error("Your word must touch, cross, or overlap an existing tile. No diagonals.");

  return { word: cells.map((c) => c.letter).join(""), cells, dir };
}

function applyWordEffects(game, player, resolved) {
  const word = resolved.word;
  const combo = game.combo[player.id] || 0;
  const rareCount = word.split("").filter((l) => RARE.has(l)).length;
  const baseAttack = word.length * 8 + combo * 4 + rareCount * 9;
  const captures = [];
  const contested = [];

  for (const c of resolved.cells) {
    const cell = game.map[c.row][c.col];
    const wasOwner = cell.ownerId;
    if (c.pending && !cell.letter) {
      cell.letter = c.letter;
      cell.starter = false;
    }
    const adjOwned = countAdjacentOwned(game, c.row, c.col, cell.ownerId);
    const adjMine = countAdjacentOwned(game, c.row, c.col, player.id);
    const multiplier = cell.multiplier === 2 ? 1.35 : 1;
    const attack = Math.round((baseAttack + adjMine * 8) * multiplier);
    const defense = Math.round((cell.stability || 0) + adjOwned * 10);

    if (!cell.ownerId || cell.ownerId === player.id) {
      addInfluence(cell, player.id, Math.round(42 * multiplier + adjMine * 5));
      cell.ownerId = player.id;
      cell.contestedBy = null;
      cell.stability = Math.min(100, (cell.stability || 0) + 16 + adjMine * 4);
    } else {
      addInfluence(cell, player.id, Math.round(attack * 0.9));
      addInfluence(cell, cell.ownerId, -Math.round(attack * 0.75));
      if (attack >= defense || (cell.influence[player.id] || 0) >= (cell.influence[cell.ownerId] || 0) + 18) {
        cell.ownerId = player.id;
        cell.contestedBy = null;
        cell.stability = Math.min(100, 34 + adjMine * 8 + rareCount * 4);
        cell.lastCapturedAt = Date.now();
        captures.push(`${c.letter}${c.row + 1}:${c.col + 1}`);
      } else {
        cell.contestedBy = player.id;
        cell.stability = Math.max(8, cell.stability - Math.round(attack * 0.35));
        contested.push(`${c.letter}${c.row + 1}:${c.col + 1}`);
      }
    }
    applyAlphabetInfluence(game, player, c.letter, wasOwner && wasOwner !== player.id ? 18 : 10, captures, contested);
  }
  return { captures, contested };
}

function addInfluence(cell, playerId, amount) {
  cell.influence[playerId] = Math.max(0, Math.min(100, (cell.influence[playerId] || 0) + amount));
}

function applyAlphabetInfluence(game, player, letter, gain, captures, contested) {
  const sector = game.alphabet[letter];
  const oldOwner = sector.ownerId;
  addInfluence(sector, player.id, gain);
  for (const other of game.players) if (other.id !== player.id) addInfluence(sector, other.id, -Math.floor(gain * 0.6));
  const top = getTopInfluence(sector);
  if (top.value >= 35) sector.ownerId = top.playerId;
  if (oldOwner && oldOwner !== sector.ownerId && sector.ownerId === player.id) captures.push(`SECTOR ${letter}`);
  sector.contestedBy = oldOwner && oldOwner !== player.id && sector.ownerId === oldOwner ? player.id : null;
}

function getTopInfluence(tile) { let best = { playerId: null, value: 0 }; for (const [playerId, value] of Object.entries(tile.influence || {})) if (value > best.value) best = { playerId, value }; return best; }
function hasOccupiedNeighbor(game, row, col) { return neighbors(row, col).some(([r, c]) => game.map[r]?.[c]?.letter); }
function neighbors(row, col) { return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].filter(([r, c]) => r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS); }
function countAdjacentOwned(game, row, col, ownerId) { if (!ownerId) return 0; return neighbors(row, col).filter(([r,c]) => game.map[r]?.[c]?.ownerId === ownerId).length; }
function rotateTurn(game) { game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length; }

function updateScores(game) {
  for (const player of game.players) {
    const mapScore = game.map.flat().filter((cell) => cell.ownerId === player.id).length;
    const alphabetScore = Object.values(game.alphabet).filter((sector) => sector.ownerId === player.id).length;
    const contestedBonus = game.map.flat().filter((cell) => cell.contestedBy === player.id).length * 0.25;
    player.score = Math.round(mapScore + alphabetScore + contestedBonus);
  }
}
function getTimeLeft(game) { if (!game.startedAt) return game.durationSeconds; const elapsed = Math.floor((Date.now() - game.startedAt) / 1000); return Math.max(0, game.durationSeconds - elapsed); }
function updateTimerAndWinner(game) {
  if (game.status !== "active") return;
  updateScores(game);
  if (getTimeLeft(game) > 0) return;
  game.status = "finished";
  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  game.winner = sorted[0].score === sorted[1]?.score ? null : sorted[0];
  game.log.unshift({ type: "system", text: game.winner ? `${game.winner.name} controls the front.` : "The front ends in a draw." });
}

const BOT_DIFFICULTY = {
  easy: { maxCandidates: 25, pickFromTop: 14, skipChance: 0.25, minLength: 3, maxLength: 5 },
  medium: { maxCandidates: 80, pickFromTop: 8, skipChance: 0.08,  },
  hard: { maxCandidates: 180, pickFromTop: 3, skipChance: 0.01, minLength: 4, maxLength: 10 },
  godlike: { maxCandidates: 500, pickFromTop: 1, skipChance: 0, minLength: 5, maxLength: 15 },
};

function normalizeBotDifficulty(level) {
  const key = String(level || "medium").toLowerCase();
  return BOT_DIFFICULTY[key] ? key : "medium";
}

function scoreBotWord(word, difficulty) {
  let score = word.length * 10;
  const last = word[word.length - 1];
  const easyEndings = new Set(["e", "s", "t", "r", "n", "a", "o", "i"]);
  const hardEndings = new Set(["q", "x", "z", "j", "k", "v", "y"]);

  if (difficulty === "easy") {
    score -= Math.max(0, word.length - 4) * 5;
    if (easyEndings.has(last)) score += 12;
  }

  if (difficulty === "medium") {
    if (easyEndings.has(last)) score += 5;
  }

  if (difficulty === "hard") {
    score += Math.max(0, word.length - 5) * 3;
    if (hardEndings.has(last)) score += 10;
  }

  if (difficulty === "godlike") {
    score += Math.max(0, word.length - 5) * 7;
    if (hardEndings.has(last)) score += 22;
  }

  return score;
}

function pickBotWord(candidates, game) {
  const difficulty = normalizeBotDifficulty(game?.botDifficulty);
  const config = BOT_DIFFICULTY[difficulty] || BOT_DIFFICULTY.medium;

  const filtered = candidates
    .filter((word) => word && word.length >= config.minLength && word.length <= config.maxLength)
    .slice(0, config.maxCandidates);

  if (!filtered.length) return candidates[0];

  const ranked = filtered
    .map((word) => ({ word, score: scoreBotWord(word, difficulty) }))
    .sort((a, b) => b.score - a.score);

  const pool = ranked.slice(0, Math.max(1, config.pickFromTop));
  return pool[Math.floor(Math.random() * pool.length)]?.word || ranked[0].word;
}


export function botMove(game) {
  
  const botDifficulty = normalizeBotDifficulty(game?.botDifficulty);
  const botConfig = BOT_DIFFICULTY[botDifficulty] || BOT_DIFFICULTY.medium;
  if (Math.random() < botConfig.skipChance) {
    game.log?.unshift?.({ type: "system", text: `Bot (${botDifficulty}) passed.` });
    game.currentTurnIndex = game.players.findIndex((p) => !p.isBot);
    return game;
  }
const bot = game.players[game.currentTurnIndex];
  if (!bot?.isBot || game.status !== "active") return null;
  const move = pickBotWordMove(game);
  if (!move) {
    game.log.unshift({ type: "system", text: `Wordfront Bot found no word starting with ${game.requiredLetter || "any letter"}.` });
    rotateTurn(game); updateScores(game); return null;
  }
  return playWord(game, bot.id, move.placements);
}

function pickBotWordMove(game) {
  const required = game.requiredLetter;
  const wordPool = WORDS.map((w) => w.toUpperCase()).filter((w) => w.length >= 2 && w.length <= 8 && (!required || w.startsWith(required)));
  shuffle(wordPool);
  let best = null;
  for (const word of wordPool.slice(0, 220)) {
    const move = findPlacementForWord(game, word);
    if (move && (!best || move.score > best.score)) best = move;
  }
  return best;
}

function findPlacementForWord(game, word) {
  const directions = shuffle([{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }]);
  const allStarts = shuffle(Array.from({ length: MAP_ROWS * MAP_COLS }, (_, i) => ({ row: Math.floor(i / MAP_COLS), col: i % MAP_COLS })));
  let best = null;
  for (const start of allStarts) {
    for (const dir of directions) {
      const placements = [];
      let legal = true, attackScore = 0, touchScore = 0;
      for (let i = 0; i < word.length; i++) {
        const row = start.row + dir.dr * i, col = start.col + dir.dc * i;
        if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) { legal = false; break; }
        const cell = game.map[row][col];
        if (cell.letter && cell.letter !== word[i]) { legal = false; break; }
        if (!cell.letter) placements.push({ letter: word[i], row, col, order: i });
        else {
          touchScore += 6;
          if (cell.ownerId && cell.ownerId !== BOT_ID) attackScore += 18 + (cell.stability || 0) * .2;
        }
        for (const [r, c] of neighbors(row, col)) {
          const n = game.map[r][c];
          if (n.letter) touchScore += n.ownerId && n.ownerId !== BOT_ID ? 4 : 1;
        }
      }
      if (!legal || !placements.length) continue;
      if (game.moveCount > 0 && touchScore <= 0) continue;
      try {
        const resolved = resolveWordLine(game, placements, game.moveCount > 0);
        if (resolved.word !== word) continue;
      } catch { continue; }
      const score = attackScore + touchScore + word.length + Math.random();
      if (!best || score > best.score) best = { placements, score };
    }
  }
  return best;
}

export function surrenderGame(game, playerId) {
  if (!game || game.status !== "active") throw new Error("There is no active game to surrender.");
  const loser = game.players.find((p) => p.id === playerId);
  const winner = game.players.find((p) => p.id !== playerId) || null;
  game.status = "finished";
  game.winner = winner;
  game.log.unshift({ type: "system", text: `${loser?.name || "A player"} surrendered. ${winner?.name || "Nobody"} controls the front.` });
  updateScores(game);
  return { ok: true };
}
