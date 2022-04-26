const fetch = require('node-fetch');
const helpers = require('../misc/helpers')
const movingAverages = require('moving-averages')
const chartUtils = require('../misc/chart-utils')

const movingAverageFactor = 10

const getBeatSaverMapDataByHash = async (hash) => {
    let data = {}
    try {
        const map_link = `https://beatsaver.com/api/maps/hash/${hash}`
        let response = await fetch(map_link)
        data = await response.json()
    } catch (e) {
        console.error(e)
    } finally {
        return data
    }
}


const getMapHashFromReplayData = (replayData) => {
    let hash = ""
    if (replayData.info && replayData.info.hash) {
        hash = replayData.info.hash.replaceAll("custom_level_", "").toLowerCase()
    }
    return hash
}


const getHumanReadableDifficulty = (difficultyNum) => {
    switch (difficultyNum) {
        case 1:
            return "Easy"
        case 3:
            return "Normal"
        case 5:
            return "Hard"
        case 7:
            return "Expert"
        case 9:
        default:
            return "Expert+"
    }
}


const getBeatSaverDifficulty = (difficultyNum) => {
    switch (difficultyNum) {
        case 1:
            return "Easy"
        case 3:
            return "Normal"
        case 5:
            return "Hard"
        case 7:
            return "Expert"
        case 9:
        default:
            return "ExpertPlus"
    }
}


const extractVersionData = (mapData, mapHash) => {
    let foundVersion = {}
    for (const version of mapData.versions) {
        const hash = version.hash
        if (version.hash.toLowerCase() === mapHash.toLowerCase()) {
            foundVersion = version
            break
        }
    }
    return foundVersion
}


const extractDiffData = (versionData, difficulty) => {
    let foundDiff = {}
    for (const diff of versionData.diffs) {
        console.log(diff.difficulty + " " + difficulty)
        if (diff.difficulty.toLowerCase() === difficulty.toLowerCase()) {
            foundDiff = diff
            break;
        }
    }
    return foundDiff
}


const getMaxScore = (mapHash, mapData, difficulty) => {
    let maxScore = -1
    try {
        const foundVersion = extractVersionData(mapData, mapHash)
        const foundDiff = extractDiffData(foundVersion, difficulty)
        maxScore = foundDiff.maxScore
    } catch (e) {
        console.error(e)
    } finally {
        return maxScore
    }
}


const calculatePercentage = (score, maxScore) => {
    const percentage = +((score/maxScore) * 100).toFixed(2)
    return percentage
}


const extractHandData = (replayData) => {

    const leftHandIndices = []
    const rightHandIndices = []
    let index = 0

    for (const noteInfo of replayData.noteInfos) {
        const char = noteInfo.slice(noteInfo.length - 1)
        if (char !== "1") {
            leftHandIndices.push(index)
        } else {
            rightHandIndices.push(index)
        }
        index = index + 1
    }

    const leftHandNoteTimes = []
    const rightHandNoteTimes = []
    index = 0

    for (const noteTime of replayData.noteTime) {
        if (leftHandIndices.includes(index)) {
            leftHandNoteTimes.push(noteTime)
        } else {
            rightHandNoteTimes.push(noteTime)
        }
        index = index + 1
    }

    const leftHandScores = []
    const rightHandScores = []
    index = 0

    for (const score of replayData.scores) {
        if (leftHandIndices.includes(index)) {
            leftHandScores.push(score)
        } else {
            rightHandScores.push(score)
        }
        index = index + 1
    }

    leftHandAveragedScores = movingAverages.ma(leftHandScores, movingAverageFactor)
    rightHandAveragedScores = movingAverages.ma(rightHandScores, movingAverageFactor)

    return {
        left: {
            indices: leftHandIndices,
            noteTimes: leftHandNoteTimes,
            scores: leftHandScores,
            averagedScores: leftHandAveragedScores
        },
        right: {
            indices: rightHandIndices,
            noteTimes: rightHandNoteTimes,
            scores: rightHandScores,
            averagedScores: rightHandAveragedScores
        }
    }

}


