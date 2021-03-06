const fetch = require('node-fetch');
const helpers = require('../misc/helpers')
const movingAverages = require('moving-averages')
const chartUtils = require('../misc/chart-utils');
const { data } = require('../commands/analyze');
const JSZip = require("jszip");


function getReplayURL(playerId, leaderboardId) {
    return `https://ssdecode.azurewebsites.net/?playerID=${playerId}&songID=${leaderboardId}`
}


async function getMapTimings(leaderboardId) {
    const mapData = await getMapData(leaderboardId)
    const bpm = await getBPMFromLeaderboardId(leaderboardId)

    // filter out all notes with a type that isnt 0 or 1
    let timingData = mapData["_notes"].filter(note => note["_type"] <= 1)
    timingData.forEach(x => {
        x.timeSeconds = x._time * (60 / bpm);
        x.noteInfo = `${x["_lineIndex"]}${x["_lineLayer"]}${x["_cutDirection"]}${x["_type"]}`
    })
    return timingData
}


async function getTimingData(replayData, playerId, leaderboardId) {

    const timingDeviations = replayData.mapTimings.map((timingData, index) => {
        let hitTime = 0;
        try {
            hitTime = replayData.noteTime[index]
        } catch {}
        return {
            mapTime: timingData.timeSeconds,
            hitTime: hitTime,
            difference: timingData.timeSeconds - hitTime,
            absDifference: Math.abs(timingData.timeSeconds - hitTime),
            noteInfo: timingData.noteInfo
        }
    })

    let minDeviation = 99999
    let maxDeviation = 0

    timingDeviations.forEach(x => {
        if (x.absDifference < minDeviation) {
            minDeviation = x.absDifference
        }
        if (x.absDifference > maxDeviation) {
            maxDeviation = x.absDifference
        }
    })

    const timingThreshold = 0.02
    let average = timingDeviations.reduce((acc, curr) => acc + curr.difference, 0) / timingDeviations.length
    let absAverage = timingDeviations.reduce((acc, curr) => acc + curr.absDifference, 0) / timingDeviations.length
    let earlyHits = timingDeviations.filter(x => x.difference < -1 * timingThreshold).length
    let lateHits = timingDeviations.filter(x => x.difference >= timingThreshold).length
    let onTimeHits = timingDeviations.filter(x => x.difference < timingThreshold && x.difference >= -1 * timingThreshold).length

    const timingData = {
        minDeviationMS: +(minDeviation * 1000).toFixed(2),
        maxDeviationMS: +(maxDeviation * 1000).toFixed(2),
        averageDeviationMS: +(average * 1000).toFixed(2),
        earlyHits: earlyHits,
        lateHits: lateHits,
        onTimeHits, onTimeHits,
        timingThreshold: timingThreshold,
        timingDeviations: timingDeviations,
    }

    return timingData

}


async function getBPMFromLeaderboardId(leaderboardId) {
    const hash = await getMapHashFromLeaderboardId(leaderboardId)
    const beatSaverMapData = await getBeatSaverMapDataByHash(hash)
    return beatSaverMapData.metadata.bpm
}


async function getMapHashFromLeaderboardId(leaderboardId) {
    const url = `https://scoresaber.com/api/leaderboard/by-id/${leaderboardId}/info`
    const data = await fetch(url)
    const json = await data.json()
    return json.songHash
}


async function getDiffNameFromLeaderboardId(leaderboardId) {
    const url = `https://scoresaber.com/api/leaderboard/by-id/${leaderboardId}/info`
    const data = await fetch(url)
    const json = await data.json()
    console.log(leaderboardId)
    console.log(json)
    const diffStr = json.difficulty.difficultyRaw
    const splitDiff = diffStr.split("_")[1]
    return splitDiff
}


async function getBSORUrl(playerId, leaderboardId) {
    const diffName = await getDiffNameFromLeaderboardId(leaderboardId)
    const mapHash = await getMapHashFromLeaderboardId(leaderboardId)
    return `https://cdn.beatleader.xyz/replays/${playerId}-${diffName}-Standard-${mapHash}.bsor`
}


