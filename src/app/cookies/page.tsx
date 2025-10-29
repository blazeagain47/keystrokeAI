export const metadata = { title: "Cookie Policy — BlazeKey" };
export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-4">Cookie Policy</h1>
      <p className="text-sm text-gray-300 mb-6">Last updated: {new Date().toISOString().slice(0,10)}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">What are cookies?</h2>
      <p>Small text files stored on your device to make the site work and to measure performance.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Types we use</h2>
      <ul className="list-disc ml-6">
        <li>Essential cookies (site operations)</li>
        <li>Performance cookies (anonymous analytics)</li>
        <li>Advertising cookies (AdSense)</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">Managing cookies</h2>
      <p>Use your browser settings to block or delete cookies. Blocking may affect site functionality.</p>
    </main>
  );
}


