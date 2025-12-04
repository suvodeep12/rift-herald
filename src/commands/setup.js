const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../core/database.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure where the Rift Herald posts updates.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to post updates in")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Only Admins can run this

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    // Save to DB
    await db.setChannel(interaction.guildId, channel.id);

    await interaction.reply({
      content: `✅ **Setup Complete!** Daily Rift Herald updates will be posted in ${channel}.`,
      ephemeral: true,
    });
  },
};
