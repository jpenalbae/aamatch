const express = require('express');
const router = express.Router();


/* Check auth is  */
router.use((req, res, next) => {
    //console.log("checking auth");
    if (!req.session.user) {
        res.status(401).send({ error: 'Not authorized' });
        return;
    } else {
        //console.log('user found: ', req.session.user);
        next();
    }
});


router.get('/health', (req, res) => {
    memory = process.memoryUsage();
    res.send({ 
        health: 'ok',
        memory: memory
    });
});


module.exports = router;