import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-rule)] bg-[var(--color-wash)]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:px-6">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--color-ink-soft)]">
            Work out the zakat you owe and see the working. Free, open source and private by design.
          </p>
        </div>
        <Col title="Tools" links={[["Zakat on wealth", "/calculate"], ["Zakat al-Fitr", "/calculate?tab=fitr"], ["Monthly plan", "/calculate?tab=budget"], ["For businesses", "/business"]]} />
        <Col title="Learn" links={[["How zakat is calculated", "/learn"], ["Sources and research", "/learn#sources"], ["FAQ", "/#faq"]]} />
        <Col title="Project" links={[["Host your own", "/host"], ["Create an account", "/signup"], ["Source code", "https://github.com/bytheitc/zakat"], ["Contribute", "https://github.com/bytheitc/zakat/issues"]]} />
      </div>
      <div className="border-t border-[var(--color-rule)]">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-[var(--color-ink-faint)] sm:px-6">
          Zakat Kit is a calculator, not a ruling. Where scholars differ it shows the options; on anything that matters, ask someone qualified.
        </p>
      </div>
    </footer>
  );
}

function Col({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-brand)]">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
