'use strict'

var currentPlayer = 'black'

var moveHistory = []
var movePath = ''
var currentMoveIndex = -1
var placingInitialStones = false
var josekiInfo = null
var lastComputerMoveWasPass = false

function toCoord(index) {
    return (index + 10).toString(36)
}

function toIndex(coord) {
    return parseInt(coord, 36) - 10
}

function swapPlayer() {
    if (currentPlayer === "black") {
        currentPlayer = "white"
    }
    else {
        currentPlayer = "black"
    }
}

function saveBoardHistory() {
    // Remove all ghost stones from the board first
    $('#board .preview').removeClass('black white highlight-black highlight-white')

    if (moveHistory.length > (currentMoveIndex + 1)) {
        moveHistory = moveHistory.slice(0, currentMoveIndex + 1)
    }
    moveHistory.push({
        josekiInfo: JSON.parse(JSON.stringify(josekiInfo)),
        boardState: $('#board').html(),
        movePath: movePath,
    })
    ++currentMoveIndex
}

function createTable() {
    let table = $('#board')
    let xCoordinates = $('#x-coordinates')
    let yCoordinates = $('#y-coordinates')
    xCoordinates.empty()
    yCoordinates.empty()

    let starPoints = ['dd', 'dp', 'pd', 'pp', 'jj', 'dj', 'jd', 'pj', 'jp']
    let starPointElem = '<span class="starPoint"></span>'

    for (let i = 0; i < 19; ++i) {
        let rowCoord = toCoord(i)
        let tableCoord = toCoord(i >= toIndex('i') ? i + 1 : i)
        table.append(`<tr id=${rowCoord}></tr>`)
        xCoordinates.append(`<span>${tableCoord.toUpperCase()}</span>`)
        yCoordinates.append(`<span>${19 - i}</span>`)
        let row = $(`#${rowCoord}`)

        for (let j = 0; j < 19; ++j) {
            let colCoord = toCoord(j)
            row.append(`<td id=${rowCoord}${colCoord} class="clickable"><span class="horizontal"></span><span class="vertical"></span><span class="stone preview"></span>${starPoints.includes(rowCoord + colCoord) ? starPointElem : ''}</td>`)
        }
    }

    let allCells = $('#board td')
    allCells.mouseup(placeStone)
    allCells.mouseenter(showStonePreview)
    allCells.mouseleave(hideStonePreview)
    allCells.contextmenu(returnToMove)
    moveHistory = []
    currentMoveIndex = -1
    $('.flash-message').remove()

    if ($('input[name="startingPoint"]:checked').attr('id') !== 'demo'){
        josekiInfo = {
            _children: [
                { _id: 40, B: 'pd'}, // 4-4
                { _id: 39, B: 'qd'}, // 3-4
                { _id: 248, B: 'qe'}, // 3-5
                { _id: 41, B: 'qc'}, // 3-3
            ]
        }
    }
    else {
        josekiInfo = {}
    }
    saveBoardHistory()
}

function getAdjacentCells(cell, skipIds, color) {
    skipIds = skipIds || []

    let coordPair = cell.attr("id")
    let row = toIndex(coordPair.slice(0,1))
    let col = toIndex(coordPair.slice(1,2))

    let toReturn = []

    if (row != 0) {
        toReturn.push($(`#board #${toCoord(row-1)}${toCoord(col)}`))
    }
    if (row != 18) {
        toReturn.push($(`#board #${toCoord(row+1)}${toCoord(col)}`))
    }
    if (col != 0) {
        toReturn.push($(`#board #${toCoord(row)}${toCoord(col-1)}`))
    }
    if (col != 18) {
        toReturn.push($(`#board #${toCoord(row)}${toCoord(col+1)}`))
    }

    if (color) {
        toReturn = toReturn.filter((c) => {
            return c.find('.stone').hasClass(color) && !skipIds.includes(c.attr('id'))
        })
    }

    return toReturn;
}

function getAdjacentFriendlyCells(cell, skipIds) {
    let color = cell.find('.stone').hasClass('black') ? 'black' : 'white'

    return getAdjacentCells(cell, skipIds, color)
}
function getAdjacentEnemyCells(cell, skipIds) {
    let color = cell.find('.stone').hasClass('black') ? 'white' : 'black'

    return getAdjacentCells(cell, skipIds, color)
}

