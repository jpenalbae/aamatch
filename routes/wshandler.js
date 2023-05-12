const match = require('../game/match');
const user = require('../game/user');


/*
 * Queue websocket handling
 */



function queueFindCasualGame(ws, uname) {
    const res = match.findCasualGame(uname);
    if (res.error) {
        ws.send(JSON.stringify({
            push: 'msg',
            type: 'error',
            message: res.error
        }));

        return;
    }


    if (res.code === 1) {
        ws.send(JSON.stringify({
            push: 'msg',
            type: 'info',
            message: 'Queued for casual match'
        }));

        return;
    } else if (res.code === 0) {
        ws.send(JSON.stringify({
            push: 'msg',
            type: 'info',
            message: 'A player has been found'
        }));

        return;
    } else {
        ws.send(JSON.stringify({
            push: 'msg',
            type: 'error',
            message: 'Unknown error'
        }));

        return;
    }

}


function parseWsJSON(msg) {
    let jmsg;

    try {
        jmsg = JSON.parse(msg);
    } catch (e) {
        return undefined;
    }

    return jmsg;
}


function cleanQueueMaps(uname) {
    user.wsRemove(uname);
}


function wsQueueHandler(ws, req) {

    const uname = req.session.user;
    user.wsAdd(uname, ws);

    
    ws.on('message', msg => {
        let jmsg = parseWsJSON(msg);
        if  (!jmsg) {
            ws.send(JSON.stringify({
                push: 'msg',
                type: 'error',
                message: 'Invalid JSON'
            }));
            return;
        }

        // Handle commands
        switch (jmsg.cmd) {
            case 'find_casual':
                queueFindCasualGame(ws, uname);
                break;
            default:
                ws.send(JSON.stringify({
                    push: 'msg',
                    type: 'error',
                    message: 'Unknown command'
                }));
                return
                break;
        }
    });

    ws.on('close', () => { match.removeFromQueue(uname); });
    ws.on('error', () => { match.removeFromQueue(uname); });
    ws.on('timeout', () => { match.removeFromQueue(uname); });
}



/*
 * Match websocket handling
 */


function matchPlayerReady(matchData) {
    const matchInfo = match.getMatchID(matchData.matchid);
    matchData.udata.ready = true;

    if (!matchInfo)
        return;

    // Check if opponent is ready
    if (!matchData.odata.ready) 
        return;

    // Mark the match as ready for the timeout
    matchData.ready = true;
    matchInfo.playing = true;

    // Both players are ready, start the match
    // Notify both players
    let wsUser = user.wsGet(matchData.uname);
    let wsOpponent = user.wsGet(matchData.odata.username);

    wsUser.send(JSON.stringify({
        push: 'ready',
        matchid: matchData.matchid,
        opponent: matchData.odata.username,
        fcode: matchData.odata.fcode,
        rank: matchData.odata.rank,
        matches: matchData.odata.matches
    }));

    wsOpponent.send(JSON.stringify({
        push: 'ready',
        matchid: matchData.matchid,
        opponent: matchData.username,
        fcode: matchData.udata.fcode,
        rank: matchData.udata.rank,
        matches: matchData.udata.matches
    }));

}

function matchRelayChat(matchData, msg) {
    let wsOpponent = user.wsGet(matchData.odata.username);

    wsOpponent.send(JSON.stringify({
        push: 'chat',
        message: msg
    }));
}


function wsMatchHandler(ws, req) {

    // On first connection wer obtain all the match info
    const matchid = req.params.matchid;
    const matchInfo = match.getMatchID(matchid);
    const uname = req.session.user;
    const udata = match.matchGetMyUserData(uname, matchid);
    const opponent = match.matchGetOpponentData(uname, matchid);

    udata.ready = false;
    opponent.ready = false;

    const matchData = {
        uname: uname,
        udata: udata,
        odata: opponent,
        matchid: matchid,
        ready: false,
    };

    // Check if match exists and user belongs to it
    if (!matchInfo || !udata) {
        ws.terminate();
        user.wsRemove(uname);
        return;
    }


    user.wsAdd(uname, ws);

    // Send match info
    ws.send(JSON.stringify({
        push: 'match_info',
        matchid: matchid,
        user: {
            username: udata.username,
            fcode: udata.fcode,
            rank: udata.rank,
            matches: udata.matches,
            avatar: udata.avatar
        },
        opponent: {
            username: opponent.username,
            fcode: opponent.fcode,
            rank: opponent.rank,
            matches: opponent.matches,
            avatar: opponent.avatar
        }
    }));


    ws.on('message', msg => {
        let jmsg = parseWsJSON(msg);
        if  (!jmsg) {
            ws.send(JSON.stringify({
                push: 'msg',
                type: 'error',
                message: 'Invalid JSON'
            }));
            return;
        }

        // Handle commands
        switch (jmsg.cmd) {
            case 'ready':
                // console.log('Player ready: ' + uname);
                matchPlayerReady(matchData);
                break;
            case 'chat':
                matchRelayChat(matchData, jmsg.message);
                break;
            case 'report':
                match.reportMatchResult(matchData, jmsg.type);
                break;
            default:
                ws.send(JSON.stringify({
                    push: 'msg',
                    type: 'error',
                    message: 'Unknown command'
                }));
                return
                break;
            
        }
    });


    function handleMatchWsEnd() {
        match.reportMatchResult(matchData, 'close');
        cleanQueueMaps(uname);
    }

    ws.on('close', () =>  handleMatchWsEnd());
    ws.on('error', () =>  handleMatchWsEnd());
    ws.on('timeout', () =>  handleMatchWsEnd());
}


module.exports = { wsMatchHandler, wsQueueHandler };
