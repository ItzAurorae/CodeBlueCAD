import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCad } from "@/lib/cad";
import { useAuditLogger } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/cad/penal-codes")({
  ssr: false,
  component: PenalCodesPage,
});

type PenalCode = {
  id: string;
  code: string;
  title: string;
  type: string | null;
  bond_type: string | null;
  jail_time: string | null;
  bond_amount: number;
  category: string;
  fine_min: number;
  fine_max: number;
  points: number;
};

type SonoranRecord = {
  code: string;
  type?: string;
  title: string;
  bondType?: string;
  jailTime?: string;
  bondAmount?: number | string;
};

function parseCSV(text: string): SonoranRecord[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const codeIdx = headers.indexOf("code");
  const titleIdx = headers.indexOf("title");
  if (codeIdx === -1 || titleIdx === -1) {
    throw new Error('CSV must include "code" and "title" columns');
  }

  const typeIdx = headers.indexOf("type");
  const bondTypeIdx = headers.indexOf("bondtype");
  const jailTimeIdx = headers.indexOf("jailtime");
  const bondAmountIdx = headers.indexOf("bondamount");

  const records: SonoranRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 1 && !cols[0].trim()) continue;
    records.push({
      code: (cols[codeIdx] ?? "").trim(),
      title: (cols[titleIdx] ?? "").trim(),
      type: typeIdx >= 0 ? (cols[typeIdx] ?? "").trim() || undefined : undefined,
      bondType: bondTypeIdx >= 0 ? (cols[bondTypeIdx] ?? "").trim() || undefined : undefined,
      jailTime: jailTimeIdx >= 0 ? (cols[jailTimeIdx] ?? "").trim() || undefined : undefined,
      bondAmount: bondAmountIdx >= 0 ? Number(cols[bondAmountIdx] ?? 0) || 0 : 0,
    });
  }
  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseJSON(text: string): SonoranRecord[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("JSON must be an array of penal code objects");
  return parsed.map((item: Record<string, unknown>) => ({
    code: String(item["code"] ?? "").trim(),
    title: String(item["title"] ?? "").trim(),
    type: item["type"] ? String(item["type"]).trim() : undefined,
    bondType: item["bondType"] ? String(item["bondType"]).trim() : undefined,
    jailTime: item["jailTime"] ? String(item["jailTime"]).trim() : undefined,
    bondAmount: item["bondAmount"] != null ? Number(item["bondAmount"]) || 0 : 0,
  }));
}

