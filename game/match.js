const { v4: uuidv4 } = require('uuid');
const user = require('./user');
const options = require('../config');

const queueCasual = new Map();
const queueRanked = new Map();
const matches = new Map();


function countMatches() {
    return matches.size;
}

function countQueue() {
    return queueCasual.size + queueRanked.size;
}



// Purge stalled games every hour.
// Games older than 24 hours are purged.
setInterval(() => {
    let now = Date.now();
    for (let [key, value] of matches) {
        if (now - value.time > 24 * 3600000) {
            matches.delete(key);
        }
    }
}, 3600000);


// Remove users from waiting queue every minute
// Remove older than 30 mins
setInterval(() => {
    let now = Date.now();
    for (let [key, value] of queueCasual) {
        if (now - value.time > options.queueTimeout) {
            queueCasual.delete(key);
            doQueueTimeout(key);
        }
    }
    for (let [key, value] of queueRanked) {
        if (now - value.time > options.queueTimeout) {
            queueRanked.delete(key);
            doQueueTimeout(key);
        }
    }
}, 60000);


function doQueueTimeout(uname) {
    let ws = user.wsGet(uname);
    if (!ws)
        return;

    ws.send(JSON.stringify({
        push: 'timeout',
        type: 'queue'
    }));

    ws.send(JSON.stringify({
        push: 'msg',
        type: 'error',
        message: 'Timeout looking for opponent. Please retry.'
    }));

    ws.terminate();
    user.wsRemove(uname);
}


function matchJoinTimeout(matchid) {
    let match = matches.get(matchid);
    if (!match)
        return;

    console.log('Checking timeout for match: ' + matchid);

    if (match.playing)
        return;


    // Send a message to the users that the match has been cancelled
    match.udata.forEach((value, key) => {
        let ws = user.wsGet(key);
        if (ws) {
            ws.send(JSON.stringify({
                push: 'timeout',
                type: 'match',
                message: 'Match timed out'
            }));
            ws.terminate();
        }
        user.wsRemove(key);
    });

    matches.delete(matchid);
}


function matchGetOpponentData(uname, matchid) {
    const data = matches.get(matchid);
    if (!data)
        return undefined;

    // Check if the user belongs to this match
    if (data.users[0] !== uname && data.users[1] !== uname)
        return undefined;

    if (data.users[0] !== uname)
        return data.udata.get(data.users[0]);
    else
        return data.udata.get(data.users[1]);

    return undefined;
}

function matchGetMyUserData(uname, matchid) {

    const data = matches.get(matchid);
    if (!data)
        return undefined;

    return data.udata.get(uname);
}


function addToQueue(uname, mode) {

    const udata = user.get(uname);
    if (!udata)
        return false;

    let data = {
        uname: uname,
        udata: udata,
        time: Date.now()
    };

    // First purge from every queue just in case
    removeFromQueue(uname);

    if (mode === 'casual') {
        queueCasual.set(uname, data);
    } else if (mode === 'ranked') {
        queueRanked.set(uname, data);
    } else {
        return false;
    }

    return true;
}


function removeFromQueue(uname) {
    
        queueCasual.delete(uname);
        queueRanked.delete(uname);
        return true;
}


function findCasualGame(uname) {
    const udata = user.get(uname);
    if (!udata)
        return { error: 'User not found' };

    // Delete user is already in queue
    queueCasual.delete(uname);

    // Get first user from queue
    const opponent = queueCasual.entries().next().value;
    if (!opponent) {
        if (!addToQueue(uname, 'casual'))
            return { error: 'Error adding to queue' };
        return { code: 1, messsage: 'queued' };
    }

    // Remove from queue
    removeFromQueue(opponent[0]);

    let matchid = uuidv4();
    let data = {
        matchid: matchid,
        type: 'casual',
        users: [uname, opponent[0]],
        udata: new Map(),
        time: Date.now(),
        report: new Map(),
        playing: false
    }

    data.udata.set(uname, udata);
    data.udata.set(opponent[0], opponent[1].udata);

    // Add match to the map
    matches.set(matchid, data);

    // Notify players of the match
    let ws = user.wsGet(opponent[0]);
    ws.send(JSON.stringify({ push: 'matched', matchid: matchid }));
    ws = user.wsGet(uname);
    ws.send(JSON.stringify({ push: 'matched', matchid: matchid }));

    // Clear game if players are not ready after 5 mins
    setTimeout(matchJoinTimeout, 5 * 60 * 1000, matchid);

    return { code: 0, message: 'matched', matchid: matchid };
}

/*
 * Valid results are:
    close: the user closed the websocket without reporting
    disconnect: the user reported opponent disconnecting
    win: the user reported winning
    loose: the user reported loosing
 */
function reportMatchResult(mdata, result) {
    const matchid = mdata.matchid;
    const match = matches.get(matchid);
    const uname = mdata.uname;
    const oname = mdata.odata.username;
    let countMatch = false;


    if (!match || !match.playing)
        return false;

    // Already reported
    if (match.report.has(mdata.uname))
        return false;

    // If first report is a close, then notify opponent
    const ws = user.wsGet(oname);
    if (result === 'close' && ws) 
        ws.send(JSON.stringify({push: 'disconnect'}));
    else if (ws)
        ws.send(JSON.stringify({push: 'end'}));

    // Add report
    match.report.set(mdata.uname, result);

    // Check if both players have reported
    if (match.report.size !== 2)
        return false;
    
    // Check if both players have reported the same result
    const ureport = match.report.get(uname);
    const oreport = match.report.get(oname);
    const udata = user.get(uname);
    const odata = user.get(oname);
    
    if (ureport === 'win' && oreport === 'loose') {
        udata.matches.win++;
        odata.matches.loose++;
        countMatch = true;
    } else if (ureport === 'loose' && oreport === 'win') {
        udata.matches.loose++;
        odata.matches.win++;
        countMatch = true;
    } else if (ureport === 'close' && oreport === 'close') {
        udata.matches.hang++;
        odata.matches.hang++;
    } else if (ureport === 'close' && oreport === 'disconnect') {
        udata.matches.disconnect++;
        odata.reportedDisconnects++;
    } else if (ureport === 'disconnect' && oreport === 'close') {
        udata.reportedDisconnects++;
        odata.matches.disconnect++;
    } else if (ureport === 'close') {
        udata.matches.disconnect++;
    } else if (oreport === 'close') {
        odata.matches.disconnect++;
    } else {
        udata.matches.bad++;
        odata.matches.bad++;
    }

    const type = match.type;
    if (type === 'casual' && countMatch) {
        udata.matches.casual++;
        odata.matches.casual++; 
    }

    user.update(uname, udata);
    user.update(oname, odata);

    matches.delete(matchid);
    return true;
}


function getMatchID(matchid) {
    return matches.get(matchid);
};


module.exports = { 
    findCasualGame, matchGetMyUserData, matchGetOpponentData,  getMatchID,
    countMatches, countQueue, removeFromQueue, reportMatchResult
};
