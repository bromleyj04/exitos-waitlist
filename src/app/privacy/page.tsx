import { LegalPage } from "@/components/waitlist/LegalPage";
import { projectConfig } from "@/config/project.config";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro={`This page explains how ${projectConfig.name} handles waitlist and validation survey data.`}
    >
      <section>
        <h2>What We Collect</h2>
        <p>
          We collect the email address you submit, optional profile details configured for this waitlist, survey
          responses, referral attribution, source and UTM parameters, and basic funnel events such as signup and survey
          completion.
        </p>
      </section>
      <section>
        <h2>How We Use It</h2>
        <p>
          The data is used to understand demand, qualify early conversations manually, improve the validation offer, and
          contact people who asked to join the waitlist.
        </p>
      </section>
      <section>
        <h2>Storage</h2>
        <p>
          Local file storage is for development only. Production deployments should use the configured Postgres database
          through <code>DATABASE_URL</code>.
        </p>
      </section>
      <section>
        <h2>Your Choices</h2>
        <p>
          If this waitlist is deployed for a real project, provide a contact email here so people can request access,
          correction, or deletion of their data.
        </p>
      </section>
    </LegalPage>
  );
}
