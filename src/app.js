const express = require('express');
const config = require('./config');
const { handleUssd } = require('./ussd/router');

function createApp({ store }) {
  const app = express();

  // Africa's Talking posts application/x-www-form-urlencoded.
  app.use(express.urlencoded({ extended: false }));

  app.get('/', (_req, res) => {
    res.type('text/plain').send(`${config.brandName} USSD webhook is running (${store.kind} store). POST /ussd`);
  });

  app.post('/ussd', async (req, res) => {
    const { sessionId, phoneNumber, networkCode, serviceCode, text = '' } = req.body;
    console.log(`[ussd] ${sessionId} ${phoneNumber} text="${text}"`);

    const reply = await handleUssd({ sessionId, phoneNumber, networkCode, serviceCode, text }, store);

    // Always 200 + text/plain: a non-200 shows the user a generic network error instead of our message.
    res.status(200).type('text/plain').send(reply);
  });

  return app;
}

module.exports = { createApp };
