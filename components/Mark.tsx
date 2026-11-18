import { ItcMark } from "@/components/ItcMark";

/** The logo: the Islamic Tech Collective's mark (components/ItcMark.tsx). */
export function Mark({ className = "size-10" }: { className?: string }) {
  return <ItcMark className={className} />;
}