function countCellLiberties(cell) {
    return getAdjacentCells(cell).reduce((total, c) => {
        let isLiberty = $(c).hasClass("clickable")

        if (isLiberty) {
            return 1 + total
        }

        return total
    }, 0)
}

var seenFriendlyReal = []
var seenLibertiesReal = []
function countGroupLiberties(cell, seenFriendly, seenLiberties) {
    if (!cell.find('.stone').hasClass('black') && !cell.find('.stone').hasClass('white')) {
        return
    }
    
    if (!seenFriendly) { seenFriendlyReal = [] }
    if (!seenLiberties) { seenLibertiesReal = [] }

    seenFriendlyReal.push(cell.attr("id"));

    let adjacent = getAdjacentCells(cell, seenLibertiesReal.concat(seenFriendlyReal))
    let adjacentCoords = adjacent.map((c) => { return c.attr("id") })
    let adjacentFriendly = getAdjacentFriendlyCells(cell);
    let adjacentFriendlyCoords = adjacentFriendly.map((c) => { return c.attr("id") })
    let adjacentEnemy = getAdjacentEnemyCells(cell);
    let adjacentEnemyCoords = adjacentEnemy.map((c) => { return c.attr("id") })

    let liberties = adjacentCoords.filter((coord) => {
        return !adjacentFriendlyCoords.includes(coord) && !adjacentEnemyCoords.includes(coord)
    })
    seenLibertiesReal = seenLibertiesReal.concat(liberties)

    return adjacentFriendly.reduce((total, c) => {
        if (seenFriendlyReal.includes(c.attr('id'))) {
            return total
        }
        return total + countGroupLiberties(c, seenFriendlyReal, seenLibertiesReal)
    }, liberties.length)
}

function canPlaceStone(cell) {
    // Automatic player doesn't leave ghost cells, so this is required for the removal calculation to work
    showStonePreview({ target: cell })

    let isSafe = getAdjacentCells(cell).filter((c) => {
        let stone = c.find(".stone")

        let isLiberty = stone.hasClass("preview")
        let isSameColor = stone.hasClass(currentPlayer)

        // Check for capture
        if (!isLiberty && !isSameColor && countGroupLiberties(c) === 0) {
            removeGroup(c)
            return true
        }

        // Check trivially for self-capture
        if (isLiberty || isSameColor) {
            return true
        }

        return false;
    }).length > 0

    if (!isSafe) {
        hideStonePreview({ target: cell })
    }

    return isSafe
}

function setMoveInfo(moveJosekiInfo) {
    if (!moveJosekiInfo) { return }

    $('#move-info-content').html((moveJosekiInfo['C'] || 'N/A')
        .replace(/\n/g, '<br/>')
        .replace(/\[path:([a-z]+)\]/g, '<a href="#" onclick="startJoseki(\'$1\')">link</a>')
        )
}

function placeStone(event) {
    let cell = $(event.target)
    let stone = cell.find(".stone")
    let currentPlayerIsPlayer = $('input[name="player"]:checked').attr('id') === currentPlayer && !placingInitialStones

    if (!canPlaceStone(cell)) { return alert("Move is illegal due to self-capture."); }

    $('.last-move').removeClass('last-move')
    stone.addClass(`${currentPlayer} last-move`)
    stone.removeClass("preview")
    cell.removeClass("clickable")
    cell.off('mouseup mouseenter mouseleave')
    movePath += cell.attr('id')

    let moveCoord = cell.attr('id')
    let moveJosekiInfo = (josekiInfo && josekiInfo._children)
    ? josekiInfo._children.find((child) => {
        return (child['B'] ? child['B'] : child['W']) === moveCoord
    })
    : null

    if (moveJosekiInfo) {
        return getJosekiInfo(moveJosekiInfo._id)
        .then(() => {
            if (currentPlayerIsPlayer) {
                switch (josekiInfo._mtype) {
                    case 0:
                        flashMessage('<i class="fas fa-check green"></i><i class="fas fa-check green"></i> That\'s an ideal move!')
                        break
                    case 1:
                        flashMessage('<i class="fas fa-check green"></i> That\'s a good move.')
                        break
                    case 2:
                        flashMessage('<i class="fas fa-times red"></i> That\'s a bad move.')
                        break
                    default:
                        flashMessage('')
                        break
                }
            }
            setMoveInfo(moveJosekiInfo)
        })
        .then(continueLogic)
    }
    else if (moveJosekiInfo === null) {
        josekiInfo = null
        continueLogic()
    }
    else {
        if (currentPlayerIsPlayer) {
            flashMessage('<i class="fas fa-times red"></i> Move is not joseki.')
        }
        continueLogic()
    }

    async function continueLogic() {
        saveBoardHistory()
        swapPlayer()
        updateJosekipediaLink()

        if (josekiInfo !== null && josekiInfo._children) {
            autoMove()    
        }
        else if (josekiInfo !== null) {
            flashMessage('Joseki is over.')
        }
    }
}

