import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Plus, Radio, Trash2 } from "lucide-react";
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
  assigned_units: string[];
  created_at: string;
};

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
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

function DispatchBoard() {
  const { active } = useCad();
  const queryClient = useQueryClient();
  const communityId = active?.community_id;
  const logAudit = useAuditLogger();
  const [open, setOpen] = useState(false);
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
      if (variables.patch.status) {
        void logAudit({
          action: "call.update",
          entityType: "call",
          entityId: variables.id,
          details: { status: variables.patch.status },
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

  const openCalls = calls.filter((c) => c.status !== "closed");

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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : calls.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No calls on the board. Create the first one to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {calls.map((call) => (
            <li key={call.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${priorityClass(call.priority)}`}
                    >
                      P{call.priority}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{call.code}</span>
                    <h2 className="font-display text-base font-semibold">{call.title}</h2>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" /> {call.location}
                  </p>
                  {call.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {call.description}
                    </p>
                  )}
                  <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <Radio className="size-3.5 text-muted-foreground" />
                    {call.assigned_units?.length ? (
                      call.assigned_units.map((u) => (
                        <span
                          key={u}
                          className="rounded bg-secondary px-1.5 py-0.5 font-mono text-secondary-foreground"
                        >
                          {u}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No units attached</span>
                    )}
                  </p>
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
                    onClick={() => removeCall.mutate(call.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
