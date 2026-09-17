import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Loader2,
  MapPin,
  Plus,
  Radio,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCad } from "@/lib/cad";
import { useAuditLogger } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/_authenticated/cad/dispatch")({
  ssr: false,
  component: DispatchBoard,
});

type Call = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  location: string;
  priority: number;
  status: string;
  disposition: string | null;
  assigned_units: string[];
  created_at: string;
};

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

const DISPOSITIONS = [
  { value: "", label: "No disposition" },
  { value: "arrest_made", label: "Arrest Made" },
  { value: "report_filed", label: "Report Filed" },
  { value: "citation_issued", label: "Citation Issued" },
  { value: "assisted", label: "Assisted" },
  { value: "unfounded", label: "Unfounded" },
  { value: "transferred", label: "Transferred" },
  { value: "gone_on_arrival", label: "Gone on Arrival" },
];

const PRIORITIES = [
  { value: "1", label: "Priority 1 — Emergency" },
  { value: "2", label: "Priority 2 — Urgent" },
  { value: "3", label: "Priority 3 — Routine" },
];

function priorityClass(priority: number) {
  if (priority === 1) return "bg-destructive/15 text-destructive ring-destructive/30";
  if (priority === 2) return "bg-warning/15 text-warning ring-warning/30";
  return "bg-primary/12 text-primary ring-primary/25";
}

function priorityBorder(priority: number) {
  if (priority === 1) return "border-l-destructive";
  if (priority === 2) return "border-l-warning";
  return "border-l-primary";
}

