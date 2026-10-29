const config = require('../../config');
const { createMemoryStore, demoSeed } = require('./memory');
const { createPostgresStore } = require('./postgres');

function createStore() {
  if (config.database.url) {
    return createPostgresStore({ url: config.database.url, caCertPath: config.database.caCertPath });
  }
  return createMemoryStore(demoSeed(config.demo));
}

module.exports = { createStore, createMemoryStore, createPostgresStore, demoSeed };
