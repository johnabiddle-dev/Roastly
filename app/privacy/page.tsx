export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-invert text-zinc-300 space-y-6">
        <p>Last updated: June 2026</p>

        <h2 className="text-2xl font-semibold mt-8">What we collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Images/screenshots you upload (processed by Grok AI and immediately deleted after generating roasts)</li>
          <li>Browser ID (stored in your browser localStorage) to track free/paid roast limits</li>
          <li>IP address (for abuse prevention)</li>
          <li>Payment information (handled entirely by Stripe — we never see your card details)</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">How we use it</h2>
        <p>We use your image/screenshot only to generate roasts. We do not store images. We use usage data to enforce the free 3-roast limit and paid daily limits.</p>

        <h2 className="text-2xl font-semibold mt-8">Payments</h2>
        <p>All payments are processed by Stripe. We receive confirmation of successful payments but no sensitive card data.</p>

        <h2 className="text-2xl font-semibold mt-8">Your rights</h2>
        <p>You can clear your browser data to reset free limits. For paid users, limits are tied to your browser + IP combination.</p>

        <p className="text-sm text-zinc-500 mt-12">This is a simple policy for a small project. If you have questions, contact the owner via the site.</p>
      </div>
      <a href="/" className="inline-block mt-8 text-red-400 hover:text-red-300">← Back to Roastly</a>
    </div>
  );
}
