const express = require('express');
const cookieSession = require('cookie-session');
const expressWs = require('express-ws')
const path = require('path');

const { wsMatchHandler,  wsQueueHandler } = require('./routes/wshandler');
const publicRouter = require('./routes/api_public');
const authRouter = require('./routes/api_authenticated');
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

// Basic express setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.use(cookieSession(sessionOpts));
app.use(express.json());
app.use(express.static('public', {maxAge: maxAge}));
app.use('/api/p/', publicRouter);
app.use('/api/a/', authRouter);
authRouter.ws('/queue', wsQueueHandler);
authRouter.ws('/match/:matchid', wsMatchHandler);

/* Home page. */
app.get('/', function(req, res) {
    res.render('index', { user: req.session.user });
});

module.exports = app;