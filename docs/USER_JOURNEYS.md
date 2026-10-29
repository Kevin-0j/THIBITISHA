# User journeys: who it fits, and how to pitch it

Revised 2026-10-14 after the question "what if the person washing is still the manager?".
The names, venues and numbers are illustrative, not research. Check them in the owner interviews
(questions at the end) before you trust them.

## Verdict first

The venue type matters less than **how many independent people touch the money and the rooms**.

| Staffing | Example | Fit | How theft gets caught |
|---|---|---|---|
| **Manager + a separate cleaner** | 10-room lodge, night manager, morning cleaner | **Strong** | Every night: the cleaner's room count vs the rooms logged. Built. |
| **One person does everything** | 5-room lodge, one caretaker who takes cash *and* washes | **Medium** | No nightly proof. Theft becomes *risky* (mystery guests, guest receipts) and *visible as a pattern within weeks* (owner-present nights, neighbouring lodges, utilities). |
| **Owner runs it personally** | owner sleeps on site, takes the cash | **Not a customer yet** | No theft problem to solve. Only useful later for records and credit. |
| **Bar with one barman** | absentee owner, one barman | **Medium–strong** | Stock is physical and carries over shift to shift, so a lie in the count shows up at the next count. Needs the stock-count feature. |
| **20-room hotel with a POS** | reception, housekeeping team, POS | **Weak for now** | They already have a ledger; only the audit add-on fits (housekeeping count vs rooms billed). |

**The honest line for one-person venues:** no tool catches every unlogged room when the only witness
is the person stealing. What we can promise is "you'll know your real numbers within a few weeks, and
skimming becomes risky every single night". That is a smaller promise, so it sits on the Small plan.

---

## Checks the manager doesn't control

These are the building blocks. A venue uses whichever ones its staffing allows.

| Check | Works with one staff? | What it catches | Cost | Status |
|---|---|---|---|---|
| **1. Cleaner count** — a separate cleaner reports rooms used each morning | No | Each unlogged room, every night | Free | Built |
| **2. Mystery guest** — someone the manager doesn't know pays cash for a room; did the owner get the SMS? | **Yes** | Each test is pass/fail. The manager can't know which guest is a test, so every unlogged room is a gamble. | ~KES 1,000–1,500 per test (room + transport) | Works today (uses the owner SMS). It's an operations service, not code. |
| **3. Owner-present baseline** — compare nights the owner runs with nights the manager runs | **Yes** | "When you're here: 7 rooms a night. On his nights: 3." | Free; uses our own data | To build: owner opens a shift when on site, weekly SMS report |
| **4. Neighbour benchmark** — compare with other lodges on the same road, same night | **Yes** | "Lodges on this road averaged 6 rooms on Friday; yours logged 2." | Free once 5+ lodges on one road | To build later; gets stronger as we grow, and competitors can't copy it |
| **5. Owner spot count** — the owner drives past at night, counts cars and lit rooms, and checks "rooms logged tonight" on their phone | **Yes** | Each spot check, live | Free | Half built: owner menu needs a "rooms logged tonight" list |
| **6. Guest SMS receipt + reward** — guest gives a phone number, gets a receipt and points (e.g. 5th night KES 200 off, paid by the owner) | **Yes** | A regular guest notices when no receipt arrives and asks | ~KES 1 per SMS + the reward | To test first: do truckers want it? Many short-stay guests want privacy, so it must stay optional |
| **7. Utilities** — monthly electricity tokens and water vs rooms logged | **Yes** | A slow drift: "Power per logged night up 40% this month" | Free; the owner enters the monthly spend | To build later; lagging, but very hard to fake |

---

## A1. Rural motel, owner away, manager + separate cleaner

**Who:** Mama Wanjiru owns a 10-room lodge on the Mai Mahiu road and lives in Nairobi. Otieno
runs the night desk; Akinyi cleans in the mornings. Rooms go for KES 800–1,200.

**The pain:** "Friday the road is full of lorries, but Otieno says four rooms. On Sunday the laundry
says otherwise. I can't prove anything, so I can't act."

