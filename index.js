const app = require('./app');
const options = require('./config');

const port = options.listenPort;


// Start server
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
