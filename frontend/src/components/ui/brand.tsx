import Link from "next/link";
import { Scale } from "lucide-react";

export default function Brand({ href = "/", subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 shrink-0">
      <span className="w-8 h-8 rounded-md bg-brand text-white flex items-center justify-center">
        <Scale className="w-4 h-4" strokeWidth={2} />
      </span>
      <span className="leading-tight">
        <span className="block font-serif text-[17px] font-semibold text-ink">NyayaFlow</span>
        {subtitle && <span className="block text-xs text-muted">{subtitle}</span>}
      </span>
    </Link>
  );
}
