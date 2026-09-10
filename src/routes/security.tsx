import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/cad/legal-page";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — CodeBlueCAD" },
      {
        name: "description",
        content:
          "How CodeBlueCAD protects accounts and keeps community dispatch records isolated.",
      },
      { property: "og:title", content: "Security — CodeBlueCAD" },
      {
        property: "og:description",
        content: "How CodeBlueCAD protects accounts and isolates community records.",
      },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      intro="Every record is locked to the community it belongs to, enforced on the server rather than in the browser."
      sections={[
        {
          heading: "Row-level access rules",
          body: (
            <p>
              Calls, BOLOs, records, citations and reports can only be read or written by verified
              members of the same community. The rules are enforced by the database on every
              request.
            </p>
          ),
        },
        {
          heading: "Sign-in",
          body: (
            <p>
              Accounts use email and password or Discord. Sessions are short-lived and refreshed
              automatically; passwords are never stored by us in readable form.
            </p>
          ),
        },
        {
          heading: "Transport",
          body: <p>All traffic is encrypted in transit over HTTPS.</p>,
        },
        {
          heading: "Reporting a problem",
          body: (
            <p>
              Found a vulnerability? Report it privately to a community owner or the project
              maintainer before disclosing it publicly, and give us a reasonable window to fix it.
            </p>
          ),
        },
      ]}
    />
  );
}
