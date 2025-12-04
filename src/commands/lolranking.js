const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../core/database");
const { getRankedData } = require("../core/riot-api");
const config = require("../config");

// Sorting Values
const rankValues = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 2800,
  CHALLENGER: 2800,
  UNRANKED: -100,
};
const divisionValues = { IV: 0, III: 100, II: 200, I: 300 };

// 1. Map API Tier names to your Discord Emoji names
const rankEmojiMap = {
  IRON: "iron",
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
  EMERALD: "emerald",
  DIAMOND: "diamond",
  MASTER: "master",
  GRANDMASTER: "grandmaster",
  CHALLENGER: "challenger",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lolranking")
    .setDescription("Displays a live ranked leaderboard for this server."),

  async execute(interaction) {
    await interaction.deferReply();

    const allPlayers = await db.getAllPlayers();
    const trackedPlayers = allPlayers.filter(
      (p) => p.guild_id === interaction.guildId
    );

    if (trackedPlayers.length === 0) {
      return interaction.editReply(
        "❌ No players are being tracked. Use `/track`."
      );
    }

    await interaction.editReply(
      `🔄 Fetching live data for ${trackedPlayers.length} players...`
    );

    const fetchedPlayers = [];

    // Fetch live data
    for (const player of trackedPlayers) {
      const data = await getRankedData(player.gameName, player.tagLine);

      if (data.success) {
        fetchedPlayers.push({ ...player, ...data });
        // Silent DB update to keep data fresh
        await db.addPlayer(player.guild_id, {
          puuid: data.puuid,
          gameName: player.gameName,
          tagLine: player.tagLine,
          region: player.region,
          profileIconId: player.profileIconId,
          lp: data.lp,
          tier: data.tier,
          rank: data.rank,
          wins: data.wins,
          losses: data.losses,
        });
      } else {
        // Fallback to cached data
        fetchedPlayers.push({
          ...player,
          lp: player.lastLP,
          tier: player.lastTier,
          rank: player.lastRank,
          wins: player.lastWins,
          losses: player.lastLosses,
        });
      }
      await sleep(200);
    }

    // Sort by Score
    const sortedPlayers = fetchedPlayers.sort((a, b) => {
      const scoreA =
        (rankValues[a.tier] || 0) + (divisionValues[a.rank] || 0) + a.lp;
      const scoreB =
        (rankValues[b.tier] || 0) + (divisionValues[b.rank] || 0) + b.lp;
      return scoreB - scoreA;
    });

    // Build Embed
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`🏆 Leaderboard: ${interaction.guild.name}`)
      .setTimestamp()
      .setFooter({ text: `Updated: ${new Date().toLocaleTimeString()}` });

    let description = "";

    sortedPlayers.forEach((p, index) => {
      // 2. Find the Emoji
      const tierName = p.tier || "UNRANKED";
      const emojiName = rankEmojiMap[tierName];

      // Look up the emoji in the Guild's cache
      const customEmoji = emojiName
        ? interaction.guild.emojis.cache.find((e) => e.name === emojiName)
        : "";

      const rankString =
        p.tier === "UNRANKED" ? "Unranked" : `${p.tier} ${p.rank}`;

      // Calculate Win Rate
      const totalGames = p.wins + p.losses;
      const winRate =
        totalGames > 0 ? ((p.wins / totalGames) * 100).toFixed(1) + "%" : "0%";

      // Placement Medals
      let placementEmoji = `**#${index + 1}**`;
      if (index === 0) placementEmoji = "🥇";
      if (index === 1) placementEmoji = "🥈";
      if (index === 2) placementEmoji = "🥉";

      // 3. Construct the Line (Emoji + Text)
      description += `${placementEmoji} **${p.gameName}** \n└ ${customEmoji} ${rankString} (${p.lp} LP) • WR: ${winRate}\n\n`;
    });

    embed.setDescription(description || "No data.");

    await interaction.editReply({ content: "", embeds: [embed] });
  },
};
