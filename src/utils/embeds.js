const { EmbedBuilder } = require("discord.js");

const RANK_COLORS = {
  IRON: 0x565351,
  BRONZE: 0x7c4932,
  SILVER: 0xaeb2b7,
  GOLD: 0xecc562,
  PLATINUM: 0x3e7b83,
  EMERALD: 0x1d7543,
  DIAMOND: 0x5e79d1,
  MASTER: 0x9d54b8,
  GRANDMASTER: 0xcd4646,
  CHALLENGER: 0xf4c874,
  UNRANKED: 0x2f3136,
};

const EMOJI_MAP = {
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

/**
 * Helper to find the custom emoji in the guild
 */
function getRankEmoji(guild, tier) {
  if (!guild || !tier) return "";
  const emojiName = EMOJI_MAP[tier];
  if (!emojiName) return "";

  const emoji = guild.emojis.cache.find((e) => e.name === emojiName);
  return emoji ? emoji.toString() : "";
}

/**
 * Helper to generate a safe OP.GG URL
 */
function getOpGgUrl(region, gameName, tagLine) {
  const safeName = encodeURIComponent(gameName);
  const safeTag = encodeURIComponent(tagLine);
  return `https://www.op.gg/summoners/${region}/${safeName}-${safeTag}`;
}

/**
 * Generates the Daily Update Embed
 */
function createUpdateEmbed(player, oldData, newData, guild, matchData = null) {
  const lpChange = newData.lp - oldData.lp;
  const isPromotion = lpChange > 0;
  const emoji = getRankEmoji(guild, newData.tier);

  const rankDisplay = `${emoji} ${newData.tier} ${newData.rank}`.trim();
  const url = getOpGgUrl(player.region, player.gameName, player.tagLine);

  const embed = new EmbedBuilder()
    .setTitle(`${player.gameName} #${player.tagLine}`)
    .setURL(url) // <--- FIXED: Now uses the safe URL
    .setColor(RANK_COLORS[newData.tier] || RANK_COLORS.UNRANKED)
    .setTimestamp();

  // Thumbnail: Champion or Profile Icon
  if (matchData) {
    embed.setThumbnail(
      `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${matchData.championName}.png`
    );
  } else {
    embed.setThumbnail(
      `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${
        player.profileIconId || 29
      }.png`
    );
  }

  let desc = "";

  if (oldData.tier !== newData.tier) {
    const oldEmoji = getRankEmoji(guild, oldData.tier);
    desc += `## ${
      isPromotion ? "🚀 PROMOTION" : "📉 DEMOTION"
    }\nMoved from ${oldEmoji} **${oldData.tier}** to ${emoji} **${
      newData.tier
    }**!\n\n`;
  }

  // Match Context
  if (matchData) {
    const outcome = matchData.win ? "Victory 🏆" : "Defeat 💀";
    const kda = `${matchData.kills}/${matchData.deaths}/${matchData.assists}`;
    desc += `**Last Game:** ${outcome}\n**Champion:** ${matchData.championName} (${kda})\n**CS:** ${matchData.cs}\n`;
  }

  embed.setDescription(desc);

  const arrow = lpChange > 0 ? "📈" : "📉";
  embed.addFields(
    { name: "Current Rank", value: rankDisplay, inline: true },
    {
      name: "LP Change",
      value: `${arrow} **${newData.lp} LP** (${
        lpChange >= 0 ? "+" : ""
      }${lpChange})`,
      inline: true,
    },
    {
      name: "Total Win Rate",
      value: `${calculateWinRate(newData.wins, newData.losses)}%`,
      inline: true,
    }
  );

  return embed;
}

/**
 * Generates the /lolprofile Embed
 */
function createProfileEmbed(data, gameName, tagLine, guild) {
  const emoji = getRankEmoji(guild, data.tier);
  const rankDisplay =
    data.tier === "UNRANKED"
      ? "Unranked"
      : `${emoji} ${data.tier} ${data.rank}`.trim();
  const url = getOpGgUrl("sg2", gameName, tagLine); // defaulting to sg2 or pass region if available

  return new EmbedBuilder()
    .setColor(RANK_COLORS[data.tier] || RANK_COLORS.UNRANKED)
    .setTitle(`Profile: ${gameName}#${tagLine}`)
    .setURL(url) // <--- FIXED
    .setThumbnail(
      `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${
        data.profileIconId || 29
      }.png`
    )
    .addFields(
      { name: "Current Rank", value: rankDisplay, inline: true },
      { name: "League Points", value: `**${data.lp} LP**`, inline: true },
      {
        name: "Record",
        value: `${data.wins}W - ${data.losses}L (${calculateWinRate(
          data.wins,
          data.losses
        )}%)`,
        inline: true,
      }
    )
    .setTimestamp();
}

function calculateWinRate(wins, losses) {
  const total = wins + losses;
  if (total === 0) return 0;
  return ((wins / total) * 100).toFixed(1);
}

module.exports = { createUpdateEmbed, createProfileEmbed, getRankEmoji };
