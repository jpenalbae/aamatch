const user = require('../../game/user');

// Check for arguments
if (process.argv.length != 3) {
    console.log('Usage: node userdel.js <username>');
    process.exit(1);
}

const uname = process.argv[2];

user.remove(uname);
let userData = user.get(uname);
console.log('User added: ', uname);
console.log(userData);