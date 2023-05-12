const express = require('express');
const cookieSession = require('cookie-session');
const expressWs = require('express-ws')
const path = require('path');
const https = require('https');
const fs = require('fs');

const { wsMatchHandler,  wsQueueHandler } = require('./routes/wshandler');
const publicRouter = require('./routes/api_public');
const authRouter = require('./routes/api_authenticated');
const pagesRouter = require('./routes/pages');
const options = require('./config');



function dropPrivs() {
    if (options.dropPrivs)
        process.setuid(options.dropUser);
}


const port = options.listenPort;

const sessionOpts = {
    secret: options.sessionSecret,
    cookie: {
        secure: options.secure, // Change this on production
        samesite: true,
        httpOnly: true,
        maxAge: options.sessionExpiration,
        path: '/'
    }
};

// Make the URL
let proto = "http://"
if (options.secure)
    proto = "https://"
options.url = proto + options.hostname + ":" + port;

let maxAge = 0;
if (process.env.NODE_ENV === 'production')
    maxAge = options.httpCache;

let server = undefined;
const app = express();
if (options.secure) {
    const httpsOptions = {
        key: fs.readFileSync(options.secureKey),
        cert: fs.readFileSync(options.secureCert)
    };
    server = https.createServer(httpsOptions, app);
}
const wsInstance = expressWs(app, server, {leaveRouterUntouched: true});
wsInstance.applyTo(authRouter);

// Livereload
if (process.env.NODE_ENV !== 'production') {
    console.log('Enable livereload');

    app.use(require('connect-livereload')());
    
    const liveReloadServer = require('livereload').createServer();
    liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 600);
    });
}

// Basic express setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.use(cookieSession(sessionOpts));
app.use(express.json());
app.use(express.static('public', {maxAge: maxAge}));
app.use('/', pagesRouter);
app.use('/api/p/', publicRouter);
app.use('/api/a/', authRouter);
authRouter.ws('/queue', wsQueueHandler);
authRouter.ws('/match/:matchid', wsMatchHandler);


if (options.secure) {
    server.listen(port, () => {
        dropPrivs();
        console.log(`listening on: ${options.url}`);
    });
} else {
    app.listen(port, () => {
        dropPrivs();
        console.log(`listening on: ${options.url}`);
    });
}
