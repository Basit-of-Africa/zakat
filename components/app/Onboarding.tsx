"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, FileSpreadsheet, LockKeyhole, ReceiptText, Scale } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const KEY = "zakat-kit:onboarded";
export function hasOnboarded(): boolean {
  try { return window.localStorage.getItem(KEY) === "1"; } catch { return true; }
}
function markOnboarded() {
  try { window.localStorage.setItem(KEY, "1"); } catch { /* private mode */ }
}

const STEPS = [
  { title: "Welcome to Zakat Kit", icon: <ReceiptText />, body: "In a few minutes you will know whether zakat is due on your wealth, how much, and exactly how that was worked out." },
  { title: "Add what you hold", icon: <FileSpreadsheet />, body: "Import bank statements, or just type the figures: cash, savings, gold, money owed to you, business stock, and debts due now." },
  { title: "Set the threshold", icon: <Scale />, body: "Choose the gold or silver nisab and enter today's price per gram. If you are not sure which, the help explains both." },
  { title: "Private by design", icon: <LockKeyhole />, body: "Nothing you enter leaves this device. Your figures are saved in this browser so you can come back; an account adds encrypted backup." },
];

/** The welcome tour: four short steps, shown once, always skippable, replayable from Help. */
export function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const finish = () => { markOnboarded(); setStep(0); onClose(); };
  const s = STEPS[step];
  return (
    <Modal open={open} onClose={finish} title={s.title} description={`Step ${step + 1} of ${STEPS.length}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-[var(--color-brand)]" : "w-1.5 bg-[var(--color-rule-strong)]"}`} />)}
          </div>
          <div className="flex gap-2">
            {step > 0 ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" /> Back</button>
              : <button type="button" className="btn btn-sm text-[var(--color-ink-soft)]" onClick={finish}>Skip</button>}
            {step < STEPS.length - 1
              ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep(step + 1)}>Next <ArrowRight className="size-4" /></button>
              : <button type="button" className="btn btn-primary btn-sm" onClick={finish}>Start calculating</button>}
          </div>
        </div>
      }>
      <div className="flex gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] [&_svg]:size-6">{s.icon}</span>
        <p className="text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{s.body}</p>
      </div>
      <p className="mt-5 rounded-xl bg-[var(--color-wash)] p-3 text-sm text-[var(--color-ink-soft)]">
        This is a calculator, not a ruling. Where scholars differ it gives you the options; on anything that matters, ask someone qualified.
      </p>
    </Modal>
  );
}
