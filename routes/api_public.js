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
    };

    res.send(data);

});

module.exports = router;