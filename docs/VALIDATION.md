# Validation: can Africa's Talking do it, and does the idea hold up?

Researched 2026-10-14. Prices are from Africa's Talking's public pages that day; confirm before you budget.

## Short answer

- **Africa's Talking can do the job.** The protocol in your brief is correct, the sandbox is enough to
  build and demo, and a shared code is affordable for a pilot.
- **The idea is real, but the MVP as specced has one serious hole:** the person who might steal the
  cash is the same person typing it in. A room rented off the books is simply never logged. The ledger
  proves what staff *chose to report*, not what the venue *earned*. Fix that before selling it as
  theft prevention (options below).

## 1. Africa's Talking: confirmed facts

**Protocol.** POST `application/x-www-form-urlencoded` with `sessionId`, `phoneNumber`, `networkCode`,
`serviceCode`, `text`; reply `text/plain` starting `CON ` or `END `; `text` is every input joined by `*`.
All as in your brief.

**Limits that shape the design**

| Limit | Value | Source |
|---|---|---|
| Characters per screen | ~182; overflow is cut silently | [McTaba](https://mctaba.com/learn/african-stack/how-ussd-apps-are-built) |
| Safaricom / Equitel session | 180s total, 30s for the user to answer each screen | [AT help](https://help.africastalking.com/en/articles/1284071-what-is-the-duration-of-a-ussd-session-for-kenyan-telcos) |
| Airtel session | 180s total, **15s for our server to answer**, 60s for the user | same |

So database writes must be fast (aim under 2s). The code gives the final write a 4s budget and
keeps every screen under 182 characters (tested).

**Kenya costs** ([AT USSD pricing](https://africastalking.com/ussd?lang=en),
[dedicated code](https://help.africastalking.com/en/articles/1163556-how-much-is-a-dedicated-ussd-code))

| Item | Cost |
|---|---|
| Shared code setup | Free |
| Shared code monthly, `*384*XXXX#` (Safaricom only) | KES 10,000 (KES 20k–40k for shorter codes) |
| Shared code monthly, `*483*` / `*789*` (Safaricom, Airtel, Telkom) | KES 10,000–40,000 by length |
| Session, prepaid (the person dialling pays) | KES 1 telco + KES 0.25 AT fee; KES 5,000 deposit |
| Session, postpaid (you pay, free to dialler, **Safaricom only**) | KES 1.25–1.50; KES 10,000 deposit |
| Dedicated code (e.g. `*XXX#`) on Safaricom | KES 145,000 setup + KES 70,000/month. Not for the MVP. |

**Two practical consequences**
- `*384*` shared codes are **Safaricom-only**. Any manager on Airtel or Telkom cannot dial it. If your
  pilot staff use other networks, ask AT for a `*483*` or `*789*` code instead.
- Prepaid means the manager pays from their own airtime to log cash against themselves. They won't.
  Plan on **postpaid** (you absorb ~KES 1.50 per entry), which today is Safaricom-only.

**Going live.** AT's public docs do not list the approval steps or documents for Kenya; their help
pages say to email info@africastalking.com, cc ussd@africastalking.com. Expect company KYC.
Safaricom also has a separate [CSP onboarding process](https://www.safaricom.co.ke/images/Downloads/How_To_Become_A_Safaricom_CSP.pdf)
that may apply to a dedicated code later.

**Regulatory (inferred, check with a lawyer).** You will store phone numbers and financial records, so
expect to register with Kenya's Office of the Data Protection Commissioner. Phase 4 lending to venues
would likely need a Central Bank of Kenya digital credit provider licence, or a licensed lending partner.

## 2. Does the business hold up?

**What is strong**
- Real pain: absentee owners of small lodges and bars genuinely can't see shift cash.
- Zero hardware, works on a KES 1,500 feature phone, survives power and internet outages.
- The "cash liability per shift" framing is the best part: it turns logging into a number the manager
  must hand over at the end of the shift, and the owner can check it against the cash box.

**What needs fixing or testing**

1. **Self-reporting hole (biggest).** You need at least one signal the manager doesn't control:
   - *Housekeeping cross-check*: the cleaner logs "rooms cleaned" each morning via USSD. Rooms cleaned
     minus rooms paid is the leakage number. Cheap, independent, and natural for motels.
   - *Instant owner SMS* on every room log ("Room 12, KES 1,500, logged by Jane, 9:42pm"). The owner
     notices silence on a Friday night. Also the cheapest "real-time" feature to build.
   - *Guest receipt by SMS* when the manager enters the guest's number. Weaker (guests may refuse for
     privacy), but it makes skipping the log riskier.
   - **If one person takes the cash *and* cleans**, the cleaner check disappears. Then the signals are
     mystery guests, the owner's own nights as a baseline, neighbouring lodges on the same road,
     owner spot counts and utilities. They catch patterns within weeks, not every room every night.
     See USER_JOURNEYS.md for the full list and how the pitch changes.
2. **"85% cash" needs checking for Kenya specifically.** M-Pesa is everywhere; if a venue takes most
   money by till number, the owner already sees it in the till statement and the pitch weakens. Your
   wedge is venues where cash still dominates (rural lodges, night bar sales). 10 owner interviews
   would settle it.
3. **Bar tabs won't be logged per round.** Three USSD screens per drink on a busy night won't happen.
   Lead with **rooms** (few, high-value, easy to verify) and treat the bar as an end-of-shift total.
4. **Unit economics are fine but thin at first.** KES 100/day ≈ KES 3,000/month per venue. At
   ~20 postpaid entries/day you spend ~KES 30/day on sessions, so ~KES 70/day margin; the KES 10,000
   shared code pays for itself at about 5 venues. Owner SMS alerts add cost on top. Sell weekly or
   monthly bundles; daily M-Pesa payments are friction for both sides.
5. **Credit underwriting (phase 4) needs corroborated data.** Lenders discount self-reported sales.
   Pair the ledger with M-Pesa till data or supplier invoices before pitching it as collateral.

## 3. Next steps

Built on 2026-10-14 (see README): staff by phone number, open/close shift with variance, confirm
screen, owner SMS on every sale, housekeeping cross-check, Postgres/Supabase store.

Still to do (order and reasons in USER_JOURNEYS.md, "What this means for the product"):
1. Staffing at signup (solo vs team), "rooms logged tonight" for owners, owner shifts + weekly pattern SMS.
2. Bar stock count with owner spot counts.
3. A short PIN before logging, in case a phone is shared or borrowed.
4. Voids (correcting a wrong entry) from the manager's menu, with an owner alert.
5. Owner web dashboard reading the same Supabase tables.
6. Billing: M-Pesa STK push and `paid_until` updates.
