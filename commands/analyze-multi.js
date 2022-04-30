const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { MessageAttachment, Message } = require('discord.js');
const fetch = require('node-fetch');
const helpers = require('../misc/helpers')
const chartUtils = require('../misc/chart-utils')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('analyze-multi')
		.setDescription('Multi-analyze a replay.')
		.addStringOption(option =>
			option.setName("report")
				.setDescription("Which report to run?")
				.setRequired(true)
				.addChoice('Hitscore', "hitscore")
		)
		.addStringOption(option =>
			option.setName("method")
				.setDescription("Specify how to include the players.")
				.setRequired(true)
				.addChoice('Top 10', "top10")
				.addChoice('Player Id List', "playerIdList")
		)
		.addStringOption(option =>
			option.setName("leaderboard_id")
				.setDescription("Ranked Leaderboard ID.")
				.setRequired(true)
		)
		.addStringOption(option =>
			option.setName("player_list")
				.setDescription("Comma-separated list of players to include.")
				.setRequired(false)
		),
	async execute(interaction) {

		await interaction.deferReply();

		try {

			let report = interaction.options.getString("report")
			let method = interaction.options.getString("method")
			let leaderboardId = interaction.options.getString("leaderboard_id")
			let fileURL = interaction.options.getString("file_url")
            let playerList = interaction.options.getString("playerList")

            let playerIdList = []
            if (method === "top10") {
                playerIdList = helpers.getTop10PlayerIds(leaderboardId)
                if (playerList && playerList.length > 0) {
                    playerIdList = helpers.extractPlayerIds(playerList)
                }
            } else if (method === "playerList") {
                playerIdList = helpers.extractPlayerIds(playerList)
            }

            // TODO

        } catch (e) {
            console.error(e)
        } finally {
            // TODO
        }

	},
};