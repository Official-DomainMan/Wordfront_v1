import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import { createGame, addPlayer, getPublicGame, playWord, botMove, surrenderGame } from "./gameEngine.js";
import { initDb, saveMatch, getLeaderboard, getRecentMatches } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const games = new Map();
const socketToPlayer = new Map();
const persistedMatches = new Set();

async function persistIfFinished(game) {
  if (!game?.id || persistedMatches.has(game.id)) return;
  if (game.status !== "finished" && !game.winner) return;

  try {
    await saveMatch(game);
    persistedMatches.add(game.id);
  } catch (error) {
    console.error("Failed to persist match:", error);
  }
}



app.post("/api/auth/exchange", async (req, res) => {
  try {
    const { code } = req.body || {};
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!code) return res.status(400).json({ error: "Missing authorization code." });
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET on server." });
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
    });

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await tokenResponse.json();
    if (!tokenResponse.ok) return res.status(tokenResponse.status).json(data);

    res.json({ access_token: data.access_token });
  } catch (error) {
    console.error("Discord auth exchange error:", error);
    res.status(500).json({ error: "Auth exchange failed." });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true, name: "Wordfront Server" }));
app.get("/leaderboard", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    res.json(await getLeaderboard(limit));
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Could not load leaderboard." });
  }
});

app.get("/matches/recent", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    res.json(await getRecentMatches(limit));
  } catch (error) {
    console.error("Recent matches error:", error);
    res.status(500).json({ error: "Could not load recent matches." });
  }
});

app.get("/games", (_req, res) => {
  const openGames = [...games.values()].filter((game) => game.status === "waiting").map((game) => getPublicGame(game));
  res.json(openGames);
});

async function maybeBotTurn(game) {
  const next = game.players[game.currentTurnIndex];
  if (next?.isBot && game.status === "active") {
    setTimeout(async () => {
      try {
        botMove(game);
      } catch (error) {
        game.log.unshift({ type: "system", text: `Bot move failed: ${error.message}. Turn returned to player.` });
        game.currentTurnIndex = game.players.findIndex((p) => !p.isBot);
      }
      io.to(game.id).emit("gameState", getPublicGame(game));
      await persistIfFinished(game);
    }, 650);
  }
}

io.on("connection", (socket) => {
  socket.emit("connected", { socketId: socket.id });


  socket.on("reattachSession", ({ gameId, playerId }, callback) => {
    try {
      const id = String(gameId || "").toUpperCase();
      const game = games.get(id);
      if (!game) throw new Error("Game not found.");
      const player = game.players.find((p) => p.id === playerId);
      if (!player) throw new Error("Player not found in game.");

      socket.join(game.id);
      socketToPlayer.set(socket.id, { gameId: game.id, playerId: player.id });
      callback?.({ ok: true, game: getPublicGame(game), playerId: player.id });
      io.to(game.id).emit("gameState", getPublicGame(game));
    } catch (error) {
      callback?.({ ok: false, error: error.message });
    }
  });

  socket.on("createGame", ({ name }, callback) => {
    try {
      const game = createGame({ hostName: name, solo: false });
      games.set(game.id, game);
      const player = game.players[0];
      socket.join(game.id);
      socketToPlayer.set(socket.id, { gameId: game.id, playerId: player.id });
      io.to(game.id).emit("gameState", getPublicGame(game));
      callback?.({ ok: true, game: getPublicGame(game), playerId: player.id });
    } catch (error) { callback?.({ ok: false, error: error.message }); }
  });

  socket.on("joinGame", async ({ gameId, name }, callback) => {
    try {
      const game = games.get(String(gameId || "").toUpperCase());
      if (!game) throw new Error("Game not found.");
      const player = addPlayer(game, name);
      socket.join(game.id);
      socketToPlayer.set(socket.id, { gameId: game.id, playerId: player.id });
      io.to(game.id).emit("gameState", getPublicGame(game));
      callback?.({ ok: true, game: getPublicGame(game), playerId: player.id });
      maybeBotTurn(game);
    } catch (error) { callback?.({ ok: false, error: error.message }); }
  });

  socket.on("soloGame", ({ name, botDifficulty = "medium" }, callback) => {
    try {
      const game = createGame({ hostName: name, solo: true, botDifficulty });
      games.set(game.id, game);
      const player = game.players[0];
      socket.join(game.id);
      socketToPlayer.set(socket.id, { gameId: game.id, playerId: player.id });
      io.to(game.id).emit("gameState", getPublicGame(game));
      callback?.({ ok: true, game: getPublicGame(game), playerId: player.id });
      maybeBotTurn(game);
    } catch (error) { callback?.({ ok: false, error: error.message }); }
  });

  socket.on("playWord", async ({ placements }, callback) => {
    try {
      const session = socketToPlayer.get(socket.id);
      if (!session) throw new Error("You are not in a game.");
      const game = games.get(session.gameId);
      if (!game) throw new Error("Game not found.");
      playWord(game, session.playerId, placements);
      io.to(game.id).emit("gameState", getPublicGame(game));
      callback?.({ ok: true });
      await maybeBotTurn(game);
      io.to(game.id).emit("gameState", getPublicGame(game));
    } catch (error) { callback?.({ ok: false, error: error.message }); }
  });


  socket.on("surrender", async (_payload, callback) => {
    try {
      const session = socketToPlayer.get(socket.id);
      if (!session) throw new Error("You are not in a game.");
      const game = games.get(session.gameId);
      if (!game) throw new Error("Game not found.");
      surrenderGame(game, session.playerId);
      io.to(game.id).emit("gameState", getPublicGame(game));
      await persistIfFinished(game);
      callback?.({ ok: true });
    } catch (error) { callback?.({ ok: false, error: error.message }); }
  });


  socket.on("leaveGame", ({ gameId }, callback) => {
    try {
      const id = String(gameId || "").toUpperCase();
      if (id) socket.leave(id);
      socketToPlayer.delete(socket.id);
      callback?.({ ok: true });
    } catch (error) { callback?.({ ok: false, error: error.message }); }
  });

  socket.on("disconnect", () => socketToPlayer.delete(socket.id));
});

setInterval(async () => {
  for (const game of games.values()) {
    if (game.status === "active") {
      io.to(game.id).emit("gameState", getPublicGame(game));
      await persistIfFinished(game);
    }
  }
}, 1000);


if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.use((_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

await initDb();

httpServer.listen(PORT, () => console.log(`Wordfront server running on http://localhost:${PORT}`));
