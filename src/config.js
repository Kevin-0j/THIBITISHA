require('dotenv').config();

// Every brand-, venue- and vendor-specific setting comes from here, so a rename is a one-line .env change.
const config = {
  port: Number(process.env.PORT) || 3000,
  brandName: process.env.BRAND_NAME || 'Thibitisha',

  ussd: {
    // Safe per-screen length on most handsets; longer text is cut off silently.
    maxScreenChars: 182,
    // Airtel KE drops the session if the app takes more than 15s; Safaricom users get 30s per screen.
    // We stay well under both: writes get 4s, the whole request 5s.
    writeBudgetMs: 4000,
    requestBudgetMs: 5000,
    maxAmount: 1000000,
  },

  // Supabase Postgres connection string (Project Settings > Database > Connection string, "Transaction pooler").
  // Empty = run on the built-in in-memory demo store, which is all the sandbox simulator needs.
  database: {
    url: process.env.DATABASE_URL || '',
    // Path to Supabase's CA certificate (Project Settings > Database > SSL). With it, the server's
    // certificate is verified; without it, the connection is still encrypted but not verified.
    caCertPath: process.env.DATABASE_CA_CERT || '',
  },

  // Africa's Talking SMS. Empty API key = messages are only printed to the console.
  sms: {
    username: process.env.AT_USERNAME || 'sandbox',
    apiKey: process.env.AT_API_KEY || '',
    senderId: process.env.AT_SENDER_ID || '',
  },

  // Payer confirmations: how long a payer's confirmation waits for a matching staff log before
  // the owner is told nothing was logged, and how often that check runs.
  payer: {
    matchWindowMinutes: Number(process.env.MATCH_WINDOW_MINUTES) || 24 * 60,
    sweepIntervalMs: 60 * 1000,
  },

  // Seed data for the in-memory store. Type these numbers into the sandbox simulator.
  demo: {
    venueName: process.env.DEMO_VENUE_NAME || 'Backyard Bar & Motel',
    venuePlan: process.env.DEMO_VENUE_PLAN || 'plus',
    managerPhone: process.env.DEMO_MANAGER_PHONE || '+254711000001',
    housekeeperPhone: process.env.DEMO_HOUSEKEEPER_PHONE || '+254711000002',
    ownerPhone: process.env.DEMO_OWNER_PHONE || '+254711000003',
    // Payers dial in and enter this code to say which place they paid.
    venueCode: process.env.DEMO_VENUE_CODE || '4471',
    // 'lodge' (rooms, manager, airtime reward) or 'rent' (units, caretaker, no reward).
    template: process.env.DEMO_TEMPLATE || 'lodge',
    // Airtime sent to a payer when their confirmation matches. Empty = 10 for lodges, 0 for rent.
    rewardKes: process.env.DEMO_REWARD_KES,
  },
};

module.exports = config;