function toCSV(rows: PenalCode[]): string {
  const headers = ["code", "type", "title", "bondType", "jailTime", "bondAmount"];
  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const lines = rows.map((r) =>
    [
      escapeCSV(r.code),
      escapeCSV(r.type ?? ""),
      escapeCSV(r.title),
      escapeCSV(r.bond_type ?? ""),
      escapeCSV(r.jail_time ?? ""),
      String(r.bond_amount ?? 0),
    ].join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function typeClass(type: string | null) {
  if (!type) return "";
  const t = type.toLowerCase();
  if (t.includes("felony")) return "bg-destructive/15 text-destructive ring-destructive/30";
  if (t.includes("misdemeanor")) return "bg-warning/15 text-warning ring-warning/30";
  if (t.includes("infraction")) return "bg-primary/12 text-primary ring-primary/25";
  return "bg-muted text-muted-foreground ring-border";
}

function PenalCodesPage() {
  const { active } = useCad();
  const queryClient = useQueryClient();
  const logAudit = useAuditLogger();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<PenalCode | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"csv" | "json">("json");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createForm, setCreateForm] = useState({
    code: "",
    title: "",
    type: "",
    bond_type: "",
    jail_time: "",
    bond_amount: "0",
    category: "criminal",
    fine_min: "0",
    fine_max: "0",
    points: "0",
  });
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const communityId = active?.community_id;
  const queryKey = ["penal_codes", communityId];

  const isOwner =
    active?.role === "owner" || active?.communities?.owner_id === active?.user_id;

  const { data: codes = [], isLoading } = useQuery({
    queryKey,
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("penal_codes")
        .select("*")
        .eq("community_id", communityId!)
        .order("code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PenalCode[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!communityId) return;
    const channel = supabase
      .channel(`penal_codes-${communityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "penal_codes", filter: `community_id=eq.${communityId}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, queryClient]);

  function resetCreateForm() {
    setCreateForm({
      code: "",
      title: "",
      type: "",
      bond_type: "",
      jail_time: "",
      bond_amount: "0",
      category: "criminal",
      fine_min: "0",
      fine_max: "0",
      points: "0",
    });
  }

  const createCode = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("penal_codes").insert({
        community_id: communityId!,
        code: createForm.code,
        title: createForm.title,
        type: createForm.type || null,
        bond_type: createForm.bond_type || null,
        jail_time: createForm.jail_time || null,
        bond_amount: Number(createForm.bond_amount) || 0,
        category: createForm.category,
        fine_min: Number(createForm.fine_min) || 0,
        fine_max: Number(createForm.fine_max) || 0,
        points: Number(createForm.points) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      resetCreateForm();
      setCreateOpen(false);
      toast.success("Penal code added");
      void logAudit({
        action: "penal_code.create",
        entityType: "penal_code",
        communityId,
        details: { code: createForm.code, title: createForm.title },
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const updateCode = useMutation({
    mutationFn: async () => {
      if (!editRow) return;
      const { error } = await supabase
        .from("penal_codes")
        .update({
          code: editForm["code"],
          title: editForm["title"],
          type: editForm["type"] || null,
          bond_type: editForm["bond_type"] || null,
          jail_time: editForm["jail_time"] || null,
          bond_amount: Number(editForm["bond_amount"]) || 0,
          category: editForm["category"],
          fine_min: Number(editForm["fine_min"]) || 0,
          fine_max: Number(editForm["fine_max"]) || 0,
          points: Number(editForm["points"]) || 0,
        })
        .eq("id", editRow.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditOpen(false);
      setEditRow(null);
      toast.success("Penal code updated");
      void logAudit({
        action: "penal_code.update",
        entityType: "penal_code",
        entityId: editRow?.id,
        communityId,
        details: { code: editForm["code"], title: editForm["title"] },
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("penal_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey });
      setDeleteId(null);
      toast.success("Penal code removed");
      void logAudit({
        action: "penal_code.delete",
        entityType: "penal_code",
        entityId: id,
        communityId,
      });
    },
  });

  const importCodes = useMutation({
    mutationFn: async () => {
      let records: SonoranRecord[];
      try {
        records = importMode === "csv" ? parseCSV(importText) : parseJSON(importText);
      } catch (e) {
        throw new Error(
          e instanceof Error ? e.message : `Invalid ${importMode.toUpperCase()} format`,
        );
      }
      if (records.length === 0) throw new Error("No penal codes found in the import data");
      const invalid = records.filter((r) => !r.code || !r.title);
      if (invalid.length > 0) {
        throw new Error(`${invalid.length} record(s) are missing required "code" or "title" fields`);
      }

      const payload = records.map((r) => ({
        community_id: communityId!,
        code: r.code,
        title: r.title,
        type: r.type ?? null,
        bond_type: r.bondType ?? null,
        jail_time: r.jailTime ?? null,
        bond_amount: typeof r.bondAmount === "number" ? r.bondAmount : Number(r.bondAmount) || 0,
        category: "criminal",
      }));

      const { error } = await supabase.from("penal_codes").insert(payload);
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey });
      setImportOpen(false);
      setImportText("");
      setImportError(null);
      toast.success(`Imported ${count} penal code${count === 1 ? "" : "s"}`);
      void logAudit({
        action: "penal_code.import",
        entityType: "penal_code",
        communityId,
        details: { count, format: importMode },
      });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Import failed";
      setImportError(msg);
      toast.error(msg);
    },
  });

  function openEdit(row: PenalCode) {
    setEditRow(row);
    setEditForm({
      code: row.code,
      title: row.title,
      type: row.type ?? "",
      bond_type: row.bond_type ?? "",
      jail_time: row.jail_time ?? "",
      bond_amount: String(row.bond_amount ?? 0),
      category: row.category,
      fine_min: String(row.fine_min ?? 0),
      fine_max: String(row.fine_max ?? 0),
      points: String(row.points ?? 0),
    });
    setEditOpen(true);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setImportText(text);
      if (file.name.toLowerCase().endsWith(".csv")) {
        setImportMode("csv");
      } else {
        setImportMode("json");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function exportCSV() {
    if (codes.length === 0) {
      toast.error("No penal codes to export");
      return;
    }
    const csv = toCSV(codes);
    downloadFile(csv, "penal-codes.csv", "text/csv");
    void logAudit({
      action: "penal_code.export",
      entityType: "penal_code",
      communityId,
      details: { count: codes.length, format: "csv" },
    });
  }

  function exportJSON() {
    if (codes.length === 0) {
      toast.error("No penal codes to export");
      return;
    }
    const json = JSON.stringify(
      codes.map((c) => ({
        code: c.code,
        type: c.type ?? "",
        title: c.title,
        bondType: c.bond_type ?? "",
        jailTime: c.jail_time ?? "",
        bondAmount: c.bond_amount ?? 0,
      })),
      null,
      2,
    );
    downloadFile(json, "penal-codes.json", "application/json");
    void logAudit({
      action: "penal_code.export",
      entityType: "penal_code",
      communityId,
      details: { count: codes.length, format: "json" },
    });
  }

  if (!active) return null;

  const filtered = codes.filter((c) => {
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(needle) ||
      c.title.toLowerCase().includes(needle) ||
      (c.type ?? "").toLowerCase().includes(needle)
    );
  });

  const sampleJSON = `[
  {
    "code": "(2)06",
    "type": "Felony",
    "title": "Armed Robbery",
    "bondType": "Federal Bail Bond",
    "jailTime": "5-10 Years",
    "bondAmount": 20000
  }
]`;

  const sampleCSV = `code,type,title,bondType,jailTime,bondAmount
(2)06,Felony,Armed Robbery,Federal Bail Bond,5-10 Years,20000`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Penal Codes</h1>
          <p className="text-sm text-muted-foreground">
            {codes.length} code{codes.length === 1 ? "" : "s"} for {active.communities?.name}.
            {isOwner ? " Community owners can import, edit, and manage codes." : ""}
          </p>
        </div>
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={codes.length === 0}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={exportJSON} disabled={codes.length === 0}>
              <Download className="size-4" /> Export JSON
            </Button>
            <Dialog open={importOpen} onOpenChange={(open) => {
              setImportOpen(open);
              if (!open) setImportError(null);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="size-4" /> Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import penal codes</DialogTitle>
                  <DialogDescription>
                    Import SonoranCAD-compatible CSV or JSON. Existing codes are kept — imported
                    codes are added alongside them.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Format selector + file upload */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Tabs
                      value={importMode}
                      onValueChange={(v) => setImportMode(v as "csv" | "json")}
                    >
                      <TabsList>
                        <TabsTrigger value="json">JSON</TabsTrigger>
                        <TabsTrigger value="csv">CSV</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText className="size-4" /> Choose file
                    </Button>
                  </div>

                  {/* Format reference */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                    <p className="font-medium text-foreground">
                      Expected {importMode.toUpperCase()} format (SonoranCAD-compatible):
                    </p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                      {importMode === "json" ? sampleJSON : sampleCSV}
                    </pre>
                    <p className="mt-2 text-muted-foreground">
                      Required fields: <code className="font-mono">code</code>,{" "}
                      <code className="font-mono">title</code>. Optional:{" "}
                      <code className="font-mono">type</code>,{" "}
                      <code className="font-mono">bondType</code>,{" "}
                      <code className="font-mono">jailTime</code>,{" "}
                      <code className="font-mono">bondAmount</code>
                    </p>
                  </div>

                  {/* Paste area */}
                  <div className="space-y-1.5">
                    <Label htmlFor="import-text">
                      Paste {importMode.toUpperCase()} content or upload a file above
                    </Label>
                    <Textarea
                      id="import-text"
                      value={importText}
                      onChange={(e) => {
                        setImportText(e.target.value);
                        setImportError(null);
                      }}
                      placeholder={importMode === "json" ? sampleJSON : sampleCSV}
                      className="min-h-[200px] font-mono text-xs"
                    />
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      onClick={() => importCodes.mutate()}
                      disabled={importCodes.isPending || !importText.trim()}
                    >
                      {importCodes.isPending && <Loader2 className="size-4 animate-spin" />}
                      Import penal codes
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" /> New code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add penal code</DialogTitle>
                  <DialogDescription>
                    Manually add a single penal code entry.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createCode.mutate();
                  }}
                >
                  <PenalCodeFormFields form={createForm} setForm={setCreateForm} prefix="create" />
                  <DialogFooter>
                    <Button type="submit" disabled={createCode.isPending}>
                      {createCode.isPending && <Loader2 className="size-4 animate-spin" />}
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit penal code</DialogTitle>
            <DialogDescription>Update the penal code details.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateCode.mutate();
            }}
          >
            <PenalCodeFormFields form={editForm} setForm={setEditForm} prefix="edit" />
            <DialogFooter>
              <Button type="submit" disabled={updateCode.isPending}>
                {updateCode.isPending && <Loader2 className="size-4 animate-spin" />}
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
            <AlertDialogTitle>Delete this penal code?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The penal code will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteCode.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, title, or type…"
          className="pl-8"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          {search.trim()
            ? "No penal codes match your search."
            : "No penal codes yet. Import from CSV/JSON or add one manually."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Jail Time</th>
                <th className="px-4 py-2.5 text-right">Bond</th>
                {isOwner && <th className="px-4 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((code) => (
                <tr key={code.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">{code.code}</td>
                  <td className="px-4 py-2.5">{code.title}</td>
                  <td className="px-4 py-2.5">
                    {code.type ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ring-1 ${typeClass(code.type)}`}
                      >
                        {code.type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {code.jail_time ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {code.bond_amount > 0
                      ? `$${Number(code.bond_amount).toLocaleString()}`
                      : "—"}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label="Edit penal code"
                          onClick={() => openEdit(code)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete penal code"
                          onClick={() => setDeleteId(code.id)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PenalCodeFormFields({
  form,
  setForm,
  prefix,
}: {
  form: Record<string, string>;
  setForm: (v: Record<string, string>) => void;
  prefix: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-code`}>Code *</Label>
          <Input
            id={`${prefix}-code`}
            value={form["code"] ?? ""}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="VC-23152(a)"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-type`}>Charge type</Label>
          <Input
            id={`${prefix}-type`}
            value={form["type"] ?? ""}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            placeholder="Felony, Misdemeanor, Infraction…"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${prefix}-title`}>Title *</Label>
        <Input
          id={`${prefix}-title`}
          value={form["title"] ?? ""}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="DUI — Alcohol/Drugs"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-jail`}>Jail time</Label>
          <Input
            id={`${prefix}-jail`}
            value={form["jail_time"] ?? ""}
            onChange={(e) => setForm({ ...form, jail_time: e.target.value })}
            placeholder="5-10 Years"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-bond-type`}>Bond type</Label>
          <Input
            id={`${prefix}-bond-type`}
            value={form["bond_type"] ?? ""}
            onChange={(e) => setForm({ ...form, bond_type: e.target.value })}
            placeholder="State Bail Bond"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-bond-amt`}>Bond amount</Label>
          <Input
            id={`${prefix}-bond-amt`}
            type="number"
            value={form["bond_amount"] ?? "0"}
            onChange={(e) => setForm({ ...form, bond_amount: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-fine-min`}>Fine min</Label>
          <Input
            id={`${prefix}-fine-min`}
            type="number"
            value={form["fine_min"] ?? "0"}
            onChange={(e) => setForm({ ...form, fine_min: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-fine-max`}>Fine max</Label>
          <Input
            id={`${prefix}-fine-max`}
            type="number"
            value={form["fine_max"] ?? "0"}
            onChange={(e) => setForm({ ...form, fine_max: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
