const express = require('express');
const cookieSession = require('cookie-session');
const expressWs = require('express-ws')
const path = require('path');

const { wsMatchHandler,  wsQueueHandler } = require('./routes/wshandler');
const publicRouter = require('./routes/api_public');
const authRouter = require('./routes/api_authenticated');
const pagesRouter = require('./routes/pages');
const options = require('./config');

const sessionOpts = {
    secret: options.sessionSecret,
    cookie: {
        secure: false, // Change this on production
        samesite: true,
        httpOnly: true,
        maxAge: options.sessionExpiration,
        path: '/'
    }
};


let maxAge = 0;
if (process.env.NODE_ENV === 'production')
    maxAge = options.httpCache;

const app = express();
const wsInstance = expressWs(app, null, {leaveRouterUntouched: true});
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


module.exports = app;