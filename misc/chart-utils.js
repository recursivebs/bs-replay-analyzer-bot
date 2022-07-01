const kurkleColor = require('@kurkle/color')
const movingAverages = require('moving-averages')
const helpers = require('./helpers')

exports.COLOR_RED    = 'rgb(255, 99, 132)'
exports.COLOR_ORANGE = 'rgb(255, 159, 64)'
exports.COLOR_YELLOW = 'rgb(255, 205, 86)'
exports.COLOR_GREEN  = 'rgb(75, 192, 192)'
exports.COLOR_BLUE   = 'rgb(54, 162, 235)'
exports.COLOR_PURPLE = 'rgb(153, 102, 255)'
exports.COLOR_GREY   = 'rgb(201, 203, 207)'


const transparentize = (value, opacity) => {
    var alpha = opacity === undefined ? 0.5 : 1 - opacity;
    return kurkleColor(value).alpha(alpha).rgbString();
}

exports.transparentize = transparentize

const getChartTitle = (mapData, scoresaberLeaderboardData) => {
    if (mapData.ranked) {
        return `${mapData.songAuthorName} - ${mapData.mapName} | ${mapData.difficulty} | ⭐${scoresaberLeaderboardData.stars} | 🔑${mapData.mapKey}`
    } else {
        return `${mapData.songAuthorName} - ${mapData.mapName} | ${mapData.difficulty} | 🔑${mapData.mapKey}`
    }
}
exports.getChartTitle = getChartTitle


const getChartSubtitle = (scoringData, playerData) => {
    const playerName = playerData.name
    const percentage = scoringData.totalPercentage

    const leftScores = scoringData.handData.left.scores
    const leftSum = leftScores.reduce((a, b) => a + b, 0)
    const leftAvg = (leftSum / leftScores.length) || 0
    const leftAcc = helpers.calculatePercentage(leftAvg, 115)

    const rightScores = scoringData.handData.right.scores
    const rightSum = rightScores.reduce((a, b) => a + b, 0)
    const rightAvg = (rightSum / rightScores.length) || 0
    const rightAcc = helpers.calculatePercentage(rightAvg, 115)

    return `Played by ${playerName} | ${percentage}% | L Acc: ${leftAcc}% | R Acc: ${rightAcc}%`
}

exports.getChartSubtitle = getChartSubtitle

const getHandSpecificChartSubtitle = (scoringData, playerData, hand) => {

    if (hand === "left") {

        const playerName = playerData.name
        const leftScores = scoringData.handData.left.scores
        const leftSum = leftScores.reduce((a, b) => a + b, 0)
        const leftAvg = (leftSum / leftScores.length) || 0
        const leftAcc = helpers.calculatePercentage(leftAvg, 115)

        return `Played by ${playerName} | L Acc: ${leftAcc}%`

    } else {

        const playerName = playerData.name
        const rightScores = scoringData.handData.right.scores
        const rightSum = rightScores.reduce((a, b) => a + b, 0)
        const rightAvg = (rightSum / rightScores.length) || 0
        const rightAcc = helpers.calculatePercentage(rightAvg, 115)

        return `Played by ${playerName} | R Acc: ${rightAcc}%`

    }
}

exports.getHandSpecificChartSubtitle = getHandSpecificChartSubtitle


exports.buildHitscoreData = (params) => {

	let hitscoreData = {
		"115": 0,
		"114": 0,
		"113": 0,
		"112": 0,
		"111": 0,
		"110": 0,
		"109": 0,
		"108": 0,
		"107": 0,
		"<106": 0,
	}

    let scores = params.replayData.scores
    if (params.hand) {
        if (params.hand === "left") {
            scores = params.scoringData.handData.left.scores
        } else {
            scores = params.scoringData.handData.right.scores
        }
    }

	for (const score of scores) {
		if (score === 115) {
			hitscoreData["115"] += 1
		} else if (score === 114) {
			hitscoreData["114"] += 1
		} else if (score === 113) {
			hitscoreData["113"] += 1
		} else if (score === 112) {
			hitscoreData["112"] += 1
		} else if (score === 111) {
			hitscoreData["111"] += 1
		} else if (score === 110) {
			hitscoreData["110"] += 1
		} else if (score === 109) {
			hitscoreData["109"] += 1
		} else if (score === 108) {
			hitscoreData["108"] += 1
		} else if (score === 107) {
			hitscoreData["107"] += 1
		} else {
			hitscoreData["<106"] += 1
		}
	}

    return hitscoreData

}


