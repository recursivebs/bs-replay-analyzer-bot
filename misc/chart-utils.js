const kurkleColor = require('@kurkle/color')
const helpers = require('./helpers')

exports.COLOR_RED = 'rgb(255, 99, 132)'
exports.COLOR_ORANGE = 'rgb(255, 159, 64)'
exports.COLOR_YELLOW = 'rgb(255, 205, 86)'
exports.COLOR_GREEN = 'rgb(75, 192, 192)'
exports.COLOR_BLUE = 'rgb(54, 162, 235)'
exports.COLOR_PURPLE = 'rgb(153, 102, 255)'
exports.COLOR_GREY = 'rgb(201, 203, 207)'


const transparentize = (value, opacity) => {
    var alpha = opacity === undefined ? 0.5 : 1 - opacity;
    return kurkleColor(value).alpha(alpha).rgbString();
}

exports.transparentize = transparentize

const getChartTitle = (mapData) => {
    if (mapData.ranked) {
        return `${mapData.songAuthorName} - ${mapData.mapName} | ${mapData.difficulty} | ⭐${mapData.stars} | 🔑${mapData.mapKey}`
    } else {
        return `${mapData.songAuthorName} - ${mapData.mapName} | ${mapData.difficulty} | ${mapData.mapKey}`
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