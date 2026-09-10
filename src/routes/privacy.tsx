import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/cad/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CodeBlueCAD" },
      {
        name: "description",
        content:
          "How CodeBlueCAD handles account data, community records and roleplay information.",
      },
      { property: "og:title", content: "Privacy Policy — CodeBlueCAD" },
      {
        property: "og:description",
        content: "How CodeBlueCAD handles account data and community records.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="We collect only what the dispatch terminal needs to work, and community data never leaves the community it belongs to."
      sections={[
        {
          heading: "What we store",
          body: (
            <p>
              Your email address, display name, optional avatar, and — if you sign in with Discord —
              your Discord username and ID. Inside a community we store your callsign, rank,
              department and duty status.
            </p>
          ),
        },
        {
          heading: "Community records",
          body: (
            <p>
              Calls, BOLOs, civilians, vehicles, firearms, warrants, citations and incident reports
              are fictional roleplay records. They are readable only by members of the community
              they were filed in.
            </p>
          ),
        },
        {
          heading: "Sharing",
          body: (
            <p>
              We do not sell data and do not share it with advertisers. Sign-in is handled by our
              authentication provider and, optionally, Discord.
            </p>
          ),
        },
        {
          heading: "Deleting your data",
          body: (
            <p>
              Leaving a community removes your unit record from it. Ask a community owner or contact
              us to have your account and records deleted entirely.
            </p>
          ),
        },
      ]}
    />
  );
}
