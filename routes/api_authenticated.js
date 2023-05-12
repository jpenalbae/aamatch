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


router.get('/user/:uname', (req, res) => {
    let udata = user.getPublicInfo(req.params.uname);

    if (!udata) {
        res.status(404).send({ error: 'User not found' });
        return;
    }

    res.send(udata);

});


module.exports = router;