async function getBeatLeaderReplayData(playerId, leaderboardId) {
    const url = await getBSORUrl(playerId, leaderboardId)
    const data = await fetch(url)
    const arrayBuffer = await data.arrayBuffer()
    const replayData = decode(arrayBuffer)
    return replayData
}


async function getMapData(leaderboardId) {
    const diffName = await getDiffNameFromLeaderboardId(leaderboardId)
    const mapHash = await getMapHashFromLeaderboardId(leaderboardId)
    const url = `https://r2cdn.beatsaver.com/${mapHash.toLowerCase()}.zip`
    const zip = new JSZip()
    const data = await fetch(url)
    const zipDataBuffer = await data.arrayBuffer()
    const zipData = await zip.loadAsync(zipDataBuffer)
    //const file = zipData.files.filter(file => file.name.includes(diffName))[0]
    for (file in zipData.files) {
        if (zipData.files[file].name.includes(diffName)) {
            const f = zipData.files[file]
            const data = await f.async("string")
            return JSON.parse(data)
        }
    }
    return null
}


function beatLeaderTest() {
    getBeatLeaderReplayData(zoro, "420790").then(data => {
        const deviations = data.notes.map(note => note.noteCutInfo.timeDeviation)
        const avg = deviations.reduce((a, b) => a + b, 0) / deviations.length
        console.log(avg)
    })
}



const getMovingAverageFactor = (replayData) => {
    if (replayData && replayData.scores) {
        const notes = replayData.scores.length
        if (notes < 100) {
            return 3
        }
        if (notes < 300) {
            return 4
        }
        if (notes < 750) {
            return 5
        }
        if (notes < 1000) {
            return 6
        }
        if (notes < 1400) {
            return 7
        }
        if (notes < 1800) {
            return 8
        }
        return 10
    } else {
        return 10
    }
}
exports.getMovingAverageFactor = getMovingAverageFactor

const getReplayData = async (params) => {
    let replayData = {}
    try {
        let replayEndpoint = ""
        if (params.fileURL) {
            console.log("Using file URL")
            // Prefer the file url endpoint, if fileURL is set
            replayEndpoint = `https://sspreviewdecode.azurewebsites.net/?link=${params.fileURL}`
        } else {
            console.log("Using Scoresaber Replay")
            replayEndpoint = `https://sspreviewdecode.azurewebsites.net/?playerID=${params.playerId}&songID=${params.leaderboardId}`
        }
        const replayResponse = await fetch(replayEndpoint)
        const replayDataStr = await replayResponse.json()
        replayData = JSON.parse(replayDataStr)
        console.log(params.leaderboardId)
        replayData.mapTimings = await getMapTimings(params.leaderboardId)
        replayData.timingData = await getTimingData(replayData, params.playerId, params.leaderboardId)
    } catch (e) {
        console.error(e)
    } finally {
        return replayData
    }
}

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
        hash = hash.split("_")[0]
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

    const movingAverageFactor = getMovingAverageFactor(replayData)
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
    let totalScore = 0;
    if (replayData && replayData.info && replayData.info.totalScore) {
        totalScore = replayData.info.totalScore;
    }
    const mapHash = getMapHashFromReplayData(replayData)
    const mapData = await getBeatSaverMapDataByHash(mapHash)
    const beatSaverDifficulty = getBeatSaverDifficulty(replayData.info.difficulty)
    const maxScore = getMaxScore(mapHash, mapData, beatSaverDifficulty)
    const totalPercentage = calculatePercentage(totalScore, maxScore)
    const handData = extractHandData(replayData)
    const version = extractVersionData(mapData, mapHash)
    const diff = extractDiffData(version, beatSaverDifficulty)

    const movingAverageFactor = getMovingAverageFactor(replayData)

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


