export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="h-6 w-48 bg-white/10 rounded" />
      {Array.from({length:6}).map((_,i)=><div key={i} className="h-14 bg-white/5 rounded-2xl" />)}
    </div>
  );
}


