const Neon = require('@cityofzion/neon-js');
const coreService = require('../services/core.service');

const entry = async () => {
    coreService.process();    
}

module.exports = {
    entry
};
