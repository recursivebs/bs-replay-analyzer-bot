const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { MessageAttachment, Message } = require('discord.js');
const fetch = require('node-fetch');
const helpers = require('../misc/helpers')
const chartUtils = require('../misc/chart-utils')


const buildAccGraphChart = async (params) => {

	const width = 1280
	const height = 900

	const backgroundColour = 'white'

	const canvas = new ChartJSNodeCanvas({
		width, height, backgroundColour
	})

	const chartData = helpers.buildScatterPlotData(params.scoringData.noteTimes, params.scoringData.averagedScores)
	let datasets = []
	const accProfile = chartUtils.accProfiles.standard

	datasets = datasets.concat(helpers.buildScatterDataSets(chartData, accProfile))
	datasets = datasets.concat(helpers.buildFullComboAccDataSet(params.scoringData, accProfile, false))

	let data = {
		datasets: datasets
	}

	const chartFont = "Consolas"
	const chartTitle = chartUtils.getChartTitle(params.scoringData.mapData)
	const chartSubtitle = chartUtils.getChartSubtitle(params.scoringData, params.playerData)

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

	const image = await canvas.renderToBuffer(configuration)
	return image

}


const buildSplitAccGraphChart = async (params) => {

	const width = 1280
	const height = 900

	const backgroundColour = 'white'

	const canvas = new ChartJSNodeCanvas({
		width, height, backgroundColour
	})

	let chartData = {}
	if (params.hand === "left") {
		chartData = helpers.buildScatterPlotData(
			params.scoringData.handData.left.noteTimes,
			params.scoringData.handData.left.averagedScores
		)
	} else {
		chartData = helpers.buildScatterPlotData(
			params.scoringData.handData.right.noteTimes,
			params.scoringData.handData.right.averagedScores
		)
	}
	let datasets = []
	const accProfile = chartUtils.accProfiles.standard

	datasets = datasets.concat(helpers.buildScatterDataSets(chartData, accProfile))
	if (params.hand === "left") {
		leftScoringData = {
			noteTimes: params.scoringData.handData.left.noteTimes,
			scores: params.scoringData.handData.left.scores,
		}
		datasets = datasets.concat(helpers.buildFullComboAccDataSet(leftScoringData, accProfile, true))
	} else {
		rightScoringData = {
			noteTimes: params.scoringData.handData.right.noteTimes,
			scores: params.scoringData.handData.right.scores,
		}
		datasets = datasets.concat(helpers.buildFullComboAccDataSet(rightScoringData, accProfile, true))
	}

	let data = {
		datasets: datasets
	}

	const chartFont = "Consolas"
	const chartTitle = chartUtils.getChartTitle(params.scoringData.mapData)
	let chartSubtitle = chartUtils.getHandSpecificChartSubtitle(params.scoringData, params.playerData, params.hand)

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

	const image = await canvas.renderToBuffer(configuration)
	return image

}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('analyze')
		.setDescription('Analyze a replay')
		.addStringOption(option =>
			option.setName("report")
				.setDescription("Report type to run.")
				.setRequired(true)
				.addChoice('Standard', "standard")
				.addChoice('Split', "split")
				.addChoice('Hitscore', "hitscore")
		)
		.addStringOption(option =>
			option.setName("player_id")
				.setDescription("Scoresaber ID of player.")
				.setRequired(true)
		)
		.addStringOption(option =>
			option.setName("leaderboard_id")
				.setDescription("Ranked Leaderboard ID.")
				.setRequired(false)
		)
		.addStringOption(option =>
			option.setName("file_url")
				.setDescription("File URL")
				.setRequired(false)
		)
		,
	async execute(interaction) {

		await interaction.deferReply();

		let playerId = helpers.extractPlayerId(interaction.options.getString("player_id"))
		let leaderboardId = interaction.options.getString("leaderboard_id")
		let fileURL = interaction.options.getString("file_url")
		let report = interaction.options.getString("report")

		const replayData = await helpers.getReplayData({ playerId, leaderboardId, fileURL })
		const scoringData = await helpers.getScoringDataFromReplayData(replayData)
		const playerData = await helpers.getPlayerInfo(playerId)

		const params = { replayData, scoringData, playerData }
		let images = []
		if (report === "standard") {

			console.log("Building standard chart...")
			let image = await buildAccGraphChart(params)
			images.push(image)

		} else if (report === "split") {

			console.log("Building split chart...")
			let hand = "left"
			const leftParams = {...params, hand }
			const leftImage = await buildSplitAccGraphChart(leftParams)
			images.push(leftImage)

			hand = "right"
			const rightParams = {...params, hand }
			const rightImage = await buildSplitAccGraphChart(rightParams)
			images.push(rightImage)

		} else if (report === "hitscore") {
			
			// TODO

		}

		let attachments = []
		console.log(images.length)
		for (const image of images) {
			attachments.push(new MessageAttachment(image))
		}

		await interaction.editReply({files: attachments});

	},
};