const buildFullComboAccDataSet = (scoringData, accProfile, ignoreSplit) => {

    let rollingAcc = []

    let datasets = []
    datasets.push({
        type: 'line',
        label: `FC Acc`,
        data: rollingAcc,
        borderColor: 'rgb(208, 148, 234, 125)',
        borderWidth: 2,
        pointRadius: 0,
    })

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

    if (ignoreSplit) {
        return datasets
    }

    let leftRollingAcc = []
    let rightRollingAcc = []

    let leftHandData = buildScatterPlotData(scoringData.handData.left.noteTimes, scoringData.handData.left.scores)
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
    for (let index = 0; index < rightHandData.length; index++) {
        const arr = rightHandData.slice(0, index).map(x => x.y)
        const sum = arr.reduce((x, y) => x + y, 0)
        const avg = sum / arr.length
        rightRollingAcc.push({
            x: rightHandData[index].x,
            y: avg
        })
    }

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
        } else if (d.y < accProfile.ok && d.y >= 10) {
            badScores.push(d)
        }
    }

    let datasets = []

    const bubbleRadius = 4

    datasets.push({
        type: 'scatter',
        label: `Perfect (x${perfectScores.length}, ${helpers.calculatePercentage(perfectScores.length, chartData.length)}%)`,
        data: perfectScores,
        borderColor: chartUtils.COLOR_BLUE,
        backgroundColor: chartUtils.COLOR_BLUE,
        radius: bubbleRadius,
    })

    datasets.push({
        type: 'scatter',
        label: `Good (x${goodScores.length}, ${helpers.calculatePercentage(goodScores.length, chartData.length)}%)`,
        data: goodScores,
        borderColor: chartUtils.COLOR_GREEN,
        backgroundColor: chartUtils.COLOR_GREEN,
        radius: bubbleRadius,
    })

    datasets.push({
        type: 'scatter',
        label: `Normal (x${normalScores.length}, ${helpers.calculatePercentage(normalScores.length, chartData.length)}%)`,
        data: normalScores,
        borderColor: chartUtils.COLOR_PURPLE,
        backgroundColor: chartUtils.COLOR_PURPLE,
        radius: bubbleRadius,
    })

    datasets.push({
        type: 'scatter',
        label: `Ok (x${okScores.length}, ${helpers.calculatePercentage(okScores.length, chartData.length)}%)`,
        data: okScores,
        borderColor: chartUtils.COLOR_YELLOW,
        backgroundColor: chartUtils.COLOR_YELLOW,
        radius: bubbleRadius,
    })

    datasets.push({
        type: 'scatter',
        label: `Bad (x${badScores.length}, ${helpers.calculatePercentage(badScores.length, chartData.length)}%)`,
        data: badScores,
        borderColor: chartUtils.COLOR_RED,
        backgroundColor: chartUtils.COLOR_RED,
        radius: bubbleRadius,
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


const getScoresaberLeaderboardData = async (leaderboardId) => {
    const response = await fetch(`https://scoresaber.com/api/leaderboard/by-id/${leaderboardId}/info`)
    const data = await response.json()
    return data
}


const extractPlayerIds = (playerList) => {
    let playerIdList = []
    for (const playerId of playerList.split(",")) {
        playerIdList.push(playerId.trim())
    }
    return playerIdList
}
exports.extractPlayerIds = extractPlayerIds


const getTop10PlayerIds = async (leaderboardId) => {

    let playerIds = []
    try {
        const url = `https://scoresaber.com/api/leaderboard/by-id/${leaderboardId}/scores`
        const response = await fetch(url)
        const data = await response.json()
        playerIds = data["scores"].map(x => x.leaderboardPlayerInfo.id).slice(0, 10)
    } catch (e) {
        console.error(e)
    } finally {
        return playerIds
    }

}
exports.getTop10PlayerIds = getTop10PlayerIds

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
exports.getReplayData = getReplayData
exports.getScoresaberLeaderboardData = getScoresaberLeaderboardData