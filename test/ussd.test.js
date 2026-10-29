// Simulates Africa's Talking: form-encoded POSTs to /ussd with the accumulated text string.
// The whole suite runs against the in-memory store, and again against Postgres when
// TEST_DATABASE_URL points at a database loaded with db/schema.sql (it is wiped between tests).
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const config = require('../src/config');
const { createApp } = require('../src/app');
const { createMemoryStore, createPostgresStore, demoSeed } = require('../src/services/store');
const { outbox } = require('../src/services/sms');
const { subscriptionActive } = require('../src/services/notify');

const MANAGER = config.demo.managerPhone;
const CLEANER = config.demo.housekeeperPhone;
const OWNER = config.demo.ownerPhone;

async function seedPostgres(url) {
  const pool = new Pool({ connectionString: url });
  const seed = demoSeed(config.demo);
  await pool.query('truncate venues, staff, shifts, transactions, housekeeping_reports cascade');
  // The append-only trigger blocks deletes but not truncate, which is what we want in tests.
  for (const v of seed.venues) {
    await pool.query('insert into venues (id, name, plan, owner_phone) values ($1, $2, $3, $4)', [v.id, v.name, v.plan, v.ownerPhone]);
  }
  for (const s of seed.staff) {
    await pool.query('insert into staff (id, venue_id, phone_number, full_name, role) values ($1, $2, $3, $4, $5)',
      [s.id, s.venueId, s.phoneNumber, s.fullName, s.role]);
  }
  await pool.end();
}

const backends = [['memory', async () => createMemoryStore(demoSeed(config.demo))]];
if (process.env.TEST_DATABASE_URL) {
  backends.push(['postgres', async () => {
    await seedPostgres(process.env.TEST_DATABASE_URL);
    return createPostgresStore({ url: process.env.TEST_DATABASE_URL });
  }]);
}

