export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bk-fire-card animate-pulse h-[40px] w-48" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bk-fire-card animate-pulse h-[120px]" />)}
      </div>
      <div className="bk-fire-card animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 border-b border-white/5 last:border-0" />)}
      </div>
    </div>
  );
}
