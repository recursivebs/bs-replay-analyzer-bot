const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { MessageAttachment, Message } = require('discord.js');
const fetch = require('node-fetch');
const helpers = require('../misc/helpers')
const chartUtils = require('../misc/chart-utils')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('analyze')
		.setDescription('Analyze a replay')
		.addStringOption(option =>
			option.setName("player_id")
				.setDescription("Scoresaber ID of player.")
				.setRequired(true)
		)
		.addStringOption(option =>
			option.setName("leaderboard_id")
				.setDescription("Ranked Leaderboard ID.")
				.setRequired(true)
		)
		,
	async execute(interaction) {

		await interaction.deferReply();

		let playerID = helpers.extractPlayerId(interaction.options.getString("player_id"));
		let leaderboardID = interaction.options.getString("leaderboard_id");

		const replayEndpoint = `https://sspreviewdecode.azurewebsites.net/?playerID=${playerID}&songID=${leaderboardID}`
		const replayResponse = await fetch(replayEndpoint)
		const replayDataStr = await replayResponse.json()
		const replayData = JSON.parse(replayDataStr)
		const scoringData = await helpers.getScoringDataFromReplayData(replayData)
		const playerData = await helpers.getPlayerInfo(playerID)

		const width = 1280
		const height = 900

		const backgroundColour = 'white'

		const canvas = new ChartJSNodeCanvas({
			width, height, backgroundColour
		})


		const chartData = helpers.buildScatterPlotData(scoringData.noteTimes, scoringData.averagedScores)
		let datasets = []
		const accProfile = chartUtils.accProfiles.standard

		datasets = datasets.concat(helpers.buildScatterDataSets(chartData, accProfile))
		datasets = datasets.concat(helpers.buildFullComboAccDataSet(scoringData, accProfile))

		let data = {
			datasets: datasets
		}

		const chartFont = "Consolas"
		const chartTitle = chartUtils.getChartTitle(scoringData.mapData)
		const chartSubtitle = chartUtils.getChartSubtitle(scoringData, playerData)

		const configuration = {
			data: data,
			options: {
				layout: {
					padding: 20
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Time (s)',
							font: {
								family: chartFont
							}
						},
						type: 'linear',
						position: 'bottom',
						ticks: {
							font: {
								family: chartFont
							}
						}
					},
					y: {
						title: {
							display: true,
							text: 'Accuracy',
							font: {
								family: chartFont
							}
						},
						ticks: {
							font: {
								family: chartFont
							}
						}
					}
				},
				plugins: {
					legend: {
						labels: {
							font: {
								family: chartFont,
								size: 16
							},
						},
						position: 'top',
					},
					title: {
						display: true,
						text: chartTitle,
						font: {
							family: chartFont,
							size: 32
						}
					},
					subtitle: {
						display: true,
						text: chartSubtitle,
						font: {
							family: chartFont,
							size: 24
						}
					}
				}
			}
		}

		console.log(scoringData.totalScore)
		console.log(scoringData.maxScore)

		const image = await canvas.renderToBuffer(configuration)
		const attachment = new MessageAttachment(image)
		await interaction.editReply({files: [attachment]});

	},
};