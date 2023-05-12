const path = require('path');

const options = {
    sibKey: 'xkeysib-asdasdasdasda-asdasdasdasd', // sendinblue api key (mailer)
    sessionSecret: 'your_magic secret',
    listenPort: 3000,
    hostname: 'localhost',
    usersDB:  path.join(__dirname, 'data/users.db'),
    sessionExpiration: 1000 * 60 * 60 * 24 * 30, // One month (in milliseconds)
    httpCache: 1000 * 60 * 60 * 24 * 7, // One week (in milliseconds)
    queueTimeout: 1000 * 60 * 30, // 30 minutes (in milliseconds)
    secure: false, // Change this on production to enable https
    secureCert: path.join(__dirname, 'data/cert.pem'),
    secureKey: path.join(__dirname, 'data/key.pem'),
    banTime: 3600000, // One hour (in milliseconds) Time to ban after rate limit
};

module.exports = options;