const match = require('../game/match');
const user = require('../game/user');


/*
 * Queue websocket handling
 */


const queueChat = new Map();


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

function queueRelayChat(uname, msg) {
    
    queueChat.forEach((value, key) => {
        if (key === uname)
            return;

        let ws = user.wsGet(key);
        if (!ws)
            return;

        console.log("Websocket");
        console.log(ws);

        ws.send(JSON.stringify({
            push: 'chat',
            message: msg
        }));
    });
}


function cleanQueueMaps(uname) {
    queueChat.delete(uname);
    user.wsRemove(uname);
}


function wsQueueHandler(ws, req) {

    const uname = req.session.user;
    user.wsAdd(uname, ws);
    queueChat.set(uname, ws);

    
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
            case 'chat':
                queueRelayChat(uname, jmsg.message);
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

    ws.on('close', () => { cleanQueueMaps(uname); });
    ws.on('error', () => { cleanQueueMaps(uname); });
    ws.on('timeout', () => { cleanQueueMaps(uname); });
}



/*
 * Match websocket handling
 */


function matchPlayerReady(matchData) {
    matchData.udata.ready = true;

    // Check if opponent is ready
    if (!matchData.odata.ready) 
        return;

    // Mark the match as ready for the timeout
    matchData.ready = true;

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


    console.log('connected to match')
    console.log(req.params.matchid);
    
    // On first connection wer obtain all the match info
    const matchid = req.params.matchid;
    const matchInfo = match.getMatchID(matchid);
    const uname = req.session.user;
    const udata = match.matchGetMyUserData(uname, matchid);
    const opponent = match.matchGetOpponentData(uname, matchid);

    const matchData = {
        uname: uname,
        udata: udata,
        odata: opponent,
        matchid: matchid
    };

    // Check if match exists and user belongs to it
    if (!matchInfo || !udata) {

        console.log('Someone is wrong on this match');
        console.log('Match info')
        console.log(matchInfo)

        console.log('user data')
        console.log(udata)

        ws.terminate();
        user.wsRemove(uname);
        return;
    }


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
            case 'ready':
                matchPlayerReady(matchData);
                break;
            case 'chat':
                matchRelayChat(matchData, jmsg.message);
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

    ws.on('close', () => { user.wsRemove(uname); });
    ws.on('error', () => { user.wsRemove(uname); });
    ws.on('timeout', () => { user.wsRemove(uname); });
}


module.exports = { wsMatchHandler, wsQueueHandler };
