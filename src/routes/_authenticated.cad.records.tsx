import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EntityPanel, FieldRow } from "@/components/cad/entity-panel";
import { useCad } from "@/lib/cad";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/cad/records")({
  ssr: false,
  component: RecordsPage,
});

function RecordsPage() {
  const { active } = useCad();
  if (!active) return null;
  const communityId = active.community_id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Records</h1>
        <p className="text-sm text-muted-foreground">
          Civilian, vehicle, firearm and warrant files for {active.communities?.name}.
        </p>
      </div>

      <Tabs defaultValue="civilians">
        <TabsList>
          <TabsTrigger value="civilians">Civilians</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="weapons">Firearms</TabsTrigger>
          <TabsTrigger value="warrants">Warrants</TabsTrigger>
        </TabsList>

        <TabsContent value="civilians" className="mt-5">
          <EntityPanel
            table="civilians"
            communityId={communityId}
            title="Civilian files"
            description="Identity, licence status and notes."
            addLabel="New civilian"
            emptyLabel="No civilians on file."
            searchKeys={["first_name", "last_name", "address", "license_status"]}
            auditActionPrefix="civilian"
            fields={[
              { name: "first_name", label: "First name", required: true },
              { name: "last_name", label: "Last name", required: true },
              { name: "dob", label: "Date of birth", type: "date" },
              {
                name: "gender",
                label: "Gender",
                type: "select",
                options: [
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ],
              },
              { name: "address", label: "Address", placeholder: "1200 Vinewood Blvd" },
              {
                name: "license_status",
                label: "Licence status",
                type: "select",
                options: [
                  { value: "valid", label: "Valid" },
                  { value: "suspended", label: "Suspended" },
                  { value: "revoked", label: "Revoked" },
                  { value: "none", label: "None" },
                ],
              },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            renderRow={(row, onEdit) => (
              <div className="space-y-2 pr-16">
                <h3 className="font-display text-base font-semibold">
                  {String(row["first_name"])} {String(row["last_name"])}
                </h3>
                <FieldRow label="Date of birth" value={row["dob"] ? String(row["dob"]) : ""} />
                <FieldRow label="Address" value={row["address"] ? String(row["address"]) : ""} />
                <FieldRow label="Licence" value={String(row["license_status"])} />
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
        </TabsContent>

        <TabsContent value="vehicles" className="mt-5">
          <EntityPanel
            table="vehicles"
            communityId={communityId}
            title="Vehicle registrations"
            description="Plates, registration and insurance status."
            addLabel="New vehicle"
            emptyLabel="No vehicles on file."
            searchKeys={["plate", "model", "owner_name", "color"]}
            auditActionPrefix="vehicle"
            fields={[
              { name: "plate", label: "Plate", required: true, placeholder: "ABC-1234" },
              { name: "model", label: "Make / model", placeholder: "Bravado Buffalo" },
              { name: "color", label: "Colour", placeholder: "Black" },
              { name: "owner_name", label: "Registered owner" },
              {
                name: "registration",
                label: "Registration",
                type: "select",
                options: [
                  { value: "valid", label: "Valid" },
                  { value: "expired", label: "Expired" },
                  { value: "none", label: "None" },
                ],
              },
              {
                name: "insurance",
                label: "Insurance",
                type: "select",
                options: [
                  { value: "valid", label: "Valid" },
                  { value: "expired", label: "Expired" },
                  { value: "none", label: "None" },
                ],
              },
              { name: "stolen", label: "Reported stolen", type: "switch", placeholder: "Flag this plate as stolen" },
            ]}
            renderRow={(row, onEdit) => (
              <div className="space-y-2 pr-16">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/12 px-2 py-0.5 font-mono text-xs text-primary ring-1 ring-primary/25">
                    {String(row["plate"])}
                  </span>
                  {row["stolen"] ? (
                    <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-destructive/30">
                      STOLEN
                    </span>
                  ) : null}
                </div>
                <FieldRow label="Model" value={row["model"] ? String(row["model"]) : ""} />
                <FieldRow label="Colour" value={row["color"] ? String(row["color"]) : ""} />
                <FieldRow label="Owner" value={row["owner_name"] ? String(row["owner_name"]) : ""} />
                <FieldRow label="Registration" value={String(row["registration"])} />
                <FieldRow label="Insurance" value={String(row["insurance"])} />
                <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => onEdit(row)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="weapons" className="mt-5">
          <EntityPanel
            table="weapons"
            communityId={communityId}
            title="Firearm registrations"
            description="Serial numbers and licence status."
            addLabel="New firearm"
            emptyLabel="No firearms on file."
            searchKeys={["serial", "type", "registered_to", "status"]}
            auditActionPrefix="weapon"
            fields={[
              { name: "serial", label: "Serial number", required: true },
              { name: "type", label: "Type", placeholder: "Pistol" },
              { name: "registered_to", label: "Registered to" },
              {
                name: "status",
                label: "Status",
                type: "select",
                options: [
                  { value: "registered", label: "Registered" },
                  { value: "stolen", label: "Stolen" },
                  { value: "seized", label: "Seized" },
                ],
              },
            ]}
            renderRow={(row, onEdit) => (
              <div className="space-y-2 pr-16">
                <h3 className="font-mono text-base font-semibold">{String(row["serial"])}</h3>
                <FieldRow label="Type" value={row["type"] ? String(row["type"]) : ""} />
                <FieldRow
                  label="Registered to"
                  value={row["registered_to"] ? String(row["registered_to"]) : ""}
                />
                <FieldRow label="Status" value={String(row["status"])} />
                <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => onEdit(row)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="warrants" className="mt-5">
          <EntityPanel
            table="warrants"
            communityId={communityId}
            title="Warrants"
            description="Open and cleared warrants."
            addLabel="New warrant"
            emptyLabel="No warrants on file."
            searchKeys={["subject_name", "reason", "status"]}
            auditActionPrefix="warrant"
            fields={[
              { name: "subject_name", label: "Subject", required: true },
              { name: "reason", label: "Reason", type: "textarea" },
              {
                name: "status",
                label: "Status",
                type: "select",
                options: [
                  { value: "active", label: "Active" },
                  { value: "cleared", label: "Cleared" },
                ],
              },
            ]}
            renderRow={(row, onEdit) => (
              <div className="space-y-2 pr-16">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      row["status"] === "active"
                        ? "rounded bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-destructive/30"
                        : "rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {String(row["status"]).toUpperCase()}
                  </span>
                  <h3 className="font-display text-base font-semibold">
                    {String(row["subject_name"])}
                  </h3>
                </div>
                {row["reason"] ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {String(row["reason"])}
                  </p>
                ) : null}
                <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => onEdit(row)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
