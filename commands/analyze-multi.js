const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { MessageAttachment, Message } = require('discord.js');
const helpers = require('../misc/helpers')
const chartUtils = require('../misc/chart-utils')


const buildHitscoreChart = async (params) => {


	const width = 1280
	const height = 900

	const backgroundColour = 'white'

	const canvas = new ChartJSNodeCanvas({
		width, height, backgroundColour
	})

	let allData = await Promise.all(params.playerIdList.map(async (playerId, index) => {

		let pData = {}

		try {

			console.log(`Fetching data for player ${playerId}, leaderboard ${params.leaderboardId}...`)
			const replayData = await helpers.getReplayData({
				playerId: playerId,
				leaderboardId: params.leaderboardId,
			})

			const scoringData = await helpers.getScoringDataFromReplayData(replayData)
			const playerData = await helpers.getPlayerInfo(playerId)
			console.log(`Fetching for player ${playerId} complete`)

			pData = {
				playerId: playerId,
				rank: index + 1,
				scoringData: scoringData,
				playerData: playerData,
				replayData: replayData
			}

		} catch (e) {
			console.error(e)
			pData = {
				error: true
			}
		} finally {
			return pData
		}
	}))

	allData = allData.filter(data => !data.error)

	const allHitscoreDatasets = allData.map(data => {
		const hitscoreData = chartUtils.buildMultiHitscoreData(data)
		const dataset = {
			label: data.playerData.name,
			data: chartUtils.buildMultiHitscoreChartData(hitscoreData, data.replayData.scores.length),
			fill: false,
			borderColor: chartUtils.getMultiLineRankColor(data.rank),
			backgroundColor: chartUtils.getMultiLineRankColor(data.rank),
			pointBackgroundColor: chartUtils.getMultiLineRankColor(data.rank),
			pointRadius: 5,
			borderWidth: 3,
		}
		if (data.rank > 3) {
			dataset.borderWidth = 2
			dataset.pointRadius = 3
		}
		return dataset
	})

	const chartData = {
		labels: chartUtils.getHitscoreBarGraphLabels({}),
		datasets: allHitscoreDatasets,
	}

	const chartTitle = chartUtils.getChartTitle(allData[0].scoringData.mapData, params.scoresaberLeaderboardData)
	const chartFont = "Consolas"

	const config = {
		type: 'line',
		data: chartData,
		options: {
			layout: {
				padding: 20
			},
			scales: {
				x: {
					grid: {
						lineWidth: 2,
						color: 'rgba(0,0,0,0.3)',
					}
				},
				y: {
					grid: {
						lineWidth: 2,
						color: 'rgba(0,0,0,0.3)',
					},
					beginAtZero: true
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
			}
		},
	};

	const image = await canvas.renderToBuffer(config)
	return image

}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('analyze-multi')
		.setDescription('Multi-analyze a replay.')
		.addStringOption(option =>
			option.setName("report")
				.setDescription("Which report to run?")
				.setRequired(true)
				.addChoice('Hitscore', "hitscore")
				.addChoice('Hitscore 2', "hitscore2")
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
            let playerList = interaction.options.getString("player_list")

            let playerIdList = []
            if (method === "top10") {
                playerIdList = await helpers.getTop10PlayerIds(leaderboardId)
                if (playerList && playerList.length > 0) {
                    playerIdList.concat(helpers.extractPlayerIds(playerList))
                }
            } else if (method === "playerIdList") {
                playerIdList = helpers.extractPlayerIds(playerList)
            }


			const scoresaberLeaderboardData = await helpers.getScoresaberLeaderboardData(leaderboardId)

			let images = []

			let params = {
				playerIdList: playerIdList,
				leaderboardId: leaderboardId,
				scoresaberLeaderboardData: scoresaberLeaderboardData,
			}

			if (report === "hitscore") {
				console.log("Building hitscore chart...")
				let image = await buildHitscoreChart(params)
				images.push(image)
			}

			let attachments = []
			for (const image of images) {
				attachments.push(new MessageAttachment(image))
			}

			await interaction.editReply({files: attachments});
			
        } catch (e) {
            console.error(e)
            interaction.editReply(`An error occurred! Please check the command and try again.`);
        }

	},
};