| Step | What happens | What the owner sees |
|---|---|---|
| 1. Pitch | Agent does the sum with her numbers (see script below). | "If 2 rooms a week go unrecorded, that's KES 8,000 a month. We're KES 3,000." |
| 2. Setup (15 min) | Agent registers her, Otieno and Akinyi by phone number. | Nothing to buy; works on basic phones. |
| 3. Every night | Guest pays; Otieno logs room, amount, confirm (~20 seconds). | SMS: "Room 4 paid KES 1,000 cash. Shift owes KES 3,500." |
| 4. Handover | Otieno closes the shift and enters the cash he hands over. | "Expected 6,500, handed over 6,000. SHORT BY 500." |
| 5. After cleaning | Akinyi enters rooms used. Otieno never sees her answer. | "CHECK: cleaner reports 7 rooms used, only 5 payments logged." |
| 6. Day 14 | Agent calls back with the two weeks' numbers next to her old book. | She pays by M-Pesa. |

**Remaining risk:** Otieno and Akinyi collude. Answer: mystery guests and neighbour benchmarks (checks 2
and 4), which neither of them controls.

---

## A2. Rural motel, owner away, one caretaker does everything

**Who:** Mzee Kamau owns a 5-room lodge outside Narok. His nephew Kip takes the money, washes
the sheets and sleeps there. Mzee visits on Sundays and stays the night.

**The pain:** same as A1, but there's no second person whose story he can compare.

