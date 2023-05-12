const user = require('../../game/user');
const { udb } = require('../../game/user');


const range = udb.getRange();
for (let { key, value } of range) {
	console.log(value);
}


console.log(udb.getStats().entryCount);

