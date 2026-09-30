import { LegalPage } from "@/components/waitlist/LegalPage";
import { projectConfig } from "@/config/project.config";

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      intro={`${projectConfig.name} keeps the waitlist experience lightweight and avoids unnecessary tracking by default.`}
    >
      <section>
        <h2>Essential Local Storage</h2>
        <p>
          The waitlist may use browser session storage to remember your current signup, survey, or referral step during
          the same browsing session. This helps refresh and back navigation work without asking you to restart.
        </p>
      </section>
      <section>
        <h2>Analytics</h2>
        <p>
          The default analytics adapter records lightweight first-party funnel events. If a project adds a third-party
          analytics provider later, this page should be updated to name that provider and explain its cookies.
        </p>
      </section>
      <section>
        <h2>Managing Cookies</h2>
        <p>
          You can control cookies and local site data through your browser settings. Blocking all storage may prevent the
          multi-step waitlist flow from preserving progress on refresh.
        </p>
      </section>
    </LegalPage>
  );
}
