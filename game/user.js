const lmdb = require('lmdb');
const { createHash } = require('node:crypto');
const { v4: uuidv4 } = require('uuid');

const mailer = require('../lib/mailer');
const options = require('../config');


const registerQueue = new Map();
const resetQueue = new Map();
const usersWs = new Map();

const udb = lmdb.open({
    path: options.usersDB,
    compression: false,
    useVersions: false,
    cache: true,
    dupSort: false
});


function countUsers() {
    return usersWs.size;
}

function countRegistered() {
    return udb.getStats().entryCount;
}

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

    mailer.sendMailConfirmation(user, mail, link);

    // Delete uuid from queue after 24 hours
    setTimeout(() => {
        registerQueue.delete(uuid);
    }, 24 * 3600000);

    registerQueue.set(uuid, userData);
    return true;
}

function resetRequest(user) {
    const udata = udb.get(user);
    if (!udata)
        return false;

    let uuid = uuidv4();
    let link = options.url + '/reset/' + uuid;

    if (!mailer.sendPasswordReset(user, udata.mail, link))
        console.error("[*] Error sending mail");

    // Delete uuid from queue after 24 hours
    setTimeout(() => {
        resetQueue.delete(uuid);
    }, 24 * 3600000);

    resetQueue.set(uuid, user);
    return true;
}

function resetPassword(uuid, password) {
    const user = resetQueue.get(uuid);
    if (!user)
        return false;

    const udata = udb.get(user);
    if (!udata)
        return false;

    let hash = createHash('sha256');
    hash.update(password);

    udata.password = hash.digest('hex');
    update(user, udata);

    resetQueue.delete(uuid);
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

    // Creaste md5 hash of mail
    let mailHash = createHash('md5');
    mailHash.update(mail);

    let userData = {
        username: user,
        password: hash.digest('hex'),
        mail: mail,
        avatar: mailHash.digest('hex'),     // Gravatar hash
        fcode: fcode,               // Nintendo switch friend code
        reportedDisconnects: 0,     // Number of opponent disconnects reported
        rank: 0,                    // Player rank 0 to 5
        matches : {
            win: 0,                 // Number of matches won
            loose: 0,               // Number of matches lost
            hang: 0,                // Number of matches not reported
            bad: 0,                 // Number of matches winner does not match
            disconnect: 0,         // Number of matches disconnected
            ranked: 0,              // Number of ranked matches
            casual: 0,              // Number of casual matches
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

function getPublicInfo(user) {
    let udata = udb.get(user);

    if (!udata)
        return undefined;

    let data = {
        username: udata.username,
        fcode: udata.fcode,
        rank: udata.rank,
        matches: udata.matches,
        avatar: udata.avatar,
    };

    return data;
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



/**
 *  User websocket functions
 */

function wsAdd(user, data) {
    usersWs.set(user, data);
}

function wsRemove(user) {
    usersWs.delete(user);
}

function wsGet(user) {
    return usersWs.get(user);
}

// export all functions
module.exports = {  create, userAuth, get, remove, update,
    registerUser, confirmUser, wsAdd, wsRemove, wsGet, udb,
    countUsers, getPublicInfo, resetRequest, resetPassword,
    countRegistered
};

