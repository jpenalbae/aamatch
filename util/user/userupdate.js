const user = require('../../game/user');

// Check for arguments
if (process.argv.length != 3) {
    console.log('Usage: node userupdate.js <username>');
    process.exit(1);
}

const uname = process.argv[2];

let userData = user.get(uname);
console.log(userData);

userData.matches.win += 1;
user.update(uname, userData);

let newData = user.get(uname);
console.log('User updated');
console.log(newData);
