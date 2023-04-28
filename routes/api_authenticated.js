const express = require('express');
const router = express.Router();
const user = require('../game/user');


/* Check auth is  */
router.use((req, res, next) => {
    //console.log("checking auth");
    if (!req.session.user) {
        res.status(401).send({ error: 'Not authorized' });
        return;
    }

    if (!user.get(req.session.user)) {
        req.session = null;
        res.status(401).send({ error: 'Not authorized' });
        return;
    }

    console.log('user found: ', req.session.user);
    next();
});


router.get('/health', (req, res) => {
    memory = process.memoryUsage();
    res.send({ 
        health: 'ok',
        user: req.session.user,
        memory: memory
    });
});


module.exports = router;