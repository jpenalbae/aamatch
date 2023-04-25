const lmdb = require('lmdb');
const { createHash } = require('node:crypto');
const { v4: uuidv4 } = require('uuid');

const mailer = require('../lib/mailer');
const options = require('../config');


const registerQueue = new Map();

const udb = lmdb.open({
    path: options.usersDB,
    compression: false,
    useVersions: false,
    cache: true,
    dupSort: false
});

function registerUser(user, pass, mail, fcode) {
    if (typeof(user) !== 'string')
        return false;

    // Check if user already exists
    if (udb.get(user))
        return false;

    let uuid = uuidv4();

    let userData = {
        username: user,
        password: pass,
        mail: mail,
        fcode: fcode
    };

    let link = options.url + '/api/p/confirmation/' + uuid;

    if (!mailer.sendMailConfirmation(user, mail, link))
        console.error("[*] Error sending mail");

    // Delete uuid from queue after 24 hours
    setTimeout(() => {
        registerQueue.delete(uuid);
    }, 24 * 3600000);

    registerQueue.set(uuid, userData);
    return true;
}


function confirmUser(uuid) {
    let udata = registerQueue.get(uuid);

    if (!udata)
        return false;

    registerQueue.delete(uuid);
    return create(udata.username, udata.password, udata.mail, udata.fcode);
}


function create(user, pass, mail, fcode) {

    if (typeof(user) !== 'string')
        return false;

    // Check if user already exists
    if (udb.get(user))
        return false;

    let hash = createHash('sha256');
    hash.update(pass);

    let userData = {
        username: user,
        password: hash.digest('hex'),
        mail: mail,
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
module.exports = {  create, userAuth, get, remove, update,
    registerUser, confirmUser
};