| Step | What happens | What the owner sees |
|---|---|---|
| 1. Pitch | Same sum, smaller numbers, **Small plan (KES 50/day)**. Promise "your real numbers in a month", not "catch every room". | |
| 2. Setup | Register Mzee and Kip. Mzee logs his own Sunday nights too (that's the baseline). | |
| 3. Every night | Kip logs rooms as in A1. | SMS per room (if on the per-sale plan). |
| 4. Random nights | A mystery guest takes a room and pays cash. Kip can't tell which guest it is. | Either the SMS arrives (pass) or it doesn't (caught, with a date and a room). |
| 5. Weekly SMS | We compare his nights with Kip's, and with lodges nearby once we have them. | "This week: Sunday (you) 4 rooms. Other nights avg 1.5. Lodges near you avg 3.2." |
| 6. Any night | Mzee drives past, sees 4 cars, dials the code. | "Rooms logged tonight: 2 (rooms 1, 3)." He calls Kip on the spot. |
| 7. Month 1 | Owner and agent review the pattern. | Pays, or we learn the pitch doesn't land for solo lodges. |

**User stories**

| Story | Makes sense? |
|---|---|
| As the owner of a one-person lodge, I want my own nights compared with my caretaker's, so a gap shows up without a second employee. | Yes. Free, and it uses data we already collect. |
| As the owner, I want to see tonight's logged rooms when I drive past, so my spot check takes 30 seconds. | Yes. Small addition to the owner menu. |
| As the owner, I want occasional mystery guests, so my caretaker knows any guest could be a check. | Yes, as a paid add-on or with the owner's own friends. The deterrent works even if tests are rare, as long as the caretaker knows they happen. |
| As a regular guest, I want an SMS receipt that earns me a discount. | Unproven. Ask truckers in the interviews before building. |
| As the owner, I want every unlogged room caught the same night. | **No. Not possible with one person.** Don't promise it. |

**Feasibility: medium.** Mystery guests work today. The baseline report and "rooms tonight" are small
builds. The neighbour benchmark needs several lodges on the same road, so **sell in clusters**:
5 lodges on one highway beats 5 lodges in 5 towns.

---

## B. Rural bar, no POS (one barman or several)

**Who:** Baba Kioko owns a bar near Machakos. On weekends and while he's at his shamba, the
barman Musyoka runs it alone.

**The pain:** "I bought 20 crates Monday. By Saturday they're gone and the box says 15 crates.
Musyoka says some broke, some were credit for regulars."

**Why one barman is less of a problem than one motel caretaker:** a room leaves no trace once the
sheets are washed. Bottles do leave a trace. Stock carries over from shift to shift, and deliveries
come with the distributor's invoice. If Musyoka claims there's more stock left than there really is,
that phantom stock is still "there" on paper at the next count. Baba Kioko can count three products
on any visit and the lie shows up.

| Step | What happens | What the owner sees |
|---|---|---|
| 1. Setup | Agent records the 5–8 products that make most sales, with prices. | |
| 2. Delivery | Musyoka logs deliveries; owner can check against the distributor's invoice. | SMS: "Delivery: Tusker 5 crates." |
| 3. Shift close | Musyoka counts what's left of each product (~8 short screens, once a night), then enters cash handed over. | "Expected KES 14,200 from stock sold, handed over 12,900. SHORT 1,300." |
| 4. Credit | Credit to regulars is logged with a name and amount. | Credit can't quietly hide a shortage. |
| 5. Owner visit | Owner counts 2–3 products and enters them. | "Tusker: count says 31, system says 40. 9 bottles missing." |

**User stories**

| Story | Makes sense? |
|---|---|
| As a barman, I log every drink sold. | **No.** Too slow on a busy night. Dropped. |
| As a bar owner, I want expected cash worked out from stock, so I know what should be in the box. | Yes. This is the bar product. |
| As a bar owner, I want to spot-count a few products when I visit, so a lying count shows up. | Yes. This is what makes it work with one barman. |
| As a bar owner, I want credit logged by name, so "credit" can't hide theft. | Yes. |

**Feasibility: medium.** Needs new flows (products, deliveries, closing count, credit, owner spot count).
Not built yet.

---

## C. 20-room hotel with a POS

**Who:** a family hotel in Kisumu with 20 rooms, a restaurant and a bar, a POS at reception and a
housekeeping team. Several staff means the one-person problem doesn't apply here.

**Where money leaks** (outside the POS they trust): cash walk-ins never entered, rooms marked
"complimentary" or "out of order" that were let, and sales lost while the system is down.

| Step | What happens | What the owner sees |
|---|---|---|
| Every morning | Housekeeping supervisor enters rooms used (built). Night manager enters rooms the POS billed (one screen). | "Housekeeping 17, POS billed 14. CHECK." |
| Power cuts | Reception logs by USSD while the POS is down. | Nothing goes unrecorded during outages. |

Double entry ("reception logs every booking in USSD too") doesn't make sense and is dropped.
**Feasibility: medium for the audit add-on, low for the core product.** A later upsell.

---

## What this means for the product

Build order, pending the interviews:

1. **Ask staffing at signup** (solo or team). Solo venues get no cleaner menu, get the Small plan,
   and get the weekly pattern SMS.
2. **"Rooms logged tonight"** in the owner menu, for spot checks.
3. **Owner shifts + weekly pattern SMS**: the owner's own nights become the baseline.
4. **Mystery guest service**: operations, not code. Price it as an add-on (e.g. 2 visits a month).
5. **Bar stock count** with owner spot count.
6. **Neighbour benchmark**, once 5+ lodges are live on one road.
7. **Guest receipt + reward**, only if truckers say they want it.

**Go-to-market change:** sell in **clusters along one road**. It makes field sales cheaper and turns
on the neighbour benchmark, which is the one check no competitor can copy.

---

## How to approach an owner

1. **Ask before you pitch.** "How do you know how many rooms were taken last night?" and
   **"Who cleans the rooms? Is it the same person who takes the money?"** The second answer tells
   you which journey (A1 or A2) to pitch.
2. **Do the sum with their numbers.** Rooms × price × occupancy, then "If even 2 rooms a week go
   unrecorded, that's KES 8,000 a month."
3. **Show, don't explain.** Log a fake room on your phone; their phone gets the SMS while you stand there.
4. **Answer the staff question.** "Your manager is protected too: every handover is on record."
5. **Promise only what the staffing allows.** Team: "you'll see the gap every morning".
   Solo: "you'll see your real numbers within a month, and any guest could be our check".
6. **Ask for 14 days free (a month for solo venues) and book the follow-up on the spot.**

## Owner interviews: what to ask

1. How many rooms (or crates a week), and how do you know what was sold yesterday?
2. Do you live at the venue? How often are you there, and do you stay overnight?
3. **How many staff? Who takes the cash, and who cleans? Same person?**
4. Who handles cash at night, and how is it handed over?
5. Ever suspected you were losing money? How did you find out? What did you do?
6. What share is cash vs M-Pesa?
7. What phones do your staff use?
8. Have you tried a POS, an app or a book? What happened?
9. Would you pay KES 50–100 a day to get an SMS for every room paid? Why or why not?
10. Would you pay extra for someone to test your lodge as a guest now and then?
11. *(Ask a few truck drivers too)* Would you give your number for a receipt if every 5th night was cheaper?
12. Who else owns a lodge or bar on this road?

**Count it as validated when** at least 6 of 10 absentee owners say yes to question 9 and at least
3 agree to a pilot. **Also record how many are solo-staffed.** If most are, the Small plan and the
pattern checks become the main product, not an edge case.
