const express = require('express');
const router = express.Router();

const match = require('../game/match');
const user = require('../game/user');

/* Home page. */
router.get('/', function(req, res) {
    const pageVars = {
        user: req.session.user,
        matches: match.countMatches(),
        queue: match.countQueue(),
        users: user.countUsers(),
        page: 'index'
    };
    res.render('index', pageVars);
});


router.get('/match/:id', function(req, res) {
    const pageVars = {
        user: req.session.user,
        matches: match.countMatches(),
        queue: match.countQueue(),
        users: user.countUsers(),
        matchid: req.params.id,
        page: 'match'
    };
    res.render('index', pageVars);
});

router.get('/reset/:uuid', function(req, res) {
    const pageVars = {
        user: req.session.user,
        matches: match.countMatches(),
        queue: match.countQueue(),
        users: user.countUsers(),
        uuid: req.params.uuid,
        page: 'reset'
    };
    res.render('index', pageVars);
});

module.exports = router;