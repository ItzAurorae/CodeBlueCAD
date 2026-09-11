import { createFileRoute } from "@tanstack/react-router";
import { EntityPanel, FieldRow } from "@/components/cad/entity-panel";
import { useCad } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/cad/bolos")({
  ssr: false,
  component: BolosPage,
});

function BolosPage() {
  const { active } = useCad();
  if (!active) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">BOLO Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Be On The Lookout alerts shared with every unit in {active.communities?.name}.
        </p>
      </div>
      <EntityPanel
        table="bolos"
        communityId={active.community_id}
        title="Active BOLOs"
        description="Vehicles and persons of interest."
        addLabel="New BOLO"
        emptyLabel="No BOLOs on file."
        searchKeys={["title", "description", "plate", "kind", "status"]}
        auditActionPrefix="bolo"
        fields={[
          {
            name: "kind",
            label: "Type",
            type: "select",
            options: [
              { value: "person", label: "Person" },
              { value: "vehicle", label: "Vehicle" },
            ],
          },
          { name: "title", label: "Subject", required: true, placeholder: "Silver sedan, no plate" },
          { name: "plate", label: "Plate (if vehicle)", placeholder: "ABC-1234" },
          { name: "description", label: "Details", type: "textarea" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "resolved", label: "Resolved" },
            ],
          },
        ]}
        renderRow={(row) => (
          <div className="space-y-2 pr-8">
            <div className="flex items-center gap-2">
              <span className="rounded bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning ring-1 ring-warning/30">
                {String(row["kind"]).toUpperCase()}
              </span>
              <h3 className="font-display text-base font-semibold">{String(row["title"])}</h3>
            </div>
            <FieldRow label="Plate" value={row["plate"] ? String(row["plate"]) : ""} />
            <FieldRow label="Status" value={String(row["status"])} />
            {row["description"] ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {String(row["description"])}
              </p>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
