const { v4: uuidv4 } = require('uuid');
const user = require('./user');


const queueCasual = new Map();
const queueRanked = new Map();
const matches = new Map();



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


function matchJoinTimeout(matchid) {
    let match = matches.get(matchid);
    if (!match)
        return;

    console.log('Checking timeout for match: ' + matchid);

    if (match.playing === true) {
        return;
    }


    // Send a message to the users that the match has been cancelled
    match.udata.forEach((value, key) => {
        let ws = user.wsGet(key);
        if (ws) {
            ws.send(JSON.stringify({
                push: 'match_timeout',
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
        users: [uname, opponent[0]],
        udata: new Map(),
        time: Date.now(),
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
    setInterval(matchJoinTimeout, 5 * 60 * 1000, matchid);

    return { code: 0, message: 'matched', matchid: matchid };
}


function getMatchID(matchid) {
    return matches.get(matchid);
};


module.exports = { 
    findCasualGame, matchGetMyUserData, matchGetOpponentData,  getMatchID
};
