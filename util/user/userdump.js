const user = require('../../game/user');
const { udb } = require('../../game/user');


for (let { key, value } of udb.getRange()) {
	console.log(value);
}