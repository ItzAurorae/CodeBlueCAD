import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
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
  renderRow: (row: Row) => ReactNode;
  emptyLabel: string;
  auditActionPrefix?: string;
};

function initialValues(fields: Field[]) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    out[f.name] =
      f.defaultValue ??
      (f.type === "switch" ? false : f.type === "select" ? (f.options?.[0]?.value ?? "") : "");
  }
  return out;
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
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(fields));

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

  const create = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { community_id: communityId };
      for (const f of fields) {
        const raw = values[f.name];
        if (f.type === "switch") payload[f.name] = !!raw;
        else if (f.type === "number") payload[f.name] = raw === "" ? 0 : Number(raw);
        else payload[f.name] = raw === "" ? null : raw;
      }
      const { error } = await supabase.from(table as never).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setValues(initialValues(fields));
      setOpen(false);
      toast.success(`${title} entry saved`);
      if (auditActionPrefix) {
        void logAudit({
          action: `${auditActionPrefix}.create` as AuditAction,
          entityType: table,
          communityId,
          details: { ...values },
        });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey });
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
          <Dialog open={open} onOpenChange={setOpen}>
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
                id={`form-${table}`}
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
              >
                {fields.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={`${table}-${f.name}`}>{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        id={`${table}-${f.name}`}
                        value={String(values[f.name] ?? "")}
                        placeholder={f.placeholder}
                        required={f.required}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      />
                    ) : f.type === "select" ? (
                      <Select
                        value={String(values[f.name] ?? "")}
                        onValueChange={(val) => setValues((v) => ({ ...v, [f.name]: val }))}
                      >
                        <SelectTrigger id={`${table}-${f.name}`}>
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
                          id={`${table}-${f.name}`}
                          checked={!!values[f.name]}
                          onCheckedChange={(val) =>
                            setValues((v) => ({ ...v, [f.name]: val }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">{f.placeholder}</span>
                      </div>
                    ) : (
                      <Input
                        id={`${table}-${f.name}`}
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        value={String(values[f.name] ?? "")}
                        placeholder={f.placeholder}
                        required={f.required}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
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
              {renderRow(row)}
              <button
                type="button"
                aria-label="Delete entry"
                onClick={() => remove.mutate(String(row["id"]))}
                className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
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
