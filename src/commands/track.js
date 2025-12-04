const { SlashCommandBuilder } = require("discord.js");
const db = require("../core/database.js");
const { getRankedData } = require("../core/riot-api.js"); // Ensure this points to your twisted wrapper

module.exports = {
  data: new SlashCommandBuilder()
    .setName("track")
    .setDescription("Track a player's rank updates.")
    .addStringOption((option) =>
      option
        .setName("riot_id")
        .setDescription("Format: GameName#Tag")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("The server region (default: SG2)")
        .setRequired(false)
        .addChoices(
          { name: "Singapore (SG2)", value: "sg2" },
          { name: "North America (NA1)", value: "na1" },
          { name: "EU West (EUW1)", value: "euw1" },
          { name: "Korea (KR)", value: "kr" },
          { name: "Vietnam (VN2)", value: "vn2" }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const riotIdInput = interaction.options.getString("riot_id");
    const region = interaction.options.getString("region") || "sg2"; // Default to SG2

    if (!riotIdInput.includes("#")) {
      return interaction.editReply(
        "❌ Invalid format. Please use `Name#Tag` (e.g. `Faker#LCK`)."
      );
    }

    const [gameName, tagLine] = riotIdInput.split("#");

    // 1. Fetch Data
    const data = await getRankedData(gameName, tagLine);

    if (!data.success) {
      return interaction.editReply(
        `❌ **Error:** ${data.error}. Check spelling or region.`
      );
    }

    // 2. Save to DB
    try {
      await db.addPlayer(interaction.guildId, {
        puuid: data.puuid,
        gameName: gameName,
        tagLine: tagLine,
        region: region,
        // Since the pure Twisted PUUID method doesn't give icons, we default to 29
        // or you can add a Summoner-V4 call in riot-api if you really want icons.
        profileIconId: 29,
        lp: data.lp,
        tier: data.tier,
        rank: data.rank,
        wins: data.wins,
        losses: data.losses,
      });

      // 3. Elegant Response
      const tierEmoji = data.tier === "UNRANKED" ? "🛡️" : "⚔️";

      await interaction.editReply({
        content: `✅ **Tracking Enabled!**\nNow tracking **${gameName}#${tagLine}** on **${region.toUpperCase()}**.\nCurrent Rank: ${tierEmoji} **${
          data.tier
        } ${data.rank}** (${data.lp} LP)`,
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Database error. Please try again.");
    }
  },
};