function statusClass(status: string) {
  if (status === "active") return "text-success";
  if (status === "closed") return "text-muted-foreground";
  return "text-warning";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function DispatchBoard() {
  const { active } = useCad();
  const queryClient = useQueryClient();
  const communityId = active?.community_id;
  const logAudit = useAuditLogger();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "10-70",
    title: "",
    location: "",
    priority: "3",
    description: "",
  });

  const queryKey = ["calls", communityId];

  const { data: calls = [], isLoading } = useQuery({
    queryKey,
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("community_id", communityId!)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Call[];
    },
  });

  useEffect(() => {
    if (!communityId) return;
    const channel = supabase
      .channel(`calls-${communityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls", filter: `community_id=eq.${communityId}` },
        () => queryClient.invalidateQueries({ queryKey: ["calls", communityId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, queryClient]);

  const createCall = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("calls").insert({
        community_id: communityId!,
        code: form.code || "10-70",
        title: form.title,
        location: form.location || "Unknown",
        priority: Number(form.priority),
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setForm({ code: "10-70", title: "", location: "", priority: "3", description: "" });
      setOpen(false);
      toast.success("Call created");
      void logAudit({
        action: "call.create",
        entityType: "call",
        details: { code: form.code, title: form.title, priority: Number(form.priority) },
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create call"),
  });

  const updateCall = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Call> }) => {
      const { error } = await supabase.from("calls").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey });
      if (variables.patch.status || variables.patch.disposition) {
        void logAudit({
          action: "call.update",
          entityType: "call",
          entityId: variables.id,
          details: {
            ...(variables.patch.status ? { status: variables.patch.status } : {}),
            ...(variables.patch.disposition ? { disposition: variables.patch.disposition } : {}),
          },
        });
      }
    },
  });

  const removeCall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey });
      setDeleteId(null);
      toast.success("Call cleared");
      void logAudit({
        action: "call.delete",
        entityType: "call",
        entityId: id,
      });
    },
  });

  if (!active) return null;
  const callsign = active.callsign;

  function toggleAssign(call: Call) {
    const units = call.assigned_units ?? [];
    const next = units.includes(callsign)
      ? units.filter((u) => u !== callsign)
      : [...units, callsign];
    updateCall.mutate({
      id: call.id,
      patch: {
        assigned_units: next,
        status: next.length && call.status === "pending" ? "active" : call.status,
      },
    });
    void logAudit({
      action: "call.assign",
      entityType: "call",
      entityId: call.id,
      details: { callsign, assigned: !units.includes(callsign) },
    });
  }

  function unassignUnit(call: Call, unit: string) {
    const next = call.assigned_units.filter((u) => u !== unit);
    updateCall.mutate({ id: call.id, patch: { assigned_units: next } });
    void logAudit({
      action: "call.assign",
      entityType: "call",
      entityId: call.id,
      details: { callsign: unit, assigned: false },
    });
  }

  const openCalls = calls.filter((c) => c.status !== "closed");
  const closedCalls = calls.filter((c) => c.status === "closed");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Live Dispatch Board</h1>
          <p className="text-sm text-muted-foreground">
            {openCalls.length} open call{openCalls.length === 1 ? "" : "s"} ·{" "}
            {active.communities?.name}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> New Call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create dispatch call</DialogTitle>
              <DialogDescription>Log a new call for units in this community.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createCall.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Call code</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="10-70"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Structure fire, two vehicles involved"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="4th & Vinewood"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Notes</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Caller reports heavy smoke…"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createCall.isPending}>
                  {createCall.isPending && <Loader2 className="size-4 animate-spin" />}
                  Dispatch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this call?</AlertDialogTitle>
            <AlertDialogDescription>
              The call will be permanently removed from the board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && removeCall.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : calls.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No calls on the board. Create the first one to get started.
        </p>
      ) : (
        <div className="space-y-6">
          {/* Active calls */}
          {openCalls.length > 0 && (
            <ul className="space-y-3">
              {openCalls.map((call) => (
                <li
                  key={call.id}
                  className={`rounded-xl border border-border border-l-4 bg-card p-4 sm:p-5 ${priorityBorder(call.priority)}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${priorityClass(call.priority)}`}
                        >
                          P{call.priority}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{call.code}</span>
                        <span className={`text-xs font-medium ${statusClass(call.status)}`}>
                          {call.status.toUpperCase()}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {timeAgo(call.created_at)}
                        </span>
                      </div>
                      <h2 className="mt-1.5 font-display text-base font-semibold">{call.title}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" /> {call.location}
                      </p>
                      {call.description && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {call.description}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <Radio className="size-3.5 text-muted-foreground" />
                        {call.assigned_units?.length ? (
                          call.assigned_units.map((u) => (
                            <span
                              key={u}
                              className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-secondary-foreground"
                            >
                              {u}
                              {u === callsign && (
                                <button
                                  type="button"
                                  onClick={() => unassignUnit(call, u)}
                                  className="ml-0.5 text-muted-foreground hover:text-destructive"
                                  aria-label={`Unassign ${u}`}
                                >
                                  <X className="size-3" />
                                </button>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">No units attached</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={call.status}
                        onValueChange={(v) => updateCall.mutate({ id: call.id, patch: { status: v } })}
                      >
                        <SelectTrigger className="w-32" aria-label="Call status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => toggleAssign(call)}>
                        {call.assigned_units?.includes(callsign) ? "Detach" : "Attach"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete call"
                        onClick={() => setDeleteId(call.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Disposition row for closed calls */}
                  {call.status === "closed" && (
                    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                      <span className="text-xs font-medium text-muted-foreground">Disposition:</span>
                      <Select
                        value={call.disposition ?? ""}
                        onValueChange={(v) =>
                          updateCall.mutate({
                            id: call.id,
                            patch: { disposition: v || null },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-44 text-xs" aria-label="Call disposition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISPOSITIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Closed calls */}
          {closedCalls.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Closed calls — {closedCalls.length}
              </h2>
              <ul className="space-y-2">
                {closedCalls.slice(0, 10).map((call) => (
                  <li
                    key={call.id}
                    className={`rounded-lg border border-border border-l-4 bg-card/50 p-3 ${priorityBorder(call.priority)}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${priorityClass(call.priority)}`}
                        >
                          P{call.priority}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{call.code}</span>
                        <span className="text-sm font-medium text-muted-foreground">
                          {call.title}
                        </span>
                        {call.disposition && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {call.disposition.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={call.disposition ?? ""}
                          onValueChange={(v) =>
                            updateCall.mutate({
                              id: call.id,
                              patch: { disposition: v || null },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-36 text-xs" aria-label="Call disposition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DISPOSITIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label="Delete call"
                          onClick={() => setDeleteId(call.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
