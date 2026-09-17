import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EntityPanel, FieldRow } from "@/components/cad/entity-panel";
import { useCad } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/cad/citations")({
  ssr: false,
  component: CitationsPage,
});

function paymentClass(status: string) {
  if (status === "paid") return "bg-success/15 text-success ring-success/30";
  if (status === "contested") return "bg-warning/15 text-warning ring-warning/30";
  if (status === "dismissed") return "bg-muted text-muted-foreground ring-border";
  return "bg-destructive/15 text-destructive ring-destructive/30";
}

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
        description="Violation, fine amount, penal code and payment status."
        addLabel="New citation"
        emptyLabel="No citations issued yet."
        searchKeys={["civilian_name", "violation", "officer_name", "penal_code", "payment_status"]}
        auditActionPrefix="citation"
        fields={[
          { name: "civilian_name", label: "Civilian", required: true },
          { name: "violation", label: "Violation", required: true, placeholder: "Speeding 25 over" },
          { name: "penal_code", label: "Penal code", placeholder: "VC-23152(a)" },
          { name: "fine", label: "Fine amount", type: "number", defaultValue: 250 },
          { name: "officer_name", label: "Issuing officer", defaultValue: active.callsign },
          {
            name: "payment_status",
            label: "Payment status",
            type: "select",
            defaultValue: "unpaid",
            options: [
              { value: "unpaid", label: "Unpaid" },
              { value: "paid", label: "Paid" },
              { value: "contested", label: "Contested" },
              { value: "dismissed", label: "Dismissed" },
            ],
          },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        renderRow={(row, onEdit) => (
          <div className="space-y-2 pr-16">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold">
                {String(row["civilian_name"])}
              </h3>
              <span className="font-mono text-sm text-warning">
                ${Number(row["fine"] ?? 0).toLocaleString()}
              </span>
            </div>
            <FieldRow label="Violation" value={String(row["violation"])} />
            <FieldRow label="Penal code" value={row["penal_code"] ? String(row["penal_code"]) : ""} />
            <FieldRow
              label="Officer"
              value={row["officer_name"] ? String(row["officer_name"]) : ""}
            />
            {row["payment_status"] ? (
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-medium ring-1 ${paymentClass(String(row["payment_status"]))}`}
              >
                {String(row["payment_status"]).charAt(0).toUpperCase() + String(row["payment_status"]).slice(1)}
              </span>
            ) : null}
            {row["notes"] ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {String(row["notes"])}
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