for (const [name, makeStore] of backends) {
  describe(`USSD on ${name} store`, () => {
    let server;
    let store;
    let baseUrl;

    beforeEach(async () => {
      outbox.length = 0;
      store = await makeStore();
      server = createApp({ store }).listen(0);
      await new Promise((r) => server.once('listening', r));
      baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterEach(async () => {
      server.close();
      await store.close();
    });

    async function post(phoneNumber, sessionId, text) {
      const body = new URLSearchParams({ sessionId, phoneNumber, networkCode: '99999', serviceCode: '*384*12270#', text });
      const res = await fetch(`${baseUrl}/ussd`, { method: 'POST', body });
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /^text\/plain/);
      const out = await res.text();
      assert.ok(out.length <= 182, `"${text}" produced ${out.length} chars:\n${out}`);
      assert.match(out, /^(CON|END) /);
      return out;
    }

    // One USSD session: every call reuses the same sessionId, like a real phone.
    function session(phoneNumber) {
      const sessionId = `ATUid_${crypto.randomUUID()}`;
      return (text) => post(phoneNumber, sessionId, text);
    }

    // Runs a whole session through each step and returns the last screen.
    async function run(phoneNumber, finalText) {
      const dial = session(phoneNumber);
      const parts = finalText.split('*');
      let out = await dial('');
      for (let i = 1; i <= parts.length; i += 1) out = await dial(parts.slice(0, i).join('*'));
      return out;
    }

    const openShift = (float = 500) => run(MANAGER, `1*${float}*1`);

    test('unknown numbers are refused', async () => {
      assert.equal(await post('+254700999999', 's1', ''), 'END This number is not registered. Ask the owner to add you.');
    });

    test('manager with no shift can only open one', async () => {
      const dial = session(MANAGER);
      assert.equal(await dial(''), 'CON Welcome to Backyard Bar & Motel\nNo open shift.\n1. Open Shift');
      assert.equal(await dial('1'), 'CON Enter opening cash float (0 if none):');
      assert.equal(await dial('1*500'), 'CON Open shift with float KES 500?\n1. Confirm\n2. Cancel');
      assert.equal(await dial('1*500*1'), 'END Shift opened. Float KES 500. Dial again to record sales.');
    });

    test('main menu once a shift is open', async () => {
      await openShift();
      assert.equal(
        await session(MANAGER)(''),
        'CON Welcome to Backyard Bar & Motel\n1. Record Room Cash\n2. Record Bar Tab\n3. Check Shift Liability\n4. Close Shift',
      );
    });

    test('room cash: room, amount, confirm, log, owner SMS', async () => {
      await openShift(500);
      const dial = session(MANAGER);
      await dial('');
      assert.equal(await dial('1'), 'CON Enter Room Number:');
      assert.equal(await dial('1*12'), 'CON Enter Amount Received:');
      assert.equal(await dial('1*12*1500'), 'CON Room 12, cash KES 1,500\n1. Confirm\n2. Cancel');
      assert.equal(await dial('1*12*1500*1'), 'END Cash logged. Room 12 liability is KES 1,500.');
      assert.deepEqual(outbox.at(-1), {
        to: OWNER,
        message: 'Backyard Bar & Motel: Room 12 paid KES 1,500 cash. Logged by Demo Manager. Shift owes KES 2,000.',
      });
    });

    test('bar tab, cancel, and shift liability', async () => {
      await openShift(500);
      assert.equal(await run(MANAGER, '2*800*1'), 'END Bar Tab logged. Liability updated by KES 800.');
      assert.equal(await run(MANAGER, '2*999*2'), 'END Cancelled. Nothing was saved.');
      assert.equal(await run(MANAGER, '3'), 'END Your current shift cash liability is KES 1,300.');
    });

    test('a retried final request does not log twice', async () => {
      await openShift(0);
      const dial = session(MANAGER);
      await dial('');
      await dial('2*700*1');
      await dial('2*700*1');
      assert.equal(await run(MANAGER, '3'), 'END Your current shift cash liability is KES 700.');
    });

    test('a retried open-shift request still gets a sensible answer', async () => {
      const dial = session(MANAGER);
      await dial('');
      await dial('1*500*1');
      assert.equal(await dial('1*500*1'), 'END You already have an open shift. Dial again to record sales.');
    });

    test('close shift shows the variance and alerts the owner', async () => {
      await openShift(500);
      await run(MANAGER, '1*12*1500*1');
      await run(MANAGER, '2*800*1');
      const dial = session(MANAGER);
      await dial('');
      assert.equal(await dial('4'), 'CON Enter cash you are handing over:');
      assert.equal(await dial('4*2500'), 'CON Expected KES 2,800\nHanding over KES 2,500\nShort by KES 300\n1. Confirm\n2. Cancel');
      assert.equal(await dial('4*2500*1'), 'END Shift closed. Short by KES 300. Owner notified.');
      assert.match(outbox.at(-1).message, /Demo Manager closed shift\. Expected KES 2,800, handed over KES 2,500\. SHORT BY KES 300\.$/);
      assert.match(await session(MANAGER)(''), /No open shift/);
    });

    test('housekeeping count above logged rooms alerts the owner', async () => {
      await openShift(0);
      await run(MANAGER, '1*12*1500*1');
      outbox.length = 0;
      const dial = session(CLEANER);
      assert.equal(await dial(''), 'CON Backyard Bar & Motel\n1. Rooms Used Last Night');
      assert.equal(await dial('1'), 'CON How many rooms were used last night?');
      assert.equal(await dial('1*3'), 'CON Rooms used last night: 3\n1. Confirm\n2. Cancel');
      assert.equal(await dial('1*3*1'), 'END Thank you. Report saved.');
      assert.equal(outbox.length, 1);
      assert.match(outbox[0].message, /cleaner reports 3 rooms used, but only 1 room payments/);
    });

    test('housekeeping count that matches sends nothing', async () => {
      await openShift(0);
      await run(MANAGER, '1*12*1500*1');
      outbox.length = 0;
      await run(CLEANER, '1*1*1');
      assert.equal(outbox.length, 0);
    });

    test('owner sees cash held and today\'s takings', async () => {
      assert.equal(await run(OWNER, '1'), 'END No open shifts right now.');
      await openShift(500);
      await run(MANAGER, '1*12*1500*1');
      assert.equal(await session(OWNER)(''), "CON Backyard Bar & Motel (owner)\n1. Cash Held Now\n2. Today's Takings");
      assert.equal(await run(OWNER, '1'), 'END Cash held now:\nDemo Manager: KES 2,000\nTotal: KES 2,000');
      assert.equal(await run(OWNER, '2'), 'END Logged today: KES 1,500\nRoom payments: 1');
    });

    test('bad input is rejected without saving', async () => {
      await openShift(0);
      assert.match(await run(MANAGER, '9'), /^END Invalid choice/);
      assert.match(await run(MANAGER, '2*abc'), /^END Enter digits only/);
      assert.match(await run(MANAGER, '2*0'), /^END Amount must be more than 0/);
      assert.match(await post(MANAGER, 'x1', '2*15*00*1*1'), /^END Invalid input/);
      assert.match(await run(MANAGER, '2*800*7'), /^END Invalid choice\. Nothing was saved/);
      assert.equal(await run(MANAGER, '3'), 'END Your current shift cash liability is KES 0.');
    });
  });
}

test('owner alerts stop when the subscription lapses', () => {
  assert.equal(subscriptionActive({ paidUntil: null }), true);
  assert.equal(subscriptionActive({ paidUntil: '2099-01-01' }), true);
  assert.equal(subscriptionActive({ paidUntil: '2020-01-01' }), false);
});
