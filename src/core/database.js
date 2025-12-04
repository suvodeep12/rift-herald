const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

let db;

async function setupDatabase() {
  db = await open({ filename: "./database.sqlite", driver: sqlite3.Database });

  // Table 1: Configuration per Discord Server
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        role_id TEXT
    )
  `);

  // Table 2: Tracked Players (Linked to Guilds)
  // We use PUUID + guild_id as the unique key.
  // This allows Server A and Server B to both track "Faker" independently.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        puuid TEXT NOT NULL,
        gameName TEXT NOT NULL,
        tagLine TEXT NOT NULL,
        region TEXT NOT NULL DEFAULT 'sg2',
        profileIconId INTEGER DEFAULT 29,
        lastLP INTEGER DEFAULT 0,
        lastTier TEXT DEFAULT 'UNRANKED',
        lastRank TEXT DEFAULT '',
        lastWins INTEGER DEFAULT 0,
        lastLosses INTEGER DEFAULT 0,
        updatedAt DATETIME,
        UNIQUE(guild_id, puuid)
    )
  `);

  console.log("✅ Database initialized (Multi-guild + PUUID support).");
}

// --- GUILD CONFIG METHODS ---
async function setChannel(guildId, channelId) {
  return db.run(
    `INSERT INTO guild_config (guild_id, channel_id) VALUES (?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET channel_id = ?`,
    guildId,
    channelId,
    channelId
  );
}

async function getChannel(guildId) {
  const row = await db.get(
    "SELECT channel_id FROM guild_config WHERE guild_id = ?",
    guildId
  );
  return row ? row.channel_id : null;
}

// --- PLAYER METHODS ---
async function addPlayer(guildId, data) {
  const now = new Date().toISOString();
  return db.run(
    `INSERT INTO tracked_players 
    (guild_id, puuid, gameName, tagLine, region, profileIconId, lastLP, lastTier, lastRank, lastWins, lastLosses, updatedAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, puuid) DO UPDATE SET 
      gameName = excluded.gameName,
      tagLine = excluded.tagLine,
      lastLP = excluded.lastLP,
      lastTier = excluded.lastTier,
      lastRank = excluded.lastRank,
      updatedAt = excluded.updatedAt`,
    guildId,
    data.puuid,
    data.gameName,
    data.tagLine,
    data.region || "sg2",
    data.profileIconId || 29,
    data.lp,
    data.tier,
    data.rank,
    data.wins,
    data.losses,
    now
  );
}

async function getAllPlayers() {
  // Returns all players across all servers
  return db.all("SELECT * FROM tracked_players");
}

async function removePlayer(guildId, puuid) {
  return db.run(
    "DELETE FROM tracked_players WHERE guild_id = ? AND puuid = ?",
    guildId,
    puuid
  );
}

module.exports = {
  setupDatabase,
  setChannel,
  getChannel,
  addPlayer,
  getAllPlayers,
  removePlayer,
};
