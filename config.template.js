const path = require('path');

const options = {
    sessionSecret: 'your_magic secret',
    hostname: 'localhost',
    listenPort: 3000,
    usersDB:  path.join(__dirname, 'data/users.db'),
    sessionExpiration: 1000 * 60 * 60 * 24 * 30, // One month (in milliseconds)
    httpCache: 1000 * 60 * 60 * 24 * 7, // One week (in milliseconds)
    secure: false, // Change this on production to enable https
};

module.exports = options;