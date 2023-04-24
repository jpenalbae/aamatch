const user = require('../../game/user');

// Check for arguments
if (process.argv.length != 4) {
    console.log('Usage: node userauth.js <username> <password>');
    process.exit(1);
}

const uname = process.argv[2];
const pass = process.argv[3];

let resul = user.userAuth(uname, pass);
console.log('result: ', resul);