const getScoringDataFromReplayData = async (replayData) => {

    const totalScore = replayData.info.totalScore;
    const mapHash = getMapHashFromReplayData(replayData)
    const mapData = await getBeatSaverMapDataByHash(mapHash)
    const beatSaverDifficulty = getBeatSaverDifficulty(replayData.info.difficulty)
    const maxScore = getMaxScore(mapHash, mapData, beatSaverDifficulty)
    const totalPercentage = calculatePercentage(totalScore, maxScore)
    const handData = extractHandData(replayData)
    const version = extractVersionData(mapData, mapHash)
    const diff = extractDiffData(version, beatSaverDifficulty)

    return {
        mapData: {
            mapKey: mapData.id,
            mapName: mapData.metadata.songName,
            songAuthorName: mapData.metadata.songAuthorName,
            levelAuthorName: mapData.metadata.levelAuthorName,
            coverURL: version.coverURL,
            difficulty: getHumanReadableDifficulty(replayData.info.difficulty),
            ranked: mapData.ranked,
            stars: diff.stars ? diff.stars : 0,
            njs: diff.njs,
            nps: diff.nps,
        },
        totalScore: totalScore,
        maxScore: maxScore,
        totalPercentage: totalPercentage,
        handData: handData,
        noteTimes: replayData.noteTime,
        scores: replayData.scores,
        averagedScores: movingAverages.ma(replayData.scores, movingAverageFactor)
    }

}


const buildScatterPlotData = (noteTimes, noteScores) => {
    let index = 0
    let data = []
    for (index; index < noteTimes.length; index++) {
        data.push({
            x: noteTimes[index],
            y: calculatePercentage(noteScores[index], 115)
        })
    }
    return data
}


const buildFullComboAccDataSet = (scoringData, accProfile) => {

    let rollingAcc = []
    let currentAvg = 100

    let bothHandsData = buildScatterPlotData(scoringData.noteTimes, scoringData.scores)
    for (let index = 0; index < bothHandsData.length; index++) {
        const arr = bothHandsData.slice(0, index).map(x => x.y)
        const sum = arr.reduce((x, y) => x + y, 0)
        const avg = sum / arr.length
        rollingAcc.push({
            x: bothHandsData[index].x,
            y: avg
        })
    }

    let leftHandData = buildScatterPlotData(scoringData.handData.left.noteTimes, scoringData.handData.left.scores)
    let leftRollingAcc = []
    for (let index = 0; index < leftHandData.length; index++) {
        const arr = leftHandData.slice(0, index).map(x => x.y)
        const sum = arr.reduce((x, y) => x + y, 0)
        const avg = sum / arr.length
        leftRollingAcc.push({
            x: leftHandData[index].x,
            y: avg
        })
    }

    let rightHandData = buildScatterPlotData(scoringData.handData.right.noteTimes, scoringData.handData.right.scores)
    let rightRollingAcc = []
    for (let index = 0; index < rightHandData.length; index++) {
        const arr = rightHandData.slice(0, index).map(x => x.y)
        const sum = arr.reduce((x, y) => x + y, 0)
        const avg = sum / arr.length
        rightRollingAcc.push({
            x: rightHandData[index].x,
            y: avg
        })
    }


    let datasets = []
    datasets.push({
        type: 'line',
        label: `FC Acc`,
        data: rollingAcc,
        borderColor: 'rgb(208, 148, 234, 125)',
        borderWidth: 2,
        pointRadius: 0,
    })

    datasets.push({
        type: 'line',
        label: `Left FC Acc`,
        data: leftRollingAcc,
        borderColor: 'rgb(251, 151, 148, 125)',
        borderWidth: 2,
        pointRadius: 0,
    })
    datasets.push({
        type: 'line',
        label: `Right FC Acc`,
        data: rightRollingAcc,
        borderColor: 'rgb(91, 161, 215, 125)',
        borderWidth: 2,
        pointRadius: 0,
    })

    return datasets

}


