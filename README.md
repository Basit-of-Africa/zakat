# Zakat Kit

**A zakat calculator and allowance planner for students — honest about what it is not.**

---

## The problem

Most students assume zakat is not their concern. It is something their father works
out, on wealth they do not have. Then somebody is holding ₦1.4m of saved school fees
in an account for eight months and nobody has mentioned that this might matter.

The reason it stays unexamined is that finding out is awkward. Working out whether
you have reached nisab means knowing what nisab *is*, knowing today's silver price,
knowing which of your things count, and knowing what to subtract. That is four
lookups and some arithmetic, which is just enough friction that the question goes
unasked for another year.

The second half of the problem is the month-to-month one. Students intend to give
sadaqah and intend to save, and both come out of whatever is left at the end of the
month — which is nothing. Giving that is planned last is giving that never happens.

## What it does

- **Zakat on wealth** — enter what you hold and what you owe now, pick the gold or
  silver nisab, enter today's metal price, and see the amount with the full working
  shown. Below the threshold it tells you how far below, which is the thing students
  actually want to know.
- **Zakat al-Fitr** — one sa' (about 2.5kg) per person, priced at your local staple.
- **Monthly plan** — splits an allowance with sadaqah and savings taken out *at the
  same time as fixed costs*, then gives you a daily figure for what is left of the
  month based on what you have already spent.
- **Several accounts at once** — drop in statements from as many banks as you like
  (CSV, OFX, QFX, QIF or JSON), add crypto holdings, and the totals come out per
  account with the working shown. Files are read in the browser and never uploaded.
  It notices the same statement imported twice, and it will not present a month's net
  flow as if it were a balance.
- **Installable** — add it to your home screen and it opens without a connection. The
  arithmetic never needed one.

## What it is not

**This is a calculator, not a ruling.** It does arithmetic on numbers you enter. It
makes no attempt to settle questions scholars differ on, and where they differ it
offers both and names them:

- **Gold or silver nisab** — the silver threshold is usually the lower one, so more
  people owe on it. Which applies to you is not a question a web page can answer.
- **Lunar or solar year** — if you reckon your zakat year on the Gregorian calendar,
  some scholars raise the rate from 2.5% to 2.577% to cover the extra eleven days.
  It is a checkbox, not a default.
- **Zakat al-Fitr in food or money** — the app shows you the measure in kilograms
  *and* its cost, and does not tell you which to give.

Nothing is stored, nothing is sent anywhere, and there is no account. Close the tab
and it is gone.

## Setup

Requires **Node 20+** and **pnpm**.

```bash
git clone https://github.com/bytheitc/zakat.git
```

```bash
cd zakat
```

```bash
pnpm install
```

```bash
pnpm dev
```

Open <http://localhost:3000>. No `.env`, no API key, no database.

### Other commands

```bash
pnpm test
```

```bash
pnpm typecheck
```

```bash
pnpm build
```

```bash
node scripts/make-icons.mjs
```

Redraws the app icons in `public/` from the brand mark. They are committed, so this
only needs running if the mark changes.

## Design decisions

**No price API.** Metal prices, exchange rates and token values are typed in by the
student. Fetching them would make the app need a network and a key, and — worse —
would make a number that must be correct on the day look like it had been handled for
you. Typing it in keeps the responsibility where it belongs, and the app works
offline.

**Statements are parsed on the device.** There is no upload endpoint and there should
never be one. A bank statement is the most revealing document most students own, and
the app that reads it has no business keeping a copy. A PDF is the one format it
refuses, because reading one would mean sending it somewhere to be converted; it asks
for the table to be pasted instead.

**Nothing in a foreign currency is counted until you give it a rate.** A holding with
no rate is left out of the total and said so, loudly, rather than being dropped
quietly or treated as naira. Zakat that comes out too low is the failure that matters
here, so the app would rather be visibly incomplete than quietly wrong.

**An overdraft is a debt, not a negative balance.** Netting it off the assets would
silently reduce the zakat owed, so overdrawn accounts are deducted as debts where the
student can see them.

**Bank connections are off unless configured.** They are the only part of this app
that touches a network, and the only part that cannot be done on the device: open
banking needs a secret key held by a server. With no key configured — the default, and
what you get running this locally — the connector shows itself as unavailable and
points at statement upload, which reaches the same number without a bank login leaving
the device. See `lib/sources/connect/` and `app/api/bank/exchange`.

**It installs, and works with no signal.** A student working out their zakat is often
on a rationed data bundle and campus wifi that comes and goes. The service worker in
`public/sw.js` caches the app shell and never, under any circumstance, caches anything
under `/api` — the only thing there is a bank balance.

**The result always shows its working.** Total assets, debts deducted, net wealth and
the nisab figure are all displayed, so the student can show somebody qualified how the
number was reached rather than just the number.

**No answer until there is a threshold.** With no metal price entered the result panel
says so instead of showing ₦0 due. A zero that means "you have not finished entering
your data" and a zero that means "you owe nothing" must never look alike.

**`immediateDebts`, not `debts`.** Only debts due now are deducted. Naming the field
loosely would invite a student to subtract an entire student loan and wipe out a zakat
they genuinely owe.

**Sadaqah and savings come out of the surplus, not of gross income.** Applying the
percentages to gross would ask a student whose hostel fees eat 90% of their allowance
to save a tenth of money that does not exist.

**Overspending is surfaced, not clamped.** If fixed costs exceed income the app says
so plainly and points at the welfare desk, rather than quietly showing zeroes.

## Contributing

This is one of four projects indexed at **[https://github.com/mssnunilag/oss](https://github.com/mssnunilag/oss)** — the others cover prayer times, Qur'an memorisation, halal food and zakat, and share this one's conventions.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) — it has a section on religious
content that matters more here than in most projects. Drafted starter tasks are in
[ISSUES.md](./ISSUES.md).

Built for Hacktoberfest by [MSSN UNILAG](https://github.com/bytheitc). Not an official MSSN
product, and nothing in it constitutes a religious ruling.

## Licence

[MIT](./LICENSE).
