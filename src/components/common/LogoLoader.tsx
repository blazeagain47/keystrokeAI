import Image from "next/image";

export default function LogoLoader({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/30 backdrop-blur-sm"
      data-bk="logo-loader"
    >
      <div className="relative">
        <Image
          src="/blazeKey-tp-bg.png"
          alt=""
          width={80}
          height={80}
          priority
          className="select-none pointer-events-none will-change-transform"
        />
        <div className="absolute inset-0 rounded-full blur-2xl opacity-70 bg-[radial-gradient(closest-side,rgba(255,80,0,0.6),transparent_65%)]" />
      </div>
      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          [data-bk="logo-loader"] img {
            animation: bk-pulse 1.4s ease-in-out infinite;
          }
          @keyframes bk-pulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(255,80,0,.6)); }
            50% { transform: scale(1.06); filter: drop-shadow(0 0 16px rgba(255,80,0,.9)); }
          }
        }
      `}</style>
    </div>
  );
}