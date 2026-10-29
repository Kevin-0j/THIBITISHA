const config = require('./src/config');
const { createApp } = require('./src/app');
const { createStore } = require('./src/services/store');
const { sweepPendingClaims } = require('./src/services/matcher');

const store = createStore();
const app = createApp({ store });

app.listen(config.port, () => {
  console.log(`${config.brandName} USSD webhook listening on http://localhost:${config.port}/ussd (${store.kind} store)`);
  if (store.kind === 'memory') {
    const { managerPhone, housekeeperPhone, ownerPhone, venueCode } = config.demo;
    console.log(`Demo numbers for the simulator: manager ${managerPhone}, housekeeper ${housekeeperPhone}, owner ${ownerPhone}`);
    console.log(`Any other number is a payer. Demo place code: ${venueCode}`);
  }
});

// Tell owners about payer confirmations that no staff log matched within the window.
setInterval(() => {
  sweepPendingClaims(store).catch((err) => console.error('[matcher] sweep failed:', err.message));
}, config.payer.sweepIntervalMs).unref();
