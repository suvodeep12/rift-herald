const { SlashCommandBuilder } = require("discord.js");
const db = require("../core/database.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("untrack")
    .setDescription("Stop tracking a player in this server.")
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Select player to remove")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    // Get all players, filter for THIS guild
    const allPlayers = await db.getAllPlayers();
    const guildPlayers = allPlayers.filter(
      (p) => p.guild_id === interaction.guildId
    );

    const filtered = guildPlayers.filter(
      (player) =>
        player.gameName.toLowerCase().includes(focusedValue) ||
        player.tagLine.toLowerCase().includes(focusedValue)
    );

    // Return choices: Name -> PUUID
    await interaction.respond(
      filtered.slice(0, 25).map((player) => ({
        name: `${player.gameName}#${
          player.tagLine
        } (${player.region.toUpperCase()})`,
        value: player.puuid,
      }))
    );
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const puuid = interaction.options.getString("player");

    // Remove by Guild ID + PUUID
    const result = await db.removePlayer(interaction.guildId, puuid);

    // sqlite3 run returns 'changes' in result (if using sqlite driver properly wrapper)
    // But standard db.run simply resolves. We assume success if no error.
    await interaction.editReply(
      `✅ Successfully stopped tracking that player.`
    );
  },
};
