import { createFileRoute } from "@tanstack/react-router";
import { EntityPanel, FieldRow } from "@/components/cad/entity-panel";
import { useCad } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/cad/citations")({
  ssr: false,
  component: CitationsPage,
});

function CitationsPage() {
  const { active } = useCad();
  if (!active) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Citations</h1>
        <p className="text-sm text-muted-foreground">
          Tickets and fines issued in {active.communities?.name}.
        </p>
      </div>
      <EntityPanel
        table="citations"
        communityId={active.community_id}
        title="Issued citations"
        description="Violation, fine amount and issuing officer."
        addLabel="New citation"
        emptyLabel="No citations issued yet."
        searchKeys={["civilian_name", "violation", "officer_name"]}
        auditActionPrefix="citation"
        fields={[
          { name: "civilian_name", label: "Civilian", required: true },
          { name: "violation", label: "Violation", required: true, placeholder: "Speeding 25 over" },
          { name: "fine", label: "Fine amount", type: "number", defaultValue: 250 },
          { name: "officer_name", label: "Issuing officer", defaultValue: active.callsign },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        renderRow={(row) => (
          <div className="space-y-2 pr-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold">
                {String(row["civilian_name"])}
              </h3>
              <span className="font-mono text-sm text-warning">
                ${Number(row["fine"] ?? 0).toLocaleString()}
              </span>
            </div>
            <FieldRow label="Violation" value={String(row["violation"])} />
            <FieldRow
              label="Officer"
              value={row["officer_name"] ? String(row["officer_name"]) : ""}
            />
            {row["notes"] ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {String(row["notes"])}
              </p>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
