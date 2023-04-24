const user = require('../../game/user');

// Check for arguments
if (process.argv.length != 5) {
    console.log('Usage: node useradd.js <username> <password> <friend code>');
    process.exit(1);
}

const uname = process.argv[2];
const pass = process.argv[3];
const fcode = process.argv[4];

let creationRes = user.create(uname, pass, fcode);
if (!creationRes) {
    console.log('User already exists');
    process.exit(1);
}

let userData = user.get(uname);
console.log('User added: ', uname);
console.log(userData);

