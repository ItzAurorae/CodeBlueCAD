import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EntityPanel, FieldRow } from "@/components/cad/entity-panel";
import { useCad } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/cad/incidents")({
  ssr: false,
  component: IncidentsPage,
});

function IncidentsPage() {
  const { active } = useCad();
  if (!active) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Incident reports</h1>
        <p className="text-sm text-muted-foreground">
          Written reports filed by units in {active.communities?.name}.
        </p>
      </div>
      <EntityPanel
        table="incidents"
        communityId={active.community_id}
        title="Filed reports"
        description="Narrative reports with involved parties."
        addLabel="New report"
        emptyLabel="No reports filed yet."
        searchKeys={["title", "involved", "officer_name", "description"]}
        auditActionPrefix="incident"
        fields={[
          { name: "title", label: "Title", required: true, placeholder: "Armed robbery — 24/7" },
          { name: "involved", label: "Involved parties", placeholder: "John Doe, Jane Roe" },
          { name: "officer_name", label: "Filing officer", defaultValue: active.callsign },
          { name: "description", label: "Narrative", type: "textarea" },
        ]}
        renderRow={(row, onEdit) => (
          <div className="space-y-2 pr-16">
            <h3 className="font-display text-base font-semibold">{String(row["title"])}</h3>
            <FieldRow label="Involved" value={row["involved"] ? String(row["involved"]) : ""} />
            <FieldRow
              label="Officer"
              value={row["officer_name"] ? String(row["officer_name"]) : ""}
            />
            {row["description"] ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {String(row["description"])}
              </p>
            ) : null}
            <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => onEdit(row)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          </div>
        )}
      />
    </div>
  );
}
