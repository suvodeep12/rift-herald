const db = require("../core/database");
const { getRankedData } = require("../core/riot-api");
const { createUpdateEmbed } = require("../utils/embeds");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async (client) => {
  console.log("⏰ Running Daily Rift Herald Check...");

  try {
    const allPlayers = await db.getAllPlayers();

    if (allPlayers.length === 0) {
      console.log("-> No players to check.");
      return;
    }

    console.log(`-> Checking ${allPlayers.length} players...`);

    for (const player of allPlayers) {
      // Fetch Fresh Data
      const currentData = await getRankedData(player.gameName, player.tagLine);

      if (!currentData.success) {
        console.log(`Failed to fetch ${player.gameName}: ${currentData.error}`);
        continue;
      }

      // Compare Old vs New
      const lpChange = currentData.lp - player.lastLP;
      const rankChanged =
        currentData.tier !== player.lastTier ||
        currentData.rank !== player.lastRank;

      // Save New Data
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

      // Post Update if Significant Change
      if (rankChanged || lpChange !== 0) {
        const targetChannelId = await db.getChannel(player.guild_id);

        if (!targetChannelId) continue;

        try {
          const channel = await client.channels.fetch(targetChannelId);
          if (channel) {
            const oldData = {
              lp: player.lastLP,
              tier: player.lastTier,
              rank: player.lastRank,
              wins: player.lastWins,
              losses: player.lastLosses,
            };

            // PASS THE GUILD HERE so we get the emojis
            const embed = createUpdateEmbed(
              player,
              oldData,
              currentData,
              channel.guild
            );

            await channel.send({ embeds: [embed] });
            console.log(`-> Posted update for ${player.gameName}`);
          }
        } catch (err) {
          console.error(
            `-> Error posting to channel ${targetChannelId}:`,
            err.message
          );
        }
      }
      await sleep(1000);
    }
  } catch (error) {
    console.error("CRITICAL TASK ERROR:", error);
  }
};
