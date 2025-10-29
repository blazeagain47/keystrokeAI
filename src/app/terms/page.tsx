export const metadata = { title: "Terms of Service — BlazeKey" };
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-4">Terms of Service</h1>
      <p className="text-sm text-gray-300 mb-6">Last updated: {new Date().toISOString().slice(0,10)}</p>
      <p className="mb-4">By using BlazeKey, you agree to use the site lawfully. The site is provided “as is”.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Accounts</h2>
      <p>You’re responsible for activity on your account. We may suspend access for abuse, fraud, or misuse.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Content</h2>
      <p>All trademarks belong to their owners. Don’t upload unlawful or infringing content.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Limitation of Liability</h2>
      <p>We’re not liable for indirect or consequential damages arising from use of the site.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
      <p>support@blazekeyapp.com</p>
    </main>
  );
}


