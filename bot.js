const dotenv = require('dotenv');
dotenv.config();

const ac = require('./modules/aquaClient');
const prefix = '.';
const AquaClient = new ac(prefix);

AquaClient.start();