const buildScatterDataSets = (chartData, accProfile) => {

    let perfectScores = []
    let goodScores = []
    let normalScores = []
    let okScores = []
    let badScores = []

    for (const d of chartData) {
        if (d.y >= accProfile.perfect) {
            perfectScores.push(d)
        } else if (d.y < accProfile.perfect && d.y >= accProfile.good) {
            goodScores.push(d)
        } else if (d.y < accProfile.good && d.y >= accProfile.normal) {
            normalScores.push(d)
        } else if (d.y < accProfile.normal && d.y >= accProfile.ok) {
            okScores.push(d)
        } else {
            badScores.push(d)
        }
    }

    let datasets = []

    datasets.push({
        type: 'scatter',
        label: `Perfect (x${perfectScores.length}, ${helpers.calculatePercentage(perfectScores.length, chartData.length)}%)`,
        data: perfectScores,
        borderColor: chartUtils.COLOR_BLUE,
        backgroundColor: chartUtils.transparentize(chartUtils.COLOR_BLUE)
    })

    datasets.push({
        type: 'scatter',
        label: `Good (x${goodScores.length}, ${helpers.calculatePercentage(goodScores.length, chartData.length)}%)`,
        data: goodScores,
        borderColor: chartUtils.COLOR_GREEN,
        backgroundColor: chartUtils.transparentize(chartUtils.COLOR_GREEN)
    })

    datasets.push({
        type: 'scatter',
        label: `Normal (x${normalScores.length}, ${helpers.calculatePercentage(normalScores.length, chartData.length)}%)`,
        data: normalScores,
        borderColor: chartUtils.COLOR_PURPLE,
        backgroundColor: chartUtils.transparentize(chartUtils.COLOR_PURPLE)
    })

    datasets.push({
        type: 'scatter',
        label: `Ok (x${okScores.length}, ${helpers.calculatePercentage(okScores.length, chartData.length)}%)`,
        data: okScores,
        borderColor: chartUtils.COLOR_YELLOW,
        backgroundColor: chartUtils.transparentize(chartUtils.COLOR_YELLOW)
    })

    datasets.push({
        type: 'scatter',
        label: `Bad (x${badScores.length}, ${helpers.calculatePercentage(badScores.length, chartData.length)}%)`,
        data: badScores,
        borderColor: chartUtils.COLOR_RED,
        backgroundColor: chartUtils.transparentize(chartUtils.COLOR_RED)
    })

    return datasets

}


const extractPlayerId = (str) => {
    if (!str) {
        return "0"
    }
    try {
        let id = str.replaceAll("https://", "")
                    .replaceAll("http://", "")
                    .replaceAll("www.", "")
                    .replaceAll("scoresaber.com/u/", "")
                    .split("?")[0];
        if (id && id.length > 0) {
            return id.replace(/\D+/g, '');
        }
        return "0";
    } catch {
        return "0";
    }
}

const getPlayerInfo = async (playerID) => {
    const response = await fetch(`https://scoresaber.com/api/player/${playerID}/full`);
    const playerData = await response.json();
    return playerData;
}

exports.getBeatSaverMapDataByHash = getBeatSaverMapDataByHash
exports.getBeatSaverDifficulty = getBeatSaverDifficulty
exports.getMapHashFromReplayData = getMapHashFromReplayData
exports.getMaxScore = getMaxScore
exports.getScoringDataFromReplayData = getScoringDataFromReplayData
exports.calculatePercentage = calculatePercentage
exports.buildScatterPlotData = buildScatterPlotData
exports.buildScatterDataSets = buildScatterDataSets
exports.extractPlayerId = extractPlayerId
exports.getPlayerInfo = getPlayerInfo
exports.buildFullComboAccDataSet = buildFullComboAccDataSet