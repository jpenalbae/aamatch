const os = require('os');
const express = require('express');
const router = express.Router();
const user = require('../game/user');
const match = require('../game/match');
const rate = require('../lib/ratelimit');
const options = require('../config');


router.post('/login', (req, res) => {
    let uname = req.body.username;
    let password = req.body.password;

    if (!uname || !password) {
        req.session = null;
        res.status(401).send({ logged: false });
        return;
    }

    // Check no more than 10 logins per minute
    if (!rate.checkRate(req.ip, '/login', 10, 60000)) {
        res.status(429).send({ logged: false, error: 'Too many requests' });
        return;
    }

    if (!user.userAuth(uname, password)) {
        req.session = null;
        res.status(401).send({ logged: false });
        return;
    }

    // Set session expiration
    req.sessionOptions.maxAge = options.sessionExpiration;
    req.session.user = req.body.username;
    res.send({ logged: true });
});


router.post('/register', (req, res) => {
    // Invalidate current session
    req.session = null;

    let uname = req.body.username;
    let password = req.body.password;
    let mail = req.body.mail;
    let fcode = req.body.fcode;

    if (!uname || !password || !mail || !fcode) {
        res.status(400).send({ error: 'Bad request', code: 1 });
        return;
    }

    if (typeof(uname) !== 'string' || typeof(password) !== 'string' ||
            typeof(mail) !== 'string' || typeof(fcode) !== 'string') {
        res.status(400).send({ error: 'Bad request', code: 2 });
        return;
    }

    // Check username pattern for valid characters
    const userRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!userRegex.test(uname)) {
        res.status(400).send({ error: 'Bad username. Only letters and numbers allowed.', code: 3 });
        return;
    }

    // check for valid email
    mail = mail.toLowerCase();
    //const mailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
    if (!mailRegex.test(mail)) {
        res.status(400).send({ error: 'Bad email' });
        return;
    }

    // Check for a valid friend code
    const regex = /^SW-\d{4}-\d{4}-\d{4}$/;
    if (!regex.test(fcode)) {
        res.status(400).send({ error: 'Bad Switch friend code' });
        return;
    }

    // Check password length
    if (password.length < 6) {
        res.status(400).send({ error: 'Password too short. Minimun length is 6 characters'});
        return;
    }

    if (user.get(uname)) {
        res.status(400).send({ error: 'User already exists' });
        return;
    }


    // Check no more than 3 registrations per minute
    if (!rate.checkRate(req.ip, '/register', 3, 60000)) {
        res.status(429).send({ error: 'Too many requests' });
        return;
    }

    if (!user.registerUser(uname, password, mail, fcode)) {
        res.status(500).send({ error: 'Error. Try again later.' });
        return;
    }

    res.send({ register: true, message: 'Check email' });
});


// TODO redirect to login with success confirmation message
router.get('/confirmation/:uuid', (req, res) => {
    let uuid = req.params.uuid;

    if (!uuid) {
        res.status(400).send({ error: 'Bad request' });
    }

    if (!user.confirmUser(uuid)) {
        res.status(400).send({ error: 'Unknown confirmation uuid' });
        return;
    }

    //res.send({ register: true, message: 'User registered' });
    res.redirect('/#registerok');
});


router.post('/resetreq', (req, res) => {
    let uname = req.body.username;

    if (!uname || typeof(uname) !== 'string') {
        res.status(400).send({ reset:false, error: 'Bad request' });
        return;
    }

    // Check no more than 10 reset requests per min
    if (!rate.checkRate(req.ip, '/resetreq', 10, 60000)) {
        res.status(429).send({ reset:false, error: 'Too many requests' });
        return;
    }

    user.resetRequest(uname);

    // Always send same response to avoid user enumeration
    res.send({ reset: true });
});


// reset user password
router.post('/reset', (req, res) => {
    let password = req.body.password;
    let uuid = req.body.uuid;

    if (!password || !uuid) {
        res.status(400).send({ reset: false, error: 'Bad request' });
        return;
    }

    if (typeof(uuid) !== 'string' || typeof(password) !== 'string' ||
            typeof(uuid) !== 'string') {
        res.status(400).send({ reset: false, error: 'Bad request' });
        return;
    }

    // Check password length
    if (password.length < 6) {
        res.status(400).send({ 
            reset: false,
            error: 'Password too short. Minimun length is 6 characters'
        });
        return;
    }

    if (!user.resetPassword(uuid, password)) {
        res.status(500).send({ reset: false, error: 'Error reseting password' });
        return;
    }

    res.send({ reset: true });
});


router.get('/logout', (req, res) => {
    req.session = null;
    //res.send({ logged: false });

    //redirect to homepage
    res.redirect('/');
});


router.get('/health', (req, res) => {
    memory = process.memoryUsage();
    
    res.send({ 
        memory: memory,
        matches: match.countMatches(),
        queue: match.countQueue(),
        users: user.countUsers(),
        registered: user.countRegistered(),
        uptime: process.uptime(), // in seconds
        load: os.loadavg(),
    });
});


module.exports = router;
