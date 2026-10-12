'use strict';

const { handleStorageApiRequest } = require('../lib/serverStorage');

async function handler(req, res) {
  return handleStorageApiRequest(req, res);
}

module.exports = handler;
module.exports.default = handler;
