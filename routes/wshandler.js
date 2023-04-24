


function wsHandler(ws, req) {

    console.log('New websocket client');
    
    ws.on('message', msg => {
        ws.send('received: ' + msg);
        ws.send('hello user: ' + req.session.user);
    });

    ws.on('close', () => {
        console.log('WebSocket was closed');
    });

    ws.on('error', () => {
        console.log('WebSocket error?');
    });
}


module.exports = wsHandler;