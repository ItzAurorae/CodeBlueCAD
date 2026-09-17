import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLogger, type AuditAction } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "switch";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
};

export type Row = Record<string, unknown>;

type Props = {
  table: string;
  communityId: string;
  title: string;
  description: string;
  addLabel: string;
  fields: Field[];
  searchKeys: string[];
  renderRow: (row: Row, onEdit: (row: Row) => void) => ReactNode;
  emptyLabel: string;
  auditActionPrefix?: string;
};

function initialValues(fields: Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    out[f.name] =
      f.defaultValue ??
      (f.type === "switch" ? false : f.type === "select" ? (f.options?.[0]?.value ?? "") : "");
  }
  return out;
}

function rowToValues(fields: Field[], row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const val = row[f.name];
    if (f.type === "switch") out[f.name] = !!val;
    else if (f.type === "date") out[f.name] = val ? String(val).slice(0, 10) : "";
    else out[f.name] = val === null || val === undefined ? "" : val;
  }
  return out;
}

function buildPayload(
  fields: Field[],
  values: Record<string, unknown>,
  communityId: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { community_id: communityId };
  for (const f of fields) {
    const raw = values[f.name];
    if (f.type === "switch") payload[f.name] = !!raw;
    else if (f.type === "number") payload[f.name] = raw === "" ? 0 : Number(raw);
    else payload[f.name] = raw === "" ? null : raw;
  }
  return payload;
}

function FormFields({
  fields,
  values,
  setValues,
  prefix,
}: {
  fields: Field[];
  values: Record<string, unknown>;
  setValues: (v: Record<string, unknown>) => void;
  prefix: string;
}) {
  return (
    <>
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={`${prefix}-${f.name}`}>{f.label}</Label>
          {f.type === "textarea" ? (
            <Textarea
              id={`${prefix}-${f.name}`}
              value={String(values[f.name] ?? "")}
              placeholder={f.placeholder}
              required={f.required}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            />
          ) : f.type === "select" ? (
            <Select
              value={String(values[f.name] ?? "")}
              onValueChange={(val) => setValues({ ...values, [f.name]: val })}
            >
              <SelectTrigger id={`${prefix}-${f.name}`}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {f.options?.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : f.type === "switch" ? (
            <div className="flex items-center gap-2 pt-1">
              <Switch
                id={`${prefix}-${f.name}`}
                checked={!!values[f.name]}
                onCheckedChange={(val) => setValues({ ...values, [f.name]: val })}
              />
              <span className="text-sm text-muted-foreground">{f.placeholder}</span>
            </div>
          ) : (
            <Input
              id={`${prefix}-${f.name}`}
              type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
              value={String(values[f.name] ?? "")}
              placeholder={f.placeholder}
              required={f.required}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            />
          )}
        </div>
      ))}
    </>
  );
}

export function EntityPanel({
  table,
  communityId,
  title,
  description,
  addLabel,
  fields,
  searchKeys,
  renderRow,
  emptyLabel,
  auditActionPrefix,
}: Props) {
  const queryClient = useQueryClient();
  const logAudit = useAuditLogger();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createValues, setCreateValues] = useState<Record<string, unknown>>(() =>
    initialValues(fields),
  );
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  const queryKey = [table, communityId];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}-${communityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `community_id=eq.${communityId}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, communityId, queryClient]);

  const create = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(fields, createValues, communityId);
      const { error } = await supabase.from(table as never).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setCreateValues(initialValues(fields));
      setCreateOpen(false);
      toast.success(`${title} entry saved`);
      if (auditActionPrefix) {
        void logAudit({
          action: `${auditActionPrefix}.create` as AuditAction,
          entityType: table,
          communityId,
          details: { ...createValues },
        });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editRow) return;
      const payload = buildPayload(fields, editValues, communityId);
      delete payload["community_id"];
      const { error } = await supabase
        .from(table as never)
        .update(payload as never)
        .eq("id", String(editRow["id"]));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditOpen(false);
      setEditRow(null);
      toast.success("Entry updated");
      if (auditActionPrefix) {
        void logAudit({
          action: `${auditActionPrefix}.update` as AuditAction,
          entityType: table,
          entityId: String(editRow?.["id"] ?? ""),
          communityId,
          details: { ...editValues },
        });
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey });
      setDeleteId(null);
      toast.success("Entry removed");
      if (auditActionPrefix) {
        void logAudit({
          action: `${auditActionPrefix}.delete` as AuditAction,
          entityType: table,
          entityId: id,
          communityId,
        });
      }
    },
  });

  function openEdit(row: Row) {
    setEditRow(row);
    setEditValues(rowToValues(fields, row));
    setEditOpen(true);
  }

  const filtered = rows.filter((row) => {
    if (!query.trim()) return true;
    const needle = query.toLowerCase();
    return searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(needle));
  });

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-48 pl-8"
            />
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> {addLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{addLabel}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>
              <form
                id={`form-create-${table}`}
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
              >
                <FormFields
                  fields={fields}
                  values={createValues}
                  setValues={setCreateValues}
                  prefix={`create-${table}`}
                />
                <DialogFooter>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending && <Loader2 className="size-4 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {title.toLowerCase().replace(/s$/, "")}</DialogTitle>
            <DialogDescription>Update the record details below.</DialogDescription>
          </DialogHeader>
          <form
            id={`form-edit-${table}`}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate();
            }}
          >
            <FormFields
              fields={fields}
              values={editValues}
              setValues={setEditValues}
              prefix={`edit-${table}`}
            />
            <DialogFooter>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && remove.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((row) => (
            <li
              key={String(row["id"])}
              className="group relative rounded-lg border border-border bg-card p-4"
            >
              {renderRow(row, openEdit)}
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Edit entry"
                  onClick={() => openEdit(row)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete entry"
                  onClick={() => setDeleteId(String(row["id"]))}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
