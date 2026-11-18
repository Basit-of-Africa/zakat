import Link from "next/link";
import { Building2, CheckCircle2, Database, Home, KeyRound, Landmark, Server, ShieldCheck, TriangleAlert } from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Ankara } from "@/components/Ankara";

export const metadata = {
  title: "Host your own - Zakat Kit",
  description: "Run your own copy of Zakat Kit for your family, mosque, zakat committee or workplace.",
};

/** For people running their own copy. Every setting named here is one the code reads (see .env.example). */
export default function Host() {
  return (
    <>
      <SiteNav />
      <main>
        <Ankara className="h-3 w-full" size={20} />
        <section className="border-b-2 border-[var(--color-rule)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow text-[var(--color-brand)]">Host your own</p>
            <h1 className="mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">Run Zakat Kit for your family, mosque or workplace.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-soft)]">
              Zakat Kit is open source and is one app: the calculator, the business tools and accounts. Host it yourself and every account lives on infrastructure you control.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#steps" className="btn btn-primary">See the steps</a>
              <a href="https://github.com/bytheitc/zakat" className="btn btn-ghost">Get the code</a>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-3">
            <Who icon={<Home />} title="A family" body="Everyone works out their own zakat on a copy the family trusts. Figures stay on each person's device unless they make an account." />
            <Who icon={<Landmark />} title="A mosque or zakat committee" body="Give your community a calculator under your own name, alongside how and where to pay through you." />
            <Who icon={<Building2 />} title="A business or workplace" body="Staff and owners use the purification audit and business zakat on a private copy." />
          </div>
        </section>

        <section className="border-y border-[var(--color-rule)] bg-[var(--color-wash)] py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">What you need</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Need icon={<Server />} title="Somewhere to run it" body="Any host that runs Next.js on Node 20 or later. A free tier is enough for a family or a community." />
              <Need icon={<Database />} title="A database, for accounts" body="Only if you want accounts: a MongoDB database. Without one, the calculator still works fully, device-only." />
              <Need icon={<KeyRound />} title="One secret" body="A long random string, ACCOUNT_SECRET, if you turn accounts on." />
            </div>
          </div>
        </section>

        <section id="steps" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">Set it up</h2>
            <ol className="mt-8 space-y-6">
              <Step n={1} title="Get the code">
                <Code>git clone https://github.com/bytheitc/zakat.git</Code>
              </Step>
              <Step n={2} title="Deploy it">
                <p>Deploy the repository as a Next.js app. With no settings at all it runs device-only: the calculator, al-Fitr, the monthly plan and the business tools all work.</p>
              </Step>
              <Step n={3} title="Turn on accounts (optional)">
                <p>Set these where you deploy (see <code>.env.example</code>):</p>
                <Code>{`MONGODB_URI=mongodb+srv://…        # your own database
ZAKAT_DB_NAME=zakat_kit
ACCOUNT_SECRET=<a long random string>`}</Code>
                <p>Accounts store only ciphertext: figures are encrypted in each person&apos;s browser before they are saved, so even you, running the server, cannot read them.</p>
              </Step>
              <Step n={4} title="Share it">
                <p>Send people the address. They can use it without an account, or make one to keep their calculations on every device.</p>
              </Step>
            </ol>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--color-gold)]/40 bg-[var(--color-gold-soft)] p-6 sm:p-8">
            <div className="flex items-center gap-2.5">
              <TriangleAlert className="size-5 text-[var(--color-gold)]" />
              <h2 className="text-lg font-semibold">Before you share it</h2>
            </div>
            <ul className="mt-4 space-y-3 text-[15px] text-[var(--color-ink-soft)]">
              {[
                "Keep the line that says it is a calculator, not a ruling. If your scholars follow particular positions (silver or gold nisab, for example), say so on your copy.",
                "Tell people plainly that a forgotten password means their encrypted backup cannot be recovered, by them or by you.",
                "Back up the database if accounts are on.",
              ].map((t) => (
                <li key={t} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--color-gold)]" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="mx-auto mt-10 max-w-3xl text-center">
            <ShieldCheck className="mx-auto size-8 text-[var(--color-brand)]" />
            <p className="mt-3 text-lg font-semibold">Need a hand?</p>
            <p className="mt-1 text-[var(--color-ink-soft)]">Open an issue on GitHub and the maintainers will help.</p>
            <Link href="https://github.com/bytheitc/zakat/issues" className="btn btn-ghost mt-4">Ask on GitHub</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Who({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-6">
      <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] [&_svg]:size-5">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
    </div>
  );
}

function Need({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] p-5">
      <span className="text-[var(--color-brand)] [&_svg]:size-6">{icon}</span>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] font-semibold text-white">{n}</span>
      <div className="min-w-0 flex-1 space-y-3 text-[15px] leading-relaxed text-[var(--color-ink-soft)] [&_code]:rounded [&_code]:bg-[var(--color-wash)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-[var(--color-ink)]">
        <h3 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl bg-[var(--color-ink)] p-4 text-[13px] leading-relaxed text-white">{children}</pre>;
}
