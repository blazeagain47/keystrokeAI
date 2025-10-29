export const metadata = { title: "Privacy Policy — BlazeKey" };
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-4">Privacy Policy</h1>
      <p className="text-sm text-gray-300 mb-6">Last updated: {new Date().toISOString().slice(0,10)}</p>
      <p className="mb-4">
        BlazeKey is a free typing practice site. We collect minimal data to operate and improve the site.
        We use Google AdSense to display ads. Google and partners may use cookies to serve ads based on your visits.
      </p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Cookies</h2>
      <p>Cookies help remember preferences and measure usage. You can block or delete cookies in your browser settings.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
      <p>support@blazekeyapp.com</p>
    </main>
  );
}


