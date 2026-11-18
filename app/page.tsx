import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  HandCoins,
  Home,
  Landmark,
  LockKeyhole,
  ReceiptText,
  Scale,
  Server,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ResultPreview } from "@/components/site/ResultPreview";
import { Ankara } from "@/components/Ankara";
import { NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS } from "@/lib/zakat";
import { RESEARCH } from "@/lib/research";

/**
 * The front door. Every claim here is something the app does today, and every
 * figure says where it comes from and how sure anyone is of it.
 */
export default function Landing() {
  return (
    <>
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[var(--color-brand)] text-white">
          <Ankara className="absolute inset-0 h-full w-full opacity-90" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
            <div className="rise rounded-md bg-[var(--color-brand)] p-6 shadow-[10px_10px_0_var(--color-yellow)] sm:p-9">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-[#f2dcf5]">
                <LockKeyhole className="size-4" /> Your figures never leave your device
              </p>
              <h1 className="mt-4 text-balance text-[2.75rem] font-extrabold leading-[1] tracking-tight sm:text-6xl">
                Zakat, <span className="text-[var(--color-yellow)]">sorted.</span> In your currency.
              </h1>
              <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-[#f2dcf5]">
                Built for how people really hold money: two banks, mobile money, a little gold, a small business, savings in another currency. Zakat Kit works out what is due, in your currency, and shows every step.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/calculate" className="btn btn-primary px-6 text-base">
                  Calculate my zakat <ArrowRight className="size-4" />
                </Link>
                <Link href="/learn" className="btn border-2 border-white/80 px-6 text-base text-white hover:bg-white/10">
                  How it&apos;s worked out
                </Link>
              </div>
            </div>
            <div className="rise" style={{ "--rise": "160ms" } as React.CSSProperties}>
              <ResultPreview />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-[var(--color-wash)] py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Head eyebrow="How it works" title="Three steps, with the working shown at every one." />
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              <Step n={1} icon={<FileSpreadsheet />} title="Add what you hold">
                Drop in bank statements (CSV, OFX, QFX, QIF or JSON) or type the figures. Each account keeps its own line, so you can check every one.
              </Step>
              <Step n={2} icon={<Scale />} title="Set the threshold">
                Choose the gold or silver nisab ({NISAB_GOLD_GRAMS}g or {NISAB_SILVER_GRAMS}g) and enter today&apos;s price. Which to use is a question for your scholar; both are offered.
              </Step>
              <Step n={3} icon={<ReceiptText />} title="See what is due">
                If your net wealth is above nisab, zakat is 2.5% of it. You see the total, each account, the threshold and how far above or below it you are.
              </Step>
            </ol>
          </div>
        </section>

        {/* What counts */}
        <section id="counts" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Head eyebrow="What counts" title="What goes into the calculation." body="The common view, set out plainly. Where scholars differ, the calculator gives you the options instead of choosing for you." />
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              <List tone="brand" title="Counted" items={[
                [<Landmark key="a" />, "Cash and bank balances", "Current accounts, mobile money, cash at home"],
                [<Banknote key="b" />, "Savings", "Including money put aside for fees or plans"],
                [<Coins key="c" />, "Gold and silver", "At what it would sell for today"],
                [<HandCoins key="d" />, "Money owed to you", "Only what you genuinely expect back"],
                [<Briefcase key="e" />, "Stock for resale", "If you run a business, at today's selling value"],
                [<Wallet key="f" />, "Crypto", "Add a wallet address or the amounts held"],
              ]} />
              <List tone="gold" title="Taken away" items={[
                [<ReceiptText key="a" />, "Debts due now", "Bills and repayments due, not the whole of a long-term loan"],
              ]} note="Subtracting an entire mortgage or student loan would wipe out zakat that is owed, so only what is due now comes off." />
              <List tone="muted" title="Not counted" items={[
                [<Home key="a" />, "Your home", "The house you live in"],
                [<Building2 key="b" />, "Things you use", "Your car, furniture, clothes, phone and tools of your trade"],
              ]} note="Wealth must also have been held for a full lunar year (the hawl). The app works out the amount; whether the year has passed is for you to know." />
            </div>
          </div>
        </section>

        {/* Who it is for: 9:60 */}
        <section className="border-y border-[var(--color-rule)] bg-[var(--color-wash)] py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Head eyebrow="Who zakat is for" title="Eight kinds of people, named in the Qur'an." body="At-Tawbah 9:60 sets out who may receive zakat. Paying it to anyone else is not zakat." />
            <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["The poor", "al-fuqarā'"],
                ["The needy", "al-masākīn"],
                ["Those who administer it", "al-'āmilīna 'alayhā"],
                ["Those whose hearts are to be reconciled", "al-mu'allafati qulūbuhum"],
                ["To free those in bondage", "fi'r-riqāb"],
                ["Those in debt", "al-ghārimīn"],
                ["In the cause of Allah", "fī sabīli'llāh"],
                ["The stranded traveller", "ibni's-sabīl"],
              ].map(([en, tr], i) => (
                <li key={en} className="card p-4">
                  <span className="font-mono-nums text-xs text-[var(--color-ink-faint)]">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-1 font-semibold">{en}</p>
                  <p className="text-sm italic text-[var(--color-ink-soft)]">{tr}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Research */}
        <section id="sources" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Head eyebrow="Why it matters" title="Zakat is one of the largest flows of giving in the world." body="Nobody knows the exact size. Formal collection runs to at least tens of billions of US dollars a year; estimates of the total range from about $76 billion to several hundred billion, and the highest figures rest on weak sources." />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {RESEARCH.map((r) => (
                <a key={r.title} href={r.url} target="_blank" rel="noopener noreferrer" className="card group flex flex-col p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
                  <span className="text-xs font-semibold text-[var(--color-gold)]">{r.publisher}{r.year ? ` · ${r.year}` : ""}</span>
                  <p className="mt-2 font-semibold leading-snug group-hover:text-[var(--color-brand)]">{r.title}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">{r.finding}</p>
                  <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-[var(--color-brand)]">
                    Read it <ArrowRight className="size-4" />
                  </span>
                </a>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/learn#sources" className="btn btn-ghost">
                <BookOpen className="size-4" /> All sources and research
              </Link>
            </div>
          </div>
        </section>

        {/* Privacy and accounts */}
        <section id="privacy" className="scroll-mt-20 bg-[var(--color-wash)] py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Head eyebrow="Your figures" title="With an account or without one. Either way, private." />
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <Choice icon={<Smartphone />} title="Without an account" points={["Nothing you enter leaves this device", "Statements are read in your browser, never uploaded", "Your figures stay saved in this browser"]} cta={{ href: "/calculate", label: "Calculate now" }} />
              <Choice featured icon={<ShieldCheck />} title="With a free account" points={["Your calculations on every device", "Encrypted on your device before they are stored; we cannot read them", "Keep a record of each year's zakat"]} cta={{ href: "/signup", label: "Create a free account" }} />
            </div>
          </div>
        </section>

        {/* Business and hosting */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-2">
            <Promo icon={<Briefcase />} eyebrow="For businesses" title="Audit your books for zakat and for non-halal income." body="Upload your transactions, flag interest and other income that needs purifying, and work out the business's zakat on its trade assets." href="/business" cta="See the business tools" />
            <Promo icon={<Server />} eyebrow="Host your own" title="Run Zakat Kit for your family, mosque or workplace." body="It is open source. Host your own copy and every figure stays on infrastructure you control." href="/host" cta="How to host it" />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-[var(--color-rule)] py-20 sm:py-24">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <Head eyebrow="FAQ" title="Questions people ask first." center />
            <div className="mt-10 space-y-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="card group [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold">
                    {q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6">
          <div className="answer mx-auto w-full max-w-6xl px-6 py-14 text-center sm:px-12 sm:py-20">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">Work out your zakat in a few minutes.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--color-ink-soft)]">No account, no upload, no guesswork. Just your figures and the working.</p>
            <Link href="/calculate" className="btn btn-primary mt-8 px-6">
              Calculate my zakat <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

const FAQ: [string, string][] = [
  ["Is this a fatwa?", "No. Zakat Kit does arithmetic on numbers you enter and shows its working. Where scholars differ, it offers the options and names them. On anything that matters, ask someone qualified."],
  ["Should I use the gold or silver nisab?", "Both are held by scholars. The silver threshold is usually much lower, so more people owe zakat under it. The calculator lets you choose; your scholar can tell you which they follow."],
  ["Do I subtract my whole loan?", "No. Only debts that are due now come off: this month's repayment, bills you owe. Subtracting an entire long-term loan would wipe out zakat that is genuinely owed."],
  ["What if I keep my zakat year by the Gregorian calendar?", "Some scholars raise the rate to about 2.577% to cover the extra eleven days of a solar year. There is a switch for it."],
  ["Is my data uploaded anywhere?", "Without an account, no: figures and statements are read and kept in your browser. With an account, your calculations are encrypted on your device first, so what we store is unreadable to us."],
  ["Does it handle zakat al-Fitr?", "Yes. It works out the measure, one sa' of food (about 2.5kg) per person in your household, and its cost at the price you enter."],
];

function Head({ eyebrow, title, body, center = false }: { eyebrow: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : "max-w-2xl"}>
      <p className="eyebrow text-[var(--color-brand)]">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-pretty text-lg text-[var(--color-ink-soft)]">{body}</p>}
    </div>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="card relative p-6">
      <span className="figure-xl absolute right-5 top-3 text-5xl text-[var(--color-yellow)] [-webkit-text-stroke:2px_var(--color-ink)]">{n}</span>
      <span className="grid size-11 place-items-center rounded-md bg-[var(--color-brand)] text-white [&_svg]:size-5">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{children}</p>
    </li>
  );
}

function List({ tone, title, items, note }: { tone: "brand" | "gold" | "muted"; title: string; items: [React.ReactNode, string, string][]; note?: string }) {
  const color = tone === "brand" ? "var(--color-brand)" : tone === "gold" ? "var(--color-gold)" : "var(--color-ink-faint)";
  return (
    <div className="card p-6">
      <p className="text-sm font-semibold" style={{ color }}>{title}</p>
      <ul className="mt-4 space-y-4">
        {items.map(([icon, label, hint]) => (
          <li key={label} className="flex gap-3">
            <span className="mt-0.5 [&_svg]:size-5" style={{ color }}>{icon}</span>
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-[var(--color-ink-soft)]">{hint}</p>
            </div>
          </li>
        ))}
      </ul>
      {note && <p className="mt-5 border-t border-[var(--color-rule)] pt-4 text-sm leading-relaxed text-[var(--color-ink-soft)]">{note}</p>}
    </div>
  );
}

function Choice({ icon, title, points, cta, featured = false }: { icon: React.ReactNode; title: string; points: string[]; cta: { href: string; label: string }; featured?: boolean }) {
  return (
    <div className={`p-6 sm:p-8 ${featured ? "card-print" : "card"}`}>
      <span className={`grid size-11 place-items-center rounded-2xl [&_svg]:size-5 ${featured ? "bg-[var(--color-brand)] text-white" : "border border-[var(--color-rule)] text-[var(--color-brand)]"}`}>{icon}</span>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[15px]">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--color-brand)]" /> {p}
          </li>
        ))}
      </ul>
      <Link href={cta.href} className={`btn mt-6 w-full ${featured ? "btn-primary" : "btn-ghost"}`}>{cta.label}</Link>
    </div>
  );
}

function Promo({ icon, eyebrow, title, body, href, cta }: { icon: React.ReactNode; eyebrow: string; title: string; body: string; href: string; cta: string }) {
  return (
    <Link href={href} className="card group flex flex-col p-6 transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-8">
      <span className="grid size-11 place-items-center rounded-md bg-[var(--color-yellow)] text-[var(--color-ink)] [&_svg]:size-5">{icon}</span>
      <p className="eyebrow mt-5">{eyebrow}</p>
      <h3 className="mt-1.5 text-xl font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
      <span className="mt-5 flex items-center gap-1 font-semibold text-[var(--color-brand)]">
        {cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
