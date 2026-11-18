# Contributing to Zakat Kit

Thanks for being here.

## Before anything else

```bash
pnpm install
pnpm test
```

You should never need an API key, a `.env` file, a database, or access to anything
belonging to MSSN UNILAG.

## Read this first: religious content

This project calculates something people are obliged to get right, which puts a
constraint on it that most side projects do not have.

**Where scholars differ, add an option — never a default.** The gold-versus-silver
nisab, the lunar-versus-solar rate, food versus money for Zakat al-Fitr: each is
presented as a choice with the position named. A pull request that resolves one of
these in code, however well-sourced, will be asked to make it configurable instead.

**Never present the output as a ruling.** The app says it is a calculator in its
first paragraph and shows its working underneath every result. Please keep both.
Wording that implies the app has decided something for the user — "you must pay",
"your zakat is" — is worth changing even where the arithmetic is right.

**Name the judgement calls.** `ZAKAT_RATE`, `SAA_KILOGRAMS`,
`RELEARN_LAPSE_THRESHOLD`-style constants exist so that a reader can see what is a
fixed value and what is a decision somebody made. Do not inline them.

**If you are unsure, open an issue rather than a pull request.** Nobody will think
less of you for asking.

## House style

**Comments explain why, not what.** The comment above `netWealth` in
[`lib/zakat.ts`](./lib/zakat.ts) explains why the field is called `immediateDebts` and
what goes wrong if a student subtracts a whole student loan. Write that kind.

**TypeScript, strict. No `any`.**

**Pure functions in `lib/`.** Everything there is a pure function over plain numbers,
which is why it can be tested without a browser. React state lives in `app/` and
`components/`.

**No network calls, with one named exception.** Not for prices, not for exchange
rates, not for token values — all of those are typed in by the student. Statements are
parsed in the browser and never uploaded; there is no endpoint that accepts one and
there should never be one.

The exception is `lib/sources/connect/`, which holds the bank and wallet connectors,
and `app/api/bank/exchange`, the single server route they need. Open banking cannot be
done on the device: it works by an aggregator holding a secret key, and a secret key
in a browser is not a secret. So those connectors are off unless somebody deploying
this app configures them, every one of them states in `networkNote` exactly what
leaves the device, and that sentence is shown to the student before they connect.

If you are adding anything that touches a network, it belongs in that folder, behind
that interface, with that note — or it does not belong here at all.

## Tests

Anything in `lib/` needs a test, and the arithmetic ones should read as statements
about money: `"returns exactly zero below nisab, not a small number"`. Edge cases
worth covering in anything you add: exactly at the threshold, negative net wealth, and
zero.

Statement parsing has its own edge cases, and they are the ones that produce a
confident wrong number rather than an obvious one: `1,234` against `12.345,67`,
`03/04/2025` against `04/03/2025`, an export ordered newest-first, a file with
transactions but no balance. There are fixtures for each in
`lib/sources/statement/`; add one when you add a bank.

`lib/sw.test.ts` loads `public/sw.js` into a sandbox with a fake cache and a fake
network. It exists for one rule — the bank response is never written to a cache — and
that rule cannot be checked by reading the file, so do not delete the test when you
change the worker.

```bash
pnpm test
pnpm test:watch
```

## Accessibility

Every input needs a real label. The `Field` component wires `htmlFor` and
`aria-describedby` explicitly — there is a comment in it explaining the screen-reader
bug that caused, which was found by actually checking rather than by reading the code.
Please check your own additions the same way.

## Pull requests

- One topic per pull request.
- Say what problem it solves.
- Run `pnpm test` and `pnpm typecheck` before pushing.
- Screenshots for anything visual.
