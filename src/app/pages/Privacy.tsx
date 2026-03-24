export function Privacy() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e] text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: March 24, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Overview</h2>
            <p>
              Calendary ("we", "our", "the app") is a personal calendar and task management application.
              We respect your privacy and are committed to protecting your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account information:</strong> Email address and profile name provided through Google Sign-In.
              </li>
              <li>
                <strong>Calendar data:</strong> Events, tasks, and categories you create within the app, stored securely in our database.
              </li>
              <li>
                <strong>Google Calendar data:</strong> If you enable Google Calendar integration, we access your Google Calendar events to display them within the app. This data is only used for display purposes and is not stored on our servers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain the calendar and task management service.</li>
              <li>To authenticate your identity via Google Sign-In.</li>
              <li>To sync and display your Google Calendar events when you opt in.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Google API Services</h2>
            <p>
              Calendary's use and transfer of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p className="mt-2">
              We only request access to your Google Calendar to read and manage calendar events.
              We do not share your Google data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Data Storage & Security</h2>
            <p>
              Your data is stored securely using Supabase (PostgreSQL) with row-level security policies.
              All data transmission is encrypted via HTTPS. Authentication tokens are stored locally
              in your browser and are never transmitted to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Data Retention & Deletion</h2>
            <p>
              You can delete your account and all associated data at any time through the app settings.
              Upon account deletion, all your calendar events, tasks, and personal information will be
              permanently removed from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Third-Party Services</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase:</strong> Authentication and database hosting.</li>
              <li><strong>Google OAuth:</strong> Sign-in and calendar API access.</li>
              <li><strong>Vercel:</strong> Application hosting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your personal data.</li>
              <li>Request correction or deletion of your data.</li>
              <li>Revoke Google Calendar access at any time through the app settings.</li>
              <li>Delete your account and all associated data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Contact</h2>
            <p>
              If you have any questions about this privacy policy, please contact us at{" "}
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
