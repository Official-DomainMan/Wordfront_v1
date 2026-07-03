import pg from "pg";

const { Pool } = pg;

const hasDatabase = Boolean(process.env.DATABASE_URL);

export const pool = hasDatabase
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
    })
  : null;

export async function initDb() {
  if (!pool) {
    console.log("Wordfront persistence: DATABASE_URL not set. Running without Postgres persistence.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      status TEXT,
      winner_name TEXT,
      winner_id TEXT,
      player_count INTEGER,
      move_count INTEGER,
      duration_seconds INTEGER,
      final_state JSONB
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_stats (
      player_key TEXT PRIMARY KEY,
      display_name TEXT,
      games_played INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Wordfront persistence: Postgres connected.");
}

export async function saveMatch(game) {
  if (!pool || !game?.id) return;

  const winner = game.winner || null;
  const players = game.players || [];

  await pool.query(
    `
    INSERT INTO matches (
      id, ended_at, status, winner_name, winner_id, player_count,
      move_count, duration_seconds, final_state
    )
    VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      ended_at = EXCLUDED.ended_at,
      status = EXCLUDED.status,
      winner_name = EXCLUDED.winner_name,
      winner_id = EXCLUDED.winner_id,
      player_count = EXCLUDED.player_count,
      move_count = EXCLUDED.move_count,
      duration_seconds = EXCLUDED.duration_seconds,
      final_state = EXCLUDED.final_state
    `,
    [
      game.id,
      game.status || "unknown",
      winner?.name || null,
      winner?.id || null,
      players.length,
      game.moveCount || 0,
      game.durationSeconds || 0,
      JSON.stringify(game),
    ]
  );

  for (const player of players) {
    const playerKey = player.id || player.name;
    const won = winner?.id && player.id === winner.id ? 1 : 0;
    const score = Number(player.score || 0);

    await pool.query(
      `
      INSERT INTO player_stats (
        player_key, display_name, games_played, wins, total_score, updated_at
      )
      VALUES ($1, $2, 1, $3, $4, NOW())
      ON CONFLICT (player_key) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        games_played = player_stats.games_played + 1,
        wins = player_stats.wins + EXCLUDED.wins,
        total_score = player_stats.total_score + EXCLUDED.total_score,
        updated_at = NOW()
      `,
      [playerKey, player.name || "Player", won, score]
    );
  }
}

export async function getLeaderboard(limit = 10) {
  if (!pool) return [];

  const result = await pool.query(
    `
    SELECT
      player_key,
      display_name,
      games_played,
      wins,
      total_score,
      CASE
        WHEN games_played = 0 THEN 0
        ELSE ROUND((wins::numeric / games_played::numeric) * 100, 1)
      END AS win_rate
    FROM player_stats
    ORDER BY wins DESC, total_score DESC, games_played DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

export async function getRecentMatches(limit = 10) {
  if (!pool) return [];

  const result = await pool.query(
    `
    SELECT id, created_at, ended_at, status, winner_name, player_count, move_count, duration_seconds
    FROM matches
    ORDER BY ended_at DESC NULLS LAST, created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}
