export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-gray-400 flex flex-col sm:flex-row gap-3 sm:gap-6 items-center justify-between">
        <div>© {new Date().getFullYear()} BlazeKey</div>
        <nav className="flex items-center gap-4">
          <a className="hover:text-gray-200" href="/privacy">Privacy</a>
          <a className="hover:text-gray-200" href="/terms">Terms</a>
          <a className="hover:text-gray-200" href="/cookies">Cookies</a>
        </nav>
      </div>
    </footer>
  );
}