exports.buildMultiHitscoreData = (params) => {

	let hitscoreData = {
		"115": 0,
		"114": 0,
		"113": 0,
		"112": 0,
		"111": 0,
		"110": 0,
		"<109": 0,
	}

    let scores = params.replayData.scores
    if (params.hand) {
        if (params.hand === "left") {
            scores = params.scoringData.handData.left.scores
        } else {
            scores = params.scoringData.handData.right.scores
        }
    }

	for (const score of scores) {
		if (score === 115) {
			hitscoreData["115"] += 1
		} else if (score === 114) {
			hitscoreData["114"] += 1
		} else if (score === 113) {
			hitscoreData["113"] += 1
		} else if (score === 112) {
			hitscoreData["112"] += 1
		} else if (score === 111) {
			hitscoreData["111"] += 1
		} else if (score === 110) {
			hitscoreData["110"] += 1
		} else {
			hitscoreData["<109"] += 1
		}
	}

    return hitscoreData

}

exports.buildHitscoreChartData = (hitscoreData, totalNotes) => {
    return [
        helpers.calculatePercentage(hitscoreData["<106"], totalNotes),
        helpers.calculatePercentage(hitscoreData["107"], totalNotes),
        helpers.calculatePercentage(hitscoreData["108"], totalNotes),
        helpers.calculatePercentage(hitscoreData["109"], totalNotes),
        helpers.calculatePercentage(hitscoreData["110"], totalNotes),
        helpers.calculatePercentage(hitscoreData["111"], totalNotes),
        helpers.calculatePercentage(hitscoreData["112"], totalNotes),
        helpers.calculatePercentage(hitscoreData["113"], totalNotes),
        helpers.calculatePercentage(hitscoreData["114"], totalNotes),
        helpers.calculatePercentage(hitscoreData["115"], totalNotes),
    ]
}


exports.buildMultiHitscoreChartData = (hitscoreData, totalNotes) => {
    return [
        helpers.calculatePercentage(hitscoreData["<109"], totalNotes),
        helpers.calculatePercentage(hitscoreData["110"], totalNotes),
        helpers.calculatePercentage(hitscoreData["111"], totalNotes),
        helpers.calculatePercentage(hitscoreData["112"], totalNotes),
        helpers.calculatePercentage(hitscoreData["113"], totalNotes),
        helpers.calculatePercentage(hitscoreData["114"], totalNotes),
        helpers.calculatePercentage(hitscoreData["115"], totalNotes),
    ]
}

exports.getHitscoreBarGraphLabels = (data) => {
    return [
        "<106",
        "107",
        "108",
        "109",
        "110",
        "111",
        "112",
        "113",
        "114",
        "115",
    ]
}


exports.getHitscoreMultiBarGraphLabels = (data) => {
    return [
        "<109",
        "110",
        "111",
        "112",
        "113",
        "114",
        "115",
    ]
}


exports.hitscoreBarGraphBackgroundColors = [
    'rgba(241, 83, 105, 0.4)',
    'rgba(224, 94, 154, 0.4)',
    'rgba(214, 100, 183, 0.4)',
    'rgba(203, 108, 215, 0.4)',
    'rgba(179, 121, 236, 0.4)',
    'rgba(151, 133, 236, 0.4)',
    'rgba(110, 152, 235, 0.4)',
    'rgba(77, 168, 235, 0.4)',
    'rgba(44, 182, 234, 0.4)',
    'rgba(19, 194, 233, 0.4)',
]

exports.hitscoreBarGraphBorderColors = [
    'rgb(241, 83, 105)',
    'rgb(224, 94, 154)',
    'rgb(214, 100, 183)',
    'rgb(203, 108, 215)',
    'rgb(179, 121, 236)',
    'rgb(151, 133, 236)',
    'rgb(110, 152, 235)',
    'rgb(77, 168, 235)',
    'rgb(44, 182, 234)',
    'rgb(19, 194, 233)',
]


exports.accProfiles = {
    standard: {
        perfect: 98.5,
        good: 97.5,
        normal: 96.8,
        ok: 96
    },
    true: {
        perfect: 99.7,
        good: 99.1,
        normal: 98.7,
        ok: 98.5
    },
}

const getMultiLineRankColor = (rank) => {
    if (rank > 10) {
        return 'rgba(0, 0, 0, 0.5)'
    }
    const colors = [
        'rgb(255, 193, 76)',
        'rgb(145, 181, 196)',
        'rgb(163, 120, 100)',
        'rgb(207, 72, 72)',
        'rgb(252, 131, 228)',
        'rgb(184, 138, 227)',
        'rgb(71, 116, 252)',
        'rgb(123, 218, 224)',
        'rgb(71, 196, 102)',
        'rgb(193, 217, 100)'
    ]
    return colors[rank - 1]
}

exports.getMultiLineRankColor = getMultiLineRankColor


exports.buildTimingChartData = (replayData) => {

    const movingAverageFactor = helpers.getMovingAverageFactor(replayData)
    let data = replayData.timingData.timingDeviations.map((element, index) => {
        return element.difference
    });

    let averagedData = movingAverages.ma(data, movingAverageFactor)

    let assocTimingData = replayData.noteTime.map((time, index) => {
        return {
            x: time,
            y: averagedData[index]
        }
    })

    return assocTimingData
}


