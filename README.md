# Thibitisha

**Let the person who paid tell the owner.**

Thibitisha ("confirm" in Swahili) is a USSD service, built on Africa's Talking, for businesses whose owners are not on site. The person who paid confirms the payment from any phone. We match that confirmation against what the caretaker or manager logged. A match sends the payer an SMS receipt. A mismatch alerts the owner the same day.

Built for the Africa's Talking Open & WIT Hackathon, Nairobi, 29 October 2026.

---

## Contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [How it works](#how-it-works)
- [Who it is for](#who-it-is-for)
- [Why we believe it works](#why-we-believe-it-works)
- [Africa's Talking APIs used](#africas-talking-apis-used)
- [Project status](#project-status)
- [Run it locally](#run-it-locally)
- [Connect the Africa's Talking sandbox](#connect-the-africas-talking-sandbox)
- [Configuration](#configuration)
- [Database](#database)
- [Architecture](#architecture)
- [Engineering decisions](#engineering-decisions)
- [Business model](#business-model)
- [Marketplace listing](#marketplace-listing)
- [Roadmap](#roadmap)
- [Documents](#documents)

---

## The problem

Across Kenya, owners who are not on site depend on someone else to collect their money:

- diaspora landlords rely on a caretaker;
- lodge owners rely on a night manager;
- chamas rely on a treasurer;
- dairy cooperatives rely on a collection clerk.

M-Pesa shows an owner every shilling that reaches their own till. It shows nothing about cash, or about payments sent to a staff member's personal number. That is where money goes missing.

Every existing fix asks the person holding the money to record it:

| What owners try | Why it fails |
|---|---|
| "Pay everything to my till" | Payers prefer cash or the person they deal with; staff need cash for float and repairs; rural places run on cash. |
| A POS or logbook for staff | It records only what staff choose to enter. |
| Cameras and GPS trackers | They cost money, need data, and get switched off. |
| Receipt apps | They need a smartphone. Kenya still has 27.4 million feature-phone devices (Communications Authority, June 2026). |

Three people lose. The owner loses money they cannot see. The payer cannot prove they paid. And an honest collector has no way to prove their honesty.

## The solution

Every payment has two people in it. Until now, only the staff member has been asked what happened. Thibitisha asks the other one: the payer.

- The **payer** (a tenant, guest or chama member) dials a USSD code and confirms the place, the amount and, optionally, the M-Pesa code. It takes under a minute on any phone, with no data and no app.
- The **staff member** logs payments in the USSD staff menu, as they do today.
- The **system** matches the two records.
- If they **match**, the payer gets an SMS receipt. Lodge guests also get a small airtime reward, because they have no other reason to bother.
- If they **don't match**, the owner gets an instant SMS alert with the payer's number.
- The **owner** can dial in at any time to see confirmed payments, unmatched claims and money at risk.

This also protects honest staff. A caretaker whose every month shows "all matched" can finally prove it. We sell receipts for everyone, not suspicion.

## How it works

```
  Payer (tenant, guest, member)            Staff (caretaker, manager)
  dials USSD, confirms payment             logs the payment over USSD
              \                                   /
               v                                 v
         +---------------------------------------------+
         |  Matcher: same place + same amount within   |
         |  24 hours, or the same M-Pesa code          |
         +---------------------------------------------+
               /                                 \
              v                                   v
     MATCH                                  MISMATCH
     SMS receipt to the payer               SMS alert to the owner,
     (+ airtime reward for lodges)          with the payer's number
```

What the payer sees (each screen stays under the 182-character USSD limit):

```
CON Thibitisha                 CON Enter the place code       CON Amount paid (KES):
1. Confirm a payment               (on the notice board,
2. My receipts                     or ask the caretaker):

CON M-Pesa code, or 0          CON Confirm KES 8,000 to       END Thank you. We will SMS
if you paid cash:                  Mwangaza Apts?                 your receipt once the
                                   Your number will be            caretaker's record
                                   shared with the owner.         matches.
                                   1. Yes  2. Cancel
```

What the owner receives on a mismatch:

```
Alert: tenant 0712***345 (B4) says they paid KES 8,000 on 28 Oct.
Caretaker logged KES 6,000.
```

## Who it is for

One engine with different templates. Only the wording, the reward setting and who counts as "staff" change.

| Order | Template | Does the payer want a receipt? | Reward needed? |
|---|---|---|---|
| 1 | Rent collected by caretakers | Yes, to protect themselves in disputes | No |
| 2 | Chama contributions | Yes, members distrust treasurers | No |
| 3 | Milk collection centres | Yes, farmers dispute litres and pay-outs | No |
| 4 | Lodges and bars | No | Yes, KES 5-10 airtime |

We start where payers already want a receipt, so we do not have to pay them to take part.

## Why we believe it works

Governments already use customers to check businesses for tax:

- **Brazil, Nota Fiscal Paulista (from 2007).** Customers got rebates for asking for receipts and could check them online. Reported retail revenue rose by at least 21% over four years. After a shop's first customer complaint, it reported 7% more receipts. (J. Naritomi, *Consumers as Tax Auditors*, American Economic Review, 2019.)
- **Rwanda, receipt lottery (2015) and its 2026 successor.** Big prizes, rare draws and SMS entry with three codes failed: only 4% of receipts were submitted. People said they wanted small, frequent, certain rewards. (IGC and J-PAL research, 2018 and 2021.)
- **Kenya, KRA "Jinice na Risiti Legit" (2024).** The same idea, but available only through a smartphone app, for seven weeks.

We took three design rules from this evidence:

1. One short USSD session, with no codes to remember except the place code.
2. Any reward is small and certain, and paid on every match, never as a lottery. That also keeps us clear of gambling rules.
3. Start with payers who already want a receipt.

## Africa's Talking APIs used

| API | Used for | Status |
|---|---|---|
| USSD | Payer confirmation, staff logging and owner menus | Staff and owner menus built; payer menu in progress |
| SMS | Payer receipts, owner mismatch alerts, daily summaries | Owner alerts built; receipts in progress |
| Airtime | Rewards to lodge guests on a matched confirmation | In progress |
| Voice | Call-back to the payer when a claim is disputed | Planned; needs a production account, because the sandbox does not support Voice |

## Project status

This repository started from a tested USSD engine we built on 14 October 2026 for a lodge "Shadow POS". In that product staff log sales and the owner gets alerts. Thibitisha reuses that engine and adds the payer side.

**Built and tested**

- USSD router. It reads Africa's Talking requests, walks the menus, adds a confirm screen before every save, keeps screens under 182 characters, and answers within carrier time limits.
- Role menus chosen by the caller's phone number (manager, housekeeper, owner). Unknown numbers are refused.
- Staff logging: open and close shifts, room cash and bar tabs, with the shortage or overage shown at close.
- Owner SMS alerts through the Africa's Talking sandbox or live API, and owner menus showing cash held and today's takings.
- A housekeeping cross-check: the cleaner's room count is compared against the rooms logged.
- A PostgreSQL / Supabase schema with append-only payments and row-level security, plus an in-memory store for demos.
- 13 automated tests on the in-memory store, and 25 when run against PostgreSQL.

**In progress (hackathon day)**

- [ ] Payer tables and store functions (places, payers, claims, matches)
- [ ] Payer USSD flow: place code, amount, M-Pesa code, consent, confirm
- [ ] Matcher, SMS receipt on match, owner alert on mismatch
- [ ] Airtime reward on match (lodge template)
- [ ] Owner menu: confirmed, unmatched, money at risk; rent and lodge wording
- [ ] Dockerfile and Africa's Talking Marketplace listing
- [ ] Stretch: the owner texts "nani hajalipa?" ("who hasn't paid?") and gets an AI answer drawn only from the ledger

## Run it locally

You need Node.js 18 or newer. No accounts are needed to start.

```bash
git clone https://github.com/Kevin-0j/THIBITISHA.git
cd THIBITISHA
npm install
cp .env.example .env
npm test     # runs the automated tests on the in-memory store
npm start    # serves POST http://localhost:3000/ussd and prints the demo phone numbers
```

If you skip `npm install`, the tests fail with `Cannot find module 'pg'`.

With `DATABASE_URL` empty, the app runs on an in-memory demo venue, which is lost on restart. Use these numbers in the simulator:

| Phone number | Role |
|---|---|
| +254711000001 | Manager |
| +254711000002 | Housekeeper |
| +254711000003 | Owner |

To try a request without the simulator:

```bash
curl -s -X POST http://localhost:3000/ussd \
  -d "sessionId=test1" -d "serviceCode=*384*12270#" \
  --data-urlencode "phoneNumber=+254711000003" -d "text="
```

## Connect the Africa's Talking sandbox

The sandbox is free and runs in Africa's Talking's web simulator.

1. Install ngrok from https://ngrok.com/download and add your auth token: `ngrok config add-authtoken <token>`.
2. With `npm start` running, open a second terminal and run `ngrok http 3000`. Copy the `https://...ngrok-free.app` URL.
3. In the Africa's Talking sandbox dashboard, open USSD and set your service code's callback URL to `https://<your-ngrok-url>/ussd`. Note the `/ussd` at the end.
4. Open the simulator, enter one of the demo numbers above and dial the service code.
5. Optional: to see SMS in the simulator, put your sandbox API key in `AT_API_KEY` and keep `AT_USERNAME=sandbox`. Without a key, SMS are printed to the console instead.

The free ngrok URL changes each time ngrok restarts. You can claim a free static domain in the ngrok dashboard and run `ngrok http --url=<domain> 3000` to keep the same one.

## Configuration

All settings come from environment variables; see `.env.example`. Never commit `.env`.

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `BRAND_NAME` | Product name shown on screens and in SMS. This is the only place the name lives. | `Shadow POS` in code; `Thibitisha` in `.env.example` |
| `DATABASE_URL` | PostgreSQL connection string (for Supabase, use the transaction pooler). Leave empty to use the in-memory store. | empty |
| `DATABASE_CA_CERT` | Optional path to the database CA certificate | empty |
| `AT_USERNAME` | Africa's Talking username | `sandbox` |
| `AT_API_KEY` | Africa's Talking API key. Leave empty to print SMS to the console. | empty |
| `AT_SENDER_ID` | Optional SMS sender ID | empty |
| `DEMO_*` | Demo venue name, plan and phone numbers for the in-memory store | see `.env.example` |

## Database

1. Create a Supabase project. The free tier is enough for a pilot.
2. In the SQL editor, run `db/schema.sql`, then `db/seed.sql`. Edit the seed's phone numbers first.
3. Put the transaction pooler connection string in `DATABASE_URL` and restart. The startup line should say `(postgres store)`.

To run the tests against PostgreSQL as well (the test database is wiped):

```bash
TEST_DATABASE_URL=postgres://... npm test
```

## Architecture

```
index.js                     starts the server and picks the store
src/config.js                every brand, vendor and limit setting
src/app.js                   Express app: POST /ussd, always answers 200 text/plain
src/ussd/router.js           splits the USSD text on "*", walks the flow, adds the confirm step
src/ussd/menus.js            which flows each role sees, in menu order
src/ussd/flows/*.js          one file per menu item: prompts, validation, confirm, final message
src/ussd/validators.js       amount, cash, room count and room number parsing
src/ussd/response.js         CON/END helpers, 182-character check, KES formatting
src/services/store/          memory.js (demo) and postgres.js (Supabase), one shared interface
src/services/sms.js          Africa's Talking SMS (sandbox or live)
src/services/notify.js       owner alerts, plan and subscription rules
db/schema.sql, db/seed.sql   schema and demo data
test/ussd.test.js            simulated Africa's Talking sessions
docs/                        research, unit economics, user journeys, team briefing
```

To add a menu item, write a flow file in `src/ussd/flows/` and add it to the right list in `src/ussd/menus.js`.

## Engineering decisions

- **Stateless USSD.** Africa's Talking resends the whole input path (`1*4471*8000`) on every request, so the router rebuilds the state from the text each time. The only thing kept between requests is a short-lived note of which shift a session is working on.
- **Carrier limits respected.** Each screen is at most 182 characters, and every test response is checked against that limit. Airtel drops a session if the app takes longer than 15 seconds, so writes get 4 seconds and the whole request gets 5. SMS sends are never awaited.
- **Idempotent writes.** A retried final request carries the same `sessionId`. Writes are keyed on it, and the key is UNIQUE in PostgreSQL, so a retry never double-counts.
- **Stable menus.** The menu is pinned per session, so option numbers cannot change halfway through a session.
- **Append-only money records.** A database trigger blocks updates and deletes on payment rows, so history cannot be rewritten.
- **Confirm before save.** Keypad typos are common, so every write shows `1. Confirm 2. Cancel` first.
- **Privacy by design.** Payers consent on screen before their number is shared with the owner. We store only the phone number, amount and time.

## Business model

| | Rent | Lodges |
|---|---|---|
| Who pays | The landlord | The owner |
| Price | KES 50 per unit per month (a 20-flat block pays KES 1,000) | KES 50-200 a day, with airtime passed through at cost |
| Our cost per confirmation | About KES 2.50 (USSD session plus SMS) | About KES 12.50 (including KES 10 airtime) |
| Break-even | About 250 units covers the KES 10,000/month shared USSD code and hosting | About 5 paying venues |

These prices are assumptions to test in the pilot. See `docs/UNIT_ECONOMICS.md`.

Our long-term goal is a trusted record of payments that both sides have confirmed. Startups that last in African markets tend to own a record of money moving every day. A tenant's confirmed rent history could later support a rent reference or access to credit.

## Marketplace listing

| Field | Value |
|---|---|
| Name / slug | Thibitisha / `thibitisha-payer-receipts` |
| Short description | Let the people who pay you confirm what they paid, over USSD. Catch missing cash without relying on staff entries. |
| AT products | USSD, SMS, Airtime |
| Industries | Real estate, Hospitality, Financial services, Agriculture |
| Database | PostgreSQL, one per instance, so each customer's data is isolated |
| Pricing | Starter KES 1,500/month (up to 30 units or rooms); Standard KES 3,500/month (up to 100); airtime rewards billed at cost |

## Roadmap

1. **Hackathon (29 Oct 2026):** the payer flow, the matcher, receipts, rewards, the owner view and the Marketplace listing.
2. **Customer interviews:** 10 landlords and 5 lodge owners, before writing more code.
3. **Four-week pilot:** 2 landlords and 2 lodges. We stop or change course if fewer than 30% of tenants confirm after two reminders, or if fewer than 2 of the 4 owners pay for month two.
4. **Legal checks:**
   - whether airtime rewards fall under the Gambling Control Act 2025;
   - whether we must register with Kenya's Office of the Data Protection Commissioner (ODPC).
5. **Go live:** buy a shared USSD code once the pilot is ready.
6. **Later:** Voice call-backs for disputed claims, a web dashboard for owners, and rent references built on confirmed payment history.

## Documents

- [`docs/Thibitisha-Team-Briefing.pdf`](docs/Thibitisha-Team-Briefing.pdf): the story, the problem, the solution and the build status. Start here.
- [`docs/Hackathon-What-To-Build-2026-10-29.pdf`](docs/Hackathon-What-To-Build-2026-10-29.pdf): the research behind the choice, including funding trends, YC, the scored ideas and sources.
- [`docs/VALIDATION.md`](docs/VALIDATION.md): Africa's Talking limits and costs, and the main risks.
- [`docs/UNIT_ECONOMICS.md`](docs/UNIT_ECONOMICS.md): pricing, break-even and who to sell to.
- [`docs/USER_JOURNEYS.md`](docs/USER_JOURNEYS.md): user journeys for the lodge version.

## Team

Built by Kevin Omondi ([@Kevin-0j](https://github.com/Kevin-0j)) and team.
