const db = require("../core/database");
const { getRankedData } = require("../core/riot-api");
const { createUpdateEmbed } = require("../utils/embeds");
const fetch = require("node-fetch"); // We use direct fetch for total control

// Clean the key (Fixes whitespace issues)
const apiKey = process.env.RIOT_API_KEY ? process.env.RIOT_API_KEY.trim() : "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// HELPER: Map specific server to the correct Riot Regional Cluster
function getRegionalHost(region) {
  const r = region.toLowerCase();
  // NA/SA -> Americas
  if (["na1", "br1", "la1", "la2"].includes(r))
    return "americas.api.riotgames.com";
  // KR/JP -> Asia
  if (["kr", "jp1"].includes(r)) return "asia.api.riotgames.com";
  // EU -> Europe
  if (["eun1", "euw1", "tr1", "ru"].includes(r))
    return "europe.api.riotgames.com";
  // OCE/SEA -> SEA (This is the critical fix for SG2)
  if (["oc1", "ph2", "sg2", "th2", "tw2", "vn2"].includes(r))
    return "sea.api.riotgames.com";

  // Default to SEA if unsure (safest for your use case)
  return "sea.api.riotgames.com";
}

async function getLastMatchStats(puuid, region) {
  const host = getRegionalHost(region);

  try {
    // 1. Get Match ID List
    const listUrl = `https://${host}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`;
    const listRes = await fetch(listUrl, {
      headers: { "X-Riot-Token": apiKey },
    });

    if (listRes.status === 403)
      throw new Error(`403 Forbidden on List URL: ${listUrl}`);
    if (!listRes.ok) throw new Error(`Status ${listRes.status} on List URL`);

    const matchIds = await listRes.json();
    if (!matchIds || matchIds.length === 0) return null;

    // 2. Get Match Details
    const matchId = matchIds[0];
    const detailUrl = `https://${host}/lol/match/v5/matches/${matchId}`;
    const detailRes = await fetch(detailUrl, {
      headers: { "X-Riot-Token": apiKey },
    });

    if (!detailRes.ok)
      throw new Error(`Status ${detailRes.status} on Match Detail`);

    const matchData = await detailRes.json();

    // 3. Extract Info
    const participant = matchData.info.participants.find(
      (p) => p.puuid === puuid
    );
    if (!participant) return null;

    return {
      championName: participant.championName,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      win: participant.win,
      cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
    };
  } catch (e) {
    console.error(`Error fetching match stats:`, e.message);
    return null; // Return null so the code can continue without match data
  }
}

module.exports = async (client) => {
  console.log("⏰ Running Daily Rift Herald Check...");

  try {
    const allPlayers = await db.getAllPlayers();
    if (allPlayers.length === 0) {
      console.log("No players to check.");
      return;
    }

    for (const player of allPlayers) {
      // Fetch Fresh Rank
      const currentData = await getRankedData(player.gameName, player.tagLine);

      if (!currentData.success) {
        console.log(`Failed to fetch ${player.gameName}`);
        continue;
      }

      const lpChange = currentData.lp - player.lastLP;
      const rankChanged =
        currentData.tier !== player.lastTier ||
        currentData.rank !== player.lastRank;

      // Update Database
      await db.addPlayer(player.guild_id, {
        puuid: currentData.puuid,
        gameName: player.gameName,
        tagLine: player.tagLine,
        region: player.region,
        profileIconId: player.profileIconId,
        lp: currentData.lp,
        tier: currentData.tier,
        rank: currentData.rank,
        wins: currentData.wins,
        losses: currentData.losses,
      });

      if (rankChanged || lpChange !== 0) {
        const targetChannelId = await db.getChannel(player.guild_id);
        if (targetChannelId) {
          try {
            const channel = await client.channels.fetch(targetChannelId);
            if (channel) {
              // Fetch Match Data Context using the correct region
              const matchStats = await getLastMatchStats(
                player.puuid,
                player.region
              );

              const oldData = {
                lp: player.lastLP,
                tier: player.lastTier,
                rank: player.lastRank,
                wins: player.lastWins,
                losses: player.lastLosses,
              };

              const embed = createUpdateEmbed(
                player,
                oldData,
                currentData,
                channel.guild,
                matchStats
              );
              await channel.send({ embeds: [embed] });
              console.log(`-> Posted update for ${player.gameName}`);
            }
          } catch (err) {
            console.error(`-> Error posting:`, err.message);
          }
        }
      }
      await sleep(1000);
    }
  } catch (error) {
    console.error("CRITICAL TASK ERROR:", error);
  }
};
