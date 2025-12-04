const { SlashCommandBuilder } = require("discord.js");
const { getRankedData } = require("../core/riot-api.js");
const { createProfileEmbed } = require("../utils/embeds.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lolprofile")
    .setDescription("Lookup a player's rank directly.")
    .addStringOption((option) =>
      option.setName("riot_id").setDescription("Name#Tag").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const riotId = interaction.options.getString("riot_id");
    if (!riotId.includes("#")) {
      return interaction.editReply("❌ Use format: `Name#Tag`");
    }

    const [gameName, tagLine] = riotId.split("#");
    const data = await getRankedData(gameName, tagLine);

    if (!data.success) {
      return interaction.editReply(`❌ Error: ${data.error}`);
    }

    // Use the centralized embed creator with Emojis
    const embed = createProfileEmbed(
      data,
      gameName,
      tagLine,
      interaction.guild
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
