const user = require('../../game/user');

// Check for arguments
if (process.argv.length != 3) {
    console.log('Usage: node userget.js <username>');
    process.exit(1);
}

const uname = process.argv[2];

let userData = user.get(uname);
console.log('User added: ', uname);
console.log(userData);