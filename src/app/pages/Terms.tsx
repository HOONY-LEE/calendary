export function Terms() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e] text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: March 24, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Calendary ("the app"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the app.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>
              Calendary is a personal calendar and task management application that allows users to
              create, organize, and manage events and tasks. The app also offers optional integration
              with Google Calendar for syncing events.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must sign in with a valid Google account to use the app.</li>
              <li>You are responsible for maintaining the security of your account.</li>
              <li>You must not use the app for any unlawful purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Google Calendar Integration</h2>
            <p>
              If you choose to enable Google Calendar integration, you authorize Calendary to
              access your Google Calendar data to read, create, modify, and delete events on your behalf.
              You can revoke this access at any time through the app settings.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. User Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You retain ownership of all data you create within the app.</li>
              <li>We do not sell or share your personal data with third parties.</li>
              <li>You can export or delete your data at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Availability</h2>
            <p>
              We strive to keep Calendary available at all times, but we do not guarantee
              uninterrupted access. The service may be temporarily unavailable due to maintenance,
              updates, or circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Limitation of Liability</h2>
            <p>
              Calendary is provided "as is" without warranties of any kind. We are not liable for
              any data loss, service interruptions, or damages arising from the use of the app.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the app after
              changes constitutes acceptance of the updated terms. We will notify users of
              significant changes through the app.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Contact</h2>
            <p>
              If you have any questions about these terms, please contact us at{" "}
              <a href="mailto:leesh940312@gmail.com" className="text-blue-600 underline">
                leesh940312@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <a href="/" className="text-sm text-blue-600 hover:underline">&larr; Back to Calendary</a>
        </div>
      </div>
    </div>
  );
}
