import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Ankara } from "@/components/Ankara";
import { NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, SAA_KILOGRAMS } from "@/lib/zakat";
import { NIGERIA, RESEARCH, SCALE, type Source } from "@/lib/research";

export const metadata = {
  title: "How zakat is worked out - Zakat Kit",
  description: "The method the calculator follows, where scholars differ, and the research behind it, with sources.",
};

export default function Learn() {
  return (
    <>
      <SiteNav />
      <main>
        <Ankara className="h-3 w-full" size={20} />
        <section className="border-b-2 border-[var(--color-rule)]">
          <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="eyebrow text-[var(--color-brand)]">Learn</p>
            <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">How zakat is worked out.</h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
              The method the calculator follows, step by step, with the places scholars differ named rather than decided for you. Then the sources and research behind it.
            </p>
          </div>
        </section>

        <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:mt-3 [&_p]:text-[17px] [&_p]:leading-relaxed [&_p]:text-[var(--color-ink-soft)] [&_strong]:text-[var(--color-ink)]">
          <h2 className="!mt-0">The obligation</h2>
          <p>
            Zakat is one of the five pillars of Islam: a fixed share of wealth, given each year to those the Qur&apos;an names. The command to establish prayer and give zakat comes together throughout the Qur&apos;an (for example al-Baqarah 2:43), and at-Tawbah 9:60 names the eight kinds of people it is for.
          </p>

          <h2>The calculation</h2>
          <div className="mt-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-wash)] p-5 font-mono-nums text-[15px] leading-loose">
            <p className="!mt-0 !text-[var(--color-ink)]">zakatable assets − debts due now = net wealth</p>
            <p className="!mt-0 !text-[var(--color-ink)]">if net wealth ≥ nisab: zakat = net wealth × 2.5%</p>
          </div>
          <p><strong>Zakatable assets</strong> are cash and bank balances, savings, gold and silver at today&apos;s value, money owed to you that you expect back, and stock held for sale. Your home and the things you use (car, furniture, tools of your trade) are not counted.</p>
          <p><strong>Debts due now</strong> are what you must pay soon, not the whole of a long-term loan; subtracting all of a mortgage would wipe out zakat that is genuinely owed.</p>

          <h2>Where scholars differ</h2>
          <p><strong>Gold or silver nisab.</strong> The threshold is the value of {NISAB_GOLD_GRAMS}g of gold or {NISAB_SILVER_GRAMS}g of silver. Silver is usually far lower, so more people owe zakat under it. Both are held; the calculator lets you choose.</p>
          <p><strong>A solar year.</strong> Zakat is due on wealth held for a lunar year. Some scholars hold that someone who keeps their zakat year by the Gregorian calendar should pay about 2.577% to cover the extra days.</p>
          <p><strong>Zakat al-Fitr in money.</strong> It is measured in food, one sa&apos; (about {SAA_KILOGRAMS}kg of the staple) per person. Whether its value may be given in money instead is a long-standing difference of opinion.</p>
          <p><strong>Jewellery worn.</strong> Some schools exempt gold and silver jewellery in regular personal use; others count it. Enter it or leave it out according to the view you follow.</p>

          <h2>Further reading</h2>
          <p>
            For depth, two standard works: Yusuf al-Qaradawi&apos;s <em>Fiqh al-Zakah</em>, the most widely cited modern study of the subject, and AAOIFI&apos;s Shari&apos;ah Standard on zakah, which sets out rules many Islamic financial institutions follow. Both treat the differences above at length.
          </p>
        </article>

        <section id="sources" className="scroll-mt-20 border-t border-[var(--color-rule)] bg-[var(--color-wash)] py-16 sm:py-20">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">Sources and research</h2>
            <p className="mt-2 max-w-2xl text-[var(--color-ink-soft)]">Each entry says what it found in words the source supports. Where a figure is an estimate, it says so.</p>
            <SourceList title="Islamic Development Bank research" items={RESEARCH} />
            <SourceList title="How large is zakat?" note="Nobody knows the exact size. The honest answer is a range." items={SCALE} />
            <SourceList title="Nigeria" items={NIGERIA} />
          </div>
        </section>

        <section className="px-4 py-20 text-center sm:px-6">
          <BookOpen className="mx-auto size-8 text-[var(--color-brand)]" />
          <h2 className="mt-3 text-2xl font-semibold">Ready to work out yours?</h2>
          <Link href="/calculate" className="btn btn-primary mt-6">Calculate my zakat <ArrowRight className="size-4" /></Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SourceList({ title, items, note }: { title: string; items: readonly Source[]; note?: string }) {
  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold">{title}</h3>
      {note && <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{note}</p>}
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="card group flex h-full flex-col p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
              <span className="text-xs font-semibold text-[var(--color-gold)]">{s.publisher}{s.year ? ` · ${s.year}` : ""}</span>
              <span className="mt-1.5 font-semibold leading-snug group-hover:text-[var(--color-brand)]">{s.title}</span>
              <span className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">{s.finding}</span>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-[var(--color-brand)]">Open source <ExternalLink className="size-3.5" /></span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
