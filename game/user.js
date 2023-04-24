const lmdb = require('lmdb');
const options = require('../config');
const { createHash } = require('node:crypto');


const udb = lmdb.open({
    path: options.usersDB,
    compression: false,
    useVersions: false,
    cache: true,
    dupSort: false
});


function create(user, pass, fcode) {
    // Check if user already exists
    if (udb.get(user))
        return false;

    let hash = createHash('sha256');
    hash.update(pass);

    let userData = {
        username: user,
        password: hash.digest('hex'),
        fcode: fcode,
        failAttempts: 0,            // Number of failed login attempts
        reportedDisconnects: 0,     // Number of opponent disconnects reported
        rank: 0,                    // Player rank 0 to 5
        matches : {
            win: 0,                 // Number of matches won
            loose: 0,               // Number of matches lost
            hang: 0,                // Number of matches not reported
            bad: 0,                 // Number of matches winner does not match
            disconnects: 0          // Number of matches disconnected
        }
    };

    udb.put(user, userData);
    return true;
}

function userAuth(user, pass) {
    let hash = createHash('sha256');
    hash.update(pass);

    let userData = udb.get(user);

    // Return  if user not found
    if (!userData || !userData.password)
        return false;

    // Check the password
    if (userData.password == hash.digest('hex')) {
        return true;
    } else {
        return false;
    }
}


function update(user, data) {
    return udb.put(user, data);
}

function get(user) {
    return udb.get(user);
}


function remove(user) {
    return udb.remove(user);
}


// export all functions
module.exports = { create, userAuth, get, remove, update };
