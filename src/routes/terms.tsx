import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/cad/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CodeBlueCAD" },
      {
        name: "description",
        content: "The rules for using the CodeBlueCAD roleplay dispatch terminal.",
      },
      { property: "og:title", content: "Terms of Service — CodeBlueCAD" },
      {
        property: "og:description",
        content: "The rules for using the CodeBlueCAD roleplay dispatch terminal.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="By using CodeBlueCAD you agree to keep it a roleplay tool and to treat other members fairly."
      sections={[
        {
          heading: "Roleplay only",
          body: (
            <p>
              CodeBlueCAD is for fictional emergency-services roleplay. Do not store real personal
              data, real criminal records, or anything that could be mistaken for official records.
            </p>
          ),
        },
        {
          heading: "Your account",
          body: (
            <p>
              You are responsible for activity under your account and for keeping your sign-in
              details private. One account per person.
            </p>
          ),
        },
        {
          heading: "Communities",
          body: (
            <p>
              Community owners and administrators control membership, ranks and records in their
              community, and may remove members at any time.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <p>
              No harassment, hate speech, illegal content, scraping, or attempts to access data from
              communities you are not a member of. We may suspend accounts that break these rules.
            </p>
          ),
        },
        {
          heading: "Availability",
          body: (
            <p>
              The service is provided as-is with no guarantee of uptime or data retention. Keep your
              own backups of anything you care about.
            </p>
          ),
        },
      ]}
    />
  );
}
