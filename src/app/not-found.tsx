export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-center p-8">
      <div>
        <h1 className="text-3xl font-semibold text-white/90">Page not found</h1>
        <p className="text-white/60 mt-2">The page you’re looking for doesn’t exist.</p>
        <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white">
          Go home
        </a>
      </div>
    </div>
  );
}


