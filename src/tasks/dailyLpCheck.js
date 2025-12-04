const db = require("../core/database");
const { getRankedData } = require("../core/riot-api"); // You might need to export a new match fetcher here
const { createUpdateEmbed } = require("../utils/embeds");
const { LolApi, Constants } = require("twisted"); // Import Twisted directly for the match fetch

// Initialize API for Match fetching
const api = new LolApi({ key: process.env.RIOT_API_KEY });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLastMatchStats(puuid, region) {
  try {
    // 1. Get Match ID (RegionGroup ASIA for SG2)
    const matches = await api.Match.list(puuid, Constants.RegionGroups.ASIA, {
      count: 1,
    });
    if (matches.response.length === 0) return null;

    // 2. Get Match Details
    const matchData = await api.Match.get(
      matches.response[0],
      Constants.RegionGroups.ASIA
    );

    // 3. Find our player
    const participant = matchData.response.info.participants.find(
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
    console.error("Error fetching match stats:", e.message);
    return null;
  }
}

module.exports = async (client) => {
  console.log("⏰ Running Daily Rift Herald Check...");

  try {
    const allPlayers = await db.getAllPlayers();
    if (allPlayers.length === 0) return;

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

      // IF CHANGED: Post Update
      if (rankChanged || lpChange !== 0) {
        const targetChannelId = await db.getChannel(player.guild_id);
        if (targetChannelId) {
          try {
            const channel = await client.channels.fetch(targetChannelId);
            if (channel) {
              // NEW: Fetch Match Data Context
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
              console.log(
                `-> Posted update for ${player.gameName} with Match Details`
              );
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
