import Image from "next/image";
import Link from "next/link";

export default function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" aria-label="blazeKey home" className="inline-flex items-center">
      <Image
        src="/blazeKey-tp-bg.png"
        alt="blazeKey"
        width={size}
        height={size}
        priority
        sizes={`${size}px`}
        className="select-none pointer-events-none drop-shadow-[0_0_10px_rgba(255,75,0,0.6)]"
      />
    </Link>
  );
}
