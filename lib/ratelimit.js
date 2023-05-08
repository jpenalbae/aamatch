/**
 * @fileoverview Cheap implementation of rate limit.
 */

const options = require('../config');

var rateLog = new Map();
var banList = new Map();

// Reset the rate log every 24h
setInterval(() => {
    rateLog.clear();
    banList.clear();
}, 24 * 3600000);


function banCheck(key) {
    let now = Date.now();
    let banTime = banList.get(key);

    if (banTime && banTime > now - options.banTime)
        return true;
    else if (banTime)
        banList.delete(key);

    return false;
}


function checkRate(addr, path, max, time ) {
    let key = addr + ':' + path;
    let now = Date.now();

    // always return true if not in production
    // if (process.env.NODE_ENV !== 'production')
    //     return true;

    // Check if banned
    if (banCheck(key))
        return false;

    if (!rateLog.has(key)) {
        rateLog.set(key, [now]);
        return true;
    }

    let times = rateLog.get(key);
    times.push(now);
    
    // Remove entries older than time
    while (times.length > 0 && times[0] < now - time)
        times.shift();

    if (times.length > max) {
        banList.set(key, now);
        return false;
    }

    return true;
}

module.exports = { checkRate };

