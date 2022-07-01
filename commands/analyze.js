const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { MessageAttachment, Message } = require('discord.js');
const fetch = require('node-fetch');
const helpers = require('../misc/helpers')
const chartUtils = require('../misc/chart-utils')
const decode = require("../misc/decode.js")

const buildTimingChart = async (params) => {

	const width = 1280
	const height = 900

	const backgroundColour = '#2b2e33'

	const canvas = new ChartJSNodeCanvas({
		width, height, backgroundColour
	})

	const timingData = chartUtils.buildTimingChartData(params.replayData)
	console.log(timingData)

	const chartFont = "Rubik"

	const chartTitle = chartUtils.getChartTitle(params.scoringData.mapData, params.scoresaberLeaderboardData)
	const chartSubtitle = `${chartUtils.getChartSubtitle(params.scoringData, params.playerData)} | Avg Deviation: ${params.replayData.timingData.averageDeviationMS}ms`

	let datasets = []
    datasets.push({
        type: 'scatter',
        label: `timing`,
        data: timingData,
        borderColor: chartUtils.COLOR_RED,
        backgroundColor: chartUtils.COLOR_RED,
        radius: 4,
    })

	const data = {
		datasets: datasets
	}

	const configuration = {
		data: data,
		options: {
			layout: {
				padding: 20
			},
			scales: {
				x: {
					grid: {
						lineWidth: 1.6,
						color: 'rgba(255,255,255,0.12)'
					},
					title: {
						display: true,
						text: 'Time (s)',
						color: 'rgba(255,255,255,0.7)',
						font: {
							family: chartFont
						}
					},
					type: 'linear',
					position: 'bottom',
					ticks: {
						font: {
							size: 18
						},
						color: 'rgba(255,255,255,0.7)'
					}
				},
				y: {
					grid: {
						lineWidth: 1.6,
						color: 'rgba(255,255,255,0.12)'
					},
					title: {
						display: true,
						text: 'Timing Deviation (ms)',
						color: 'rgba(255,255,255,0.7)',
						font: {
							family: chartFont
						}
					},
					ticks: {
						font: {
							size: 18
						},
						color: 'rgba(255,255,255,0.7)'
					}
				}
			},
			plugins: {
				legend: {
					labels: {
						font: {
							color: 'rgba(255,255,255,0.3)',
							family: chartFont,
							size: 16
						},
					},
					position: 'top',
				},
				title: {
					display: true,
					text: chartTitle,
					color: 'rgba(255,255,255,0.7)',
					font: {
						family: chartFont,
						size: 32
					}
				},
				subtitle: {
					display: true,
					text: chartSubtitle,
					color: 'rgba(255,255,255,0.7)',
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


const buildHitscoreChart = async (params) => {

	const width = 1280
	const height = 900

	const backgroundColour = '#2b2e33'

	const canvas = new ChartJSNodeCanvas({
		width, height, backgroundColour
	})

	const hitscoreData = chartUtils.buildHitscoreData(params)

	let totalNotes = params.replayData.scores.length
	if (params.hand) {
		if (params.hand === "left") {
			totalNotes = params.scoringData.handData.left.scores.length
		} else {
			totalNotes = params.scoringData.handData.right.scores.length
		}
	}

	const chartData = {
		labels: chartUtils.getHitscoreBarGraphLabels(hitscoreData),
		datasets: [{
			label: "Hitscores",
			data: chartUtils.buildHitscoreChartData(hitscoreData, totalNotes),
			backgroundColor: chartUtils.hitscoreBarGraphBackgroundColors,
			borderColor: chartUtils.hitscoreBarGraphBorderColors,
			borderWidth: 2
		}]
	}

	const chartFont = "Rubik"
	const chartTitle = chartUtils.getChartTitle(params.scoringData.mapData, params.scoresaberLeaderboardData)
	let chartSubtitle = chartUtils.getChartSubtitle(params.scoringData, params.playerData)
	if (params.hand) {
		chartSubtitle = chartUtils.getHandSpecificChartSubtitle(params.scoringData, params.playerData, params.hand)
	}

	const config = {
		type: 'bar',
		data: chartData,
		options: {
			layout: {
				padding: 20
			},
			scales: {
				x: {
					grid: {
						lineWidth: 1.6,
						color: 'rgba(255,255,255,0.05)'
					},
					ticks: {
						font: {
							size: 24
						},
						color: 'rgba(255,255,255,0.7)'
					}
				},
				y: {
					grid: {
						lineWidth: 1.6,
						color: 'rgba(255,255,255,0.05)'
					},
				}
			},
			plugins: {
				legend: {
					labels: {
						color: 'rgba(255,255,255,0.3)',
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
					color: 'rgba(255,255,255,0.7)',
					font: {
						family: chartFont,
						size: 32
					}
				},
				subtitle: {
					display: true,
					text: chartSubtitle,
					color: 'rgba(255,255,255,0.7)',
					font: {
						family: chartFont,
						size: 24
					}
				}
			}
		}
	}

	const image = await canvas.renderToBuffer(config)
	return image

}


const buildAccGraphChart = async (params) => {

	const width = 1280
	const height = 900

	const backgroundColour = '#2b2e33'

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

	const chartFont = "Rubik"
	const chartTitle = chartUtils.getChartTitle(params.scoringData.mapData, params.scoresaberLeaderboardData)
	const chartSubtitle = chartUtils.getChartSubtitle(params.scoringData, params.playerData)

	const configuration = {
		data: data,
		options: {
			layout: {
				padding: 20
			},
			scales: {
				x: {
					grid: {
						lineWidth: 1.6,
						color: 'rgba(255,255,255,0.12)'
					},
					title: {
						display: true,
						text: 'Time (s)',
						color: 'rgba(255,255,255,0.7)',
						font: {
							family: chartFont
						}
					},
					type: 'linear',
					position: 'bottom',
					ticks: {
						font: {
							size: 18
						},
						color: 'rgba(255,255,255,0.7)'
					}
				},
				y: {
					grid: {
						lineWidth: 1.6,
						color: 'rgba(255,255,255,0.12)'
					},
					title: {
						display: true,
						text: 'Accuracy',
						color: 'rgba(255,255,255,0.7)',
						font: {
							family: chartFont
						}
					},
					ticks: {
						font: {
							size: 18
						},
						color: 'rgba(255,255,255,0.7)'
					}
				}
			},
			plugins: {
				legend: {
					labels: {
						font: {
							color: 'rgba(255,255,255,0.3)',
							family: chartFont,
							size: 16
						},
					},
					position: 'top',
				},
				title: {
					display: true,
					text: chartTitle,
					color: 'rgba(255,255,255,0.7)',
					font: {
						family: chartFont,
						size: 32
					}
				},
				subtitle: {
					display: true,
					text: chartSubtitle,
					color: 'rgba(255,255,255,0.7)',
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

	const backgroundColour = '#2b2e33'

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

	const chartFont = "Rubik"
	const chartTitle = chartUtils.getChartTitle(params.scoringData.mapData, params.scoresaberLeaderboardData)
	let chartSubtitle = chartUtils.getHandSpecificChartSubtitle(params.scoringData, params.playerData, params.hand)

	const configuration = {
		data: data,
		options: {
			layout: {
				padding: 20
			},
			scales: {
				x: {
					grid: {
						lineWidth: 1.6,
						color: 'rgba(255,255,255,0.12)'
					},
					title: {
						display: true,
						text: 'Time (s)',
						color: 'rgba(255,255,255,0.7)',
						font: {
							family: chartFont
						}
					},
					type: 'linear',
					position: 'bottom',
					ticks: {
						font: {
							size: 18
						},
						color: 'rgba(255,255,255,0.7)'
					}
				},
				y: {
					grid: {
						lineWidth: 1.6,
						color: 'rgba(255,255,255,0.12)'
					},
					title: {
						display: true,
						text: 'Accuracy',
						color: 'rgba(255,255,255,0.7)',
						font: {
							family: chartFont
						}
					},
					ticks: {
						font: {
							size: 18
						},
						color: 'rgba(255,255,255,0.7)'
					}
				}
			},
			plugins: {
				legend: {
					labels: {
						color: 'rgba(255,255,255,0.3)',
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
					color: 'rgba(255,255,255,0.7)',
					font: {
						family: chartFont,
						size: 32
					}
				},
				subtitle: {
					display: true,
					text: chartSubtitle,
					color: 'rgba(255,255,255,0.7)',
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
				.addChoice('Hitscore Split', "hitscore-split")
				.addChoice('Timing', "timing")
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

		try {

			let playerId = helpers.extractPlayerId(interaction.options.getString("player_id"))
			let leaderboardId = interaction.options.getString("leaderboard_id")
			let fileURL = interaction.options.getString("file_url")
			let report = interaction.options.getString("report")

			const replayData = await helpers.getReplayData({ playerId, leaderboardId, fileURL })
			const scoresaberLeaderboardData = await helpers.getScoresaberLeaderboardData(leaderboardId)
			const scoringData = await helpers.getScoringDataFromReplayData(replayData)
			const playerData = await helpers.getPlayerInfo(playerId)

			const params = { replayData, scoringData, playerData, scoresaberLeaderboardData }
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

				console.log("Building hitscore chart...")
				let image = await buildHitscoreChart(params)
				images.push(image)

			} else if (report === "hitscore-split") {

				console.log("Building split hitscore chart...")
				let hand = "left"
				const leftParams = {...params, hand }
				const leftImage = await buildHitscoreChart(leftParams)
				images.push(leftImage)

				hand = "right"
				const rightParams = {...params, hand }
				const rightImage = await buildHitscoreChart(rightParams)
				images.push(rightImage)

			} else if (report === "timing") {

				console.log("Building timing chart...")
				let image = await buildTimingChart(params)
				images.push(image)

			}

			let attachments = []
			console.log(images.length)
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