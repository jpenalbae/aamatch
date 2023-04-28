const express = require('express');
const router = express.Router();
const user = require('../game/user');


/* GET users listing. */
router.get('/health', (req, res) => {
    res.send('Public health');
});

router.get('/login', (req, res) => {
    req.session.user = 'pepe';
    res.send({ logged: true });
});


router.post('/login', (req, res) => {
    let uname = req.body.username;
    let password = req.body.password;

    if (!uname || !password) {
        req.session = null;
        res.status(401).send({ logged: false });
        return;
    }

    if (!user.userAuth(uname, password)) {
        req.session = null;
        res.status(401).send({ logged: false });
        return;
    }

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

    console.log(uname);

    if (!uname || !password || !mail || !fcode) {
        res.status(400).send({ error: 'Bad request', code: 1 });
        return;
    }

    if (typeof(uname) !== 'string' || typeof(password) !== 'string' ||
            typeof(mail) !== 'string' || typeof(fcode) !== 'string') {
        res.status(400).send({ error: 'Bad request', code: 2 });
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

    if (!user.registerUser(uname, password, mail, fcode)) {
        res.status(500).send({ error: 'Registering user' });
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

    res.send({ register: true, message: 'User registered' });
});



router.get('/logout', (req, res) => {
    req.session = null;
    res.send({ logged: false });
});

router.get('/user/:uname', (req, res) => {
    let udata = user.get(req.params.uname);

    if (!udata) {
        res.status(404).send({ error: 'User not found' });
        return;
    }

    let data = {
        username: udata.username,
        fcode: udata.fcode,
        rank: udata.rank,
        matches: udata.matches,
        avatar: udata.avatar,
    };

    res.send(data);

});

module.exports = router;
