const express = require('express');
const session = require('express-session');
const expressWs = require('express-ws')

const publicRouter = require('./routes/api_public');
const authRouter = require('./routes/api_authenticated');
const wsHandler = require('./routes/wshandler');
const options = require('./config');

const sessionOpts = {
    secret: options.sessionSecret,
    saveUninitialized: false,
    resave: false,
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

// Basic express setup
app.disable('x-powered-by');
app.use(session(sessionOpts));
app.use(express.json());
app.use(express.static('public', {maxAge: maxAge}));
app.use('/api/p/', publicRouter);
app.use('/api/a/', authRouter);
authRouter.ws('/ws', wsHandler);

module.exports = app;