function removeStone(cell) {
    cell.addClass("clickable")
    cell.find(".stone").removeClass("black white").addClass("preview")
    
    cell.mouseup(placeStone)
    cell.mouseenter(showStonePreview)
    cell.mouseleave(hideStonePreview)
}
function removeGroup(cell) {
    let color = cell.find('.stone').hasClass('black') ? 'black' : 'white'

    removeStone(cell)

    getAdjacentCells(cell).forEach((c) => {
        if (c.find('.stone').hasClass(color)) {
            removeGroup(c)
        }
    })
}

function showStonePreview(event) {
    let stone = $(event.target).find(".stone")

    stone.addClass(currentPlayer)
}

function hideStonePreview(event) {
    let stone = $(event.target).find(".stone")

    stone.removeClass('black white')
}

function returnToMove(event) {
    event.preventDefault()
    let cell = $(event.target)
    let coord = cell.attr('id')

    while (movePath && movePath.slice(-2) !== coord) {
        undo()
    }
}

function getJosekiInfo(playerMoveId) {
    if (window.sessionStorage.getItem(playerMoveId)) {
        return new Promise((done) => {
            josekiInfo = JSON.parse(window.sessionStorage.getItem(playerMoveId))
            done()
        })
    }

    let josekipediaUrl = `http://www.josekipedia.com/db/node.php?id=${playerMoveId}&pid=0`

    return $.ajax({
        headers: {
            'Accept': '*/*'
        },
        type: 'GET',
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(josekipediaUrl)}`,
        crossDomain: true,
        crossOrigin: true,
        success: (rawData) => {
            josekiInfo = JSON.parse(rawData.contents)
            window.sessionStorage.setItem(playerMoveId, rawData.contents)
        }
    })
}

function autoMove(byPassCurrentPlayerCheck) {
    if(josekiInfo == null || placingInitialStones || (!byPassCurrentPlayerCheck && $('input[name="player"]:checked').attr('id') === currentPlayer)) {
        return
    }

    let allMoves = josekiInfo._children
    let filteredMoves = allMoves;
    if ($('input[name="firstTen"]').is(':checked')) {
        filteredMoves = filteredMoves.filter((move, i) => i < 10)
    }
    if (!$('input[name="ideal"]').is(':checked')) {
        filteredMoves = filteredMoves.filter((move) => move._mtype !== 0)
    }
    if (!$('input[name="good"]').is(':checked')) {
        filteredMoves = filteredMoves.filter((move) => move._mtype !== 1)
    }
    if (!$('input[name="bad"]').is(':checked')) {
        filteredMoves = filteredMoves.filter((move) => move._mtype !== 2)
    }
    if (!$('input[name="trick"]').is(':checked')) {
        filteredMoves = filteredMoves.filter((move) => move._mtype !== 3)
    }
    if (!$('input[name="question"]').is(':checked')) {
        filteredMoves = filteredMoves.filter((move) => move._mtype !== 4)
    }
    if ($('input[name="noPass"]').is(':checked')
        && (!josekiInfo._labels
            || (!josekiInfo._labels.includes(9) 
                && !josekiInfo._labels.includes(10)))) {
        filteredMoves = filteredMoves.filter((move) => (move['W'] || move['B']) !== 'tt')
    }

    if (filteredMoves.length === 0) {
        alert('No moves available under current filter settings.')
    }
    
    let randomMoveIndex = Math.floor(Math.random() * filteredMoves.length)
    let randomMoveCoord = filteredMoves[randomMoveIndex][currentPlayer.slice(0,1).toUpperCase()]

    console.log(`Auto-moving at ${randomMoveCoord}(${filteredMoves[randomMoveIndex]._id}) in response to ${josekiInfo['B'] || josekiInfo['W']}(${josekiInfo._id}) (#${randomMoveIndex + 1} of ${filteredMoves.length} possibilities)`)

    if (randomMoveCoord === 'tt') {
        pass()
    }
    else {
        $(`#board #${randomMoveCoord}`).mouseup()
    }
}

async function startJoseki(path) {
    let checked = $('input[name="startingPoint"]:checked')
    path = (!path || path.target) ? checked.attr('id') : path
    
    currentPlayer = 'black'
    placingInitialStones = true
    movePath = ''
    $('#board').empty()
    createTable()
    
    if (path === 'demo' || path === 'empty') {
        if (path === 'demo') {
            josekiInfo = null
        }
        movePath = ''
        highlightMoves()
        updateJosekipediaLink()
        placingInitialStones = false
        return
    }
    
    let moves = path.split(/(..)/g).filter(s => s);
    for (let i = 0; i < moves.length; ++i) {
        let move = moves[i]
        
        if (move === 'tt') {
            await pass()
        }
        else {
            await placeStone({ target: $(`table #${move}`) })
        }
    }
    placingInitialStones = false
    autoMove()
}

function restoreFunctionality() {
    let validCells = $('.clickable')

    validCells.mouseup(placeStone)
    validCells.mouseenter(showStonePreview)
    validCells.mouseleave(hideStonePreview)
    
    let allCells = $('td')

    allCells.contextmenu(returnToMove)
}

function updateJosekipediaLink() {
    $('#josekipedia-link a').attr('href', `http://www.josekipedia.com/#path:${movePath}`)
}

function setHistory() {
    $('#board').html(moveHistory[currentMoveIndex].boardState)
    josekiInfo = moveHistory[currentMoveIndex].josekiInfo
    movePath = moveHistory[currentMoveIndex].movePath
    updateJosekipediaLink()
    setMoveInfo(josekiInfo)
    swapPlayer()
    restoreFunctionality()
}

function undo() {
    if (currentMoveIndex === -1) { return }

    --currentMoveIndex
    setHistory()
}

function redo() {
    if (currentMoveIndex === (moveHistory.length - 1)) { return }

    ++currentMoveIndex
    setHistory()
}

async function pass() {
    swapPlayer()
    movePath += 'tt'
    flashMessage(`${currentPlayer === 'black' ? 'White' : 'Black'} passed.`)
    
    if (josekiInfo && josekiInfo._children && josekiInfo._children.find((c) => (c['W'] || c['B']) === 'tt')) {
        let moveJosekiInfo = josekiInfo._children.find((child) => {
            return (child['B'] || child['W']) === 'tt'
        })
        
        return getJosekiInfo(moveJosekiInfo._id)
        .then(saveBoardHistory)
        .then(autoMove)
    }
    else {
        saveBoardHistory()
    }
}

function highlightMoves() {
    if (!josekiInfo || !josekiInfo._children) {
        return
    }

    josekiInfo._children.forEach((child) => {
        let cell = $(`#board #${child['B'] || child['W']}`)
        let highlightClass = `highlight-${currentPlayer}`

        if (cell.find('.stone').hasClass('preview')){
            if (cell.find('.stone').hasClass(highlightClass)) {
                cell.find('.stone').removeClass(highlightClass)
            }   
            else {
                cell.find('.stone').addClass(highlightClass)
            }
        }
    })
}

function flashMessage(html) {
    let previousFlashes = $('.flash-message')
    $('#flash-messages').prepend(`<span class="flash-message">${html}</span>`)
    let newFlash = $('.flash-message:first-child')

    let newFlashHeight = parseFloat(newFlash.css('height')) + 10

    if (previousFlashes.length) {
        previousFlashes.each((i, previous) => {
            $(previous).css('margin-top', `${parseFloat(previousFlashes.css('margin-top')) - newFlashHeight}px`)
        })
        previousFlashes.animate({
            opacity: 0,
            'transform': `translateY(${newFlashHeight}px)`
        }, 2000, () => {
            previousFlashes.remove()
        })
    }

    newFlash.animate({
        opacity: 100,
    }, 1500)
}

function saveFilters() {
    $('#filters input').each((i, input) => {
        window.localStorage.setItem($(input).attr('id'), $(input).is(':checked'))
    })

    // Also save the selected player
    let playerChoice = $('input[name="player"]:checked')
    window.localStorage.setItem('player', playerChoice.attr('id'))
}

function restoreFilters() {
    $('#filters input').each((i, input) => {
        let storedValue = window.localStorage.getItem($(input).attr('id')) === "true"
        if (storedValue) {
            $(input).prop('checked', storedValue)
        }
    })

    $(`input[id="${window.localStorage.getItem('player')}"]`).prop('checked', true)
}

function centerBoard() {
    let maxSideColumnWidth = Math.max(parseFloat($('#left-column').css('width')), parseFloat($('#right-column').css('width')))
    $('#left-column').css('width', '')
    $('#right-column').css('width', '')
    $('#left-column').css('width', maxSideColumnWidth)
    $('#right-column').css('width', maxSideColumnWidth)
}

startJoseki()
restoreFilters()
$('#submit').click(startJoseki)
$('#undo').click(undo)
$('#redo').click(redo)
$('#pass').click(pass)
$('#highlightMoves').click(highlightMoves)
$('#filters input').click(saveFilters)
$('input[name="player"').click(saveFilters)
$('#showMoveInfo').click((e) => {
    if ($('#showMoveInfo').is(':checked')) {
        $('#move-info').removeClass('hidden')
    }
    else {
        $('#move-info').addClass('hidden')
    }
})

$( document ).tooltip();
centerBoard()

// These are more for reference than anything else
var mtypes = [ 'ideal move', 'good move', 'bad move', 'trick move', 'question move' ]
var jlabels = {
    1: 'Good for white.',
    2: 'Good for black.',
    3: 'White has good influence.',
    4: 'Black has good influence.',
    5: 'This requires a favorable ladder.',
    6: '% requires a favorable ladder.',
    7: 'Leads to a ko.',
    8: '% leads to a ko.',
    9: 'White can tenuki.',
    10: 'Black can tenuki.',
    11: 'White takes the corner.',
    12: 'Black takes the corner.',
    13: 'Solid move.',
    14: 'Old pattern.',
    15: 'Necessary.',
    16: 'Sacrifice play.',
    17: 'White is thick.',
    18: 'Black is thick.',
    19: 'Tesuji.',
    20: 'White collapses.',
    21: 'Black collapses.',
    22: 'Modern pattern.',
    23: 'Position is settled.',
    24: 'White has good profit.',
    25: 'Black has good profit.',
    26: 'Vital point.',
    27: 'Simple position.',
    28: 'Complicated position.',
    29: 'Fighting pattern.',
    30: 'Running battle.',
    31: 'Probing move.',
    32: 'Honte.',
    33: 'Leads to complicated variations.',
    34: '% leads to complicated variations.',
    35: 'Kills.',
    36: 'Reducing move.',
    37: '% kills.',
    38: '% reduces.',
    39: 'Takes sente.',
    40: 'Overplay.',
    41: '% is an overplay.',
    42: 'Leaves weaknesses.',
    43: 'Makes life.',
    44: 'Refutes the trick play.',
    45: 'Position is even.',
    46: 'Slightly good for black.',
    47: 'Slightly good for white.',
    48: 'White connects.',
    49: 'Black connects.',
    50: 'Ko.',
    51: 'Black is sealed in.',
    53: 'Slack.',
    52: 'White is sealed in.',
    54: 'Black has bad shape.',
    55: 'White has bad shape.',
    };