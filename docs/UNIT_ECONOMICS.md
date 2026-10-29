# Unit economics, pricing and who to sell to

Worked out 2026-10-14. Everything marked *assumed* is a guess to replace with pilot data.

## 1. Is testing free?

Yes. The Africa's Talking sandbox is free ([AT help](https://help.africastalking.com/en/articles/1170660-how-do-i-get-started-on-the-africa-s-talking-sandbox)):
USSD, SMS and payments all work there, but only inside the web **simulator**. No real phones,
no real money. You pay nothing until you buy a live code. So we build and demo everything in the
sandbox, and only pay the KES 10,000/month once a real pilot venue is ready.

## 2. What it costs us

**Fixed, per month**

| Item | KES/month | Note |
|---|---|---|
| Shared USSD code `*384*XXXX#` | 10,000 | [AT pricing](https://africastalking.com/ussd?lang=en); Safaricom only |
| Server hosting | ~1,500 | *assumed* (small Render/Railway/Fly instance) |
| Supabase | 0 → ~3,300 | Free tier for the pilot, Pro (~$25) past ~25 venues |
| **Total** | **~11,500** at the start | one-off deposits: KES 5,000–10,000 with AT |

**Variable, per venue**

| Item | Cost | Note |
|---|---|---|
| USSD session (postpaid, we pay) | ~KES 1.50 each | one session = one full log, however many screens |
| SMS to owner | ~KES 1 each | *assumed*; Kenyan bulk SMS runs KES 0.8–1.5 |
| Collecting payment by M-Pesa Buy Goods | free ≤ KES 500, then 0.55% (max KES 200) | [new rates from Aug 2026](https://businesstoday.co.ke/safaricom-makes-big-cuts-on-m-pesa-merchant-charges-from-this-august/) |

## 3. Different prices for different customers

Yes, and you should. A flat KES 100/day is too much for a 5-room lodge and too little for a
hotel. **Rule of thumb: the fee should be under ~5% of the venue's daily takings.**

| Plan | Who | Price | Includes |
|---|---|---|---|
| **Small** | lodge ≤ 6 rooms, small bar, or any one-person venue | KES 50/day · 1,500/month | room logging, shift close, 1 daily owner SMS |
| **Standard** | 7–20 rooms, bar + lodge | KES 100/day · 3,000/month | + housekeeping cross-check, 3 SMS/day |
| **Plus** | owners who want every sale live | KES 150/day · 4,500/month | + SMS to owner on every room logged |
| **Per site** | 20+ rooms, or 3+ venues | KES 200/day · 6,000/month per site | + web dashboard, several managers |

**Per venue per month** (*assumed* usage: Small 8 sessions & 2 SMS/day, Standard 15 & 3,
Plus 20 & 12, Per site 35 & 5)

| Plan | Revenue | Our cost | Contribution | Margin |
|---|---|---|---|---|
| Small | 1,500 | ~430 | ~1,070 | 71% |
| Standard | 3,000 | ~780 | ~2,220 | 74% |
| Plus | 4,500 | ~1,290 | ~3,220 | 71% |
| Per site | 6,000 | ~1,760 | ~4,240 | 71% |

## 4. When the KES 10,000 code pays for itself

With a mix of 30% Small, 40% Standard, 20% Plus, 10% Per site, the average venue contributes
**~KES 2,280/month**.

| Paying venues | Monthly profit (before sales costs) |
|---|---|
| 5 | ~0 (break-even) |
| 10 | ~KES 11,000 |
| 25 | ~KES 42,000 |
| 50 | ~KES 99,000 |
| 100 | ~KES 208,000 |

**About 5 paying venues cover the code and hosting.** If all of them were Small, you would need ~11.

The real cost is **getting** venues, not serving them. Rural sales mean transport and time.
A field agent paid a commission of one month's fee once the venue pays its *second* month
earns back in about a month and only pays for venues that stick.

**Why an owner would pay (example, *assumed* numbers):** 8 rooms at KES 1,000, half full,
gives KES 4,000/day. At 30% leakage the owner loses KES 1,200/day. Recovering even a third of
that (KES 400/day) is four times the KES 100 fee. Use this exact sum in the sales pitch.

## 5. How they pay you

- **The owner pays, never the manager.** Managers have every reason not to.
- **M-Pesa Buy Goods (Till) with an STK push**: the owner gets a prompt on their phone and
  enters their PIN. Weekly (KES 700) or monthly (KES 3,000) beats daily: fewer missed payments,
  and payments ≤ KES 500 cost us nothing to collect.
- **Monthly upfront discount** (e.g. 3,000 → 2,500) improves cash flow and cuts churn.
- **Diaspora owners** can pay by card or M-Pesa GlobalPay; they are a strong segment (below).
- **If they stop paying:** keep logging working (the data stays useful), but pause owner SMS and
  reports. That makes non-payment hurt the owner, not the ledger.
- **First 14 days free** so the owner sees one or two weeks of numbers before paying.

**Mystery guest add-on:** for example 2 test stays a month for an extra ~KES 3,000, roughly the
room and transport cost plus a margin. Most useful for one-person venues.

**Later revenue (not now):** fees from distributors or lenders for venue data, and Phase 4
stock financing. Both need the data to be trusted first (see VALIDATION.md).

## 6. Who to onboard first

Ranked by how badly they need it and how easy they are to reach:

1. **Highway and truck-stop lodges** (Mai Mahiu, Salgaa, Mlolongo, Voi, Malaba, Busia). Mostly cash,
   run overnight, owners usually live elsewhere. Best first target.
2. **Diaspora- or Nairobi-owned guest houses and rentals run by a caretaker.** The owner is far away,
   already pays someone, and is the most willing to pay for visibility.
3. **Bar + lodge combos in county towns.** Sell the lodge side first; the bar is an end-of-shift total.
4. **Small hotels with a night reception shift.** The night shift handles the cash nobody checks.
5. **Hostels near universities and colleges.** Cash rents, high turnover.
6. **Nightclub VIP tables and event venues.** High value per transaction, but busy staff; a later market.

**Sell in clusters:** several lodges on one road cut travel per sale and switch on the
neighbour benchmark (see USER_JOURNEYS.md).

**How to reach them:** visit 10 lodges on one highway for interviews and a free pilot; go through
lodging or bar owners' associations in a county; work with beer distributors' sales reps, who
visit these venues every week.

## 7. What to measure in the pilot

- Logs per venue per day (does staff actually use it?)
- Room logs compared with the housekeeping "rooms cleaned" count (does it catch leakage?)
- Did the owner pay for month 2? (the only real proof)
- USSD and SMS cost per venue against the assumptions above
