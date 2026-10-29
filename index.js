const config = require('./src/config');
const { createApp } = require('./src/app');
const { createStore } = require('./src/services/store');

const store = createStore();
const app = createApp({ store });

app.listen(config.port, () => {
  console.log(`${config.brandName} USSD webhook listening on http://localhost:${config.port}/ussd (${store.kind} store)`);
  if (store.kind === 'memory') {
    const { managerPhone, housekeeperPhone, ownerPhone } = config.demo;
    console.log(`Demo numbers for the simulator: manager ${managerPhone}, housekeeper ${housekeeperPhone}, owner ${ownerPhone}`);
  }
});
