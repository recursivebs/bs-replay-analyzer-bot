module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
        let client = interaction.client;
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
	},
};