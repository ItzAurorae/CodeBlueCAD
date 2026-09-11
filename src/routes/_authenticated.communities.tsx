import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCad, DEPARTMENTS } from "@/lib/cad";
import { useAuditLogger } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/communities")({
  ssr: false,
  component: CommunitiesPage,
});

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function CommunitiesPage() {
  const { user } = useAuth();
  const { memberships, isLoading, refresh, setActive } = useCad();
  const navigate = useNavigate();
  const logAudit = useAuditLogger();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("police");
  const [callsign, setCallsign] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const code = randomCode();
      const { data, error } = await supabase
        .from("communities")
        .insert({ name, description: description || null, code, owner_id: user!.id })
        .select("id, code")
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase.from("community_members").insert({
        community_id: data.id,
        user_id: user!.id,
        department,
        callsign: callsign || "1-ADAM-1",
        rank: "Chief",
        role: "owner",
      });
      if (memberError) throw memberError;
      return data;
    },
    onSuccess: (data) => {
      refresh();
      setActive(data.id);
      toast.success(`Community created — join code ${data.code}`);
      setName("");
      setDescription("");
      void logAudit({
        action: "community.create",
        entityType: "community",
        entityId: data.id,
        communityId: data.id,
        details: { name, code: data.code },
      });
      navigate({ to: "/cad/dispatch" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create the community"),
  });

  const join = useMutation({
    mutationFn: async () => {
      const code = joinCode.trim().toUpperCase();
      const { data, error } = await supabase
        .from("communities")
        .select("id, name")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No community found with that join code");
      const { error: memberError } = await supabase.from("community_members").insert({
        community_id: data.id,
        user_id: user!.id,
        department,
        callsign: callsign || "1-ADAM-1",
      });
      if (memberError) throw memberError;
      return data;
    },
    onSuccess: (data) => {
      refresh();
      setActive(data.id);
      toast.success(`Joined ${data.name}`);
      setJoinCode("");
      void logAudit({
        action: "community.join",
        entityType: "community",
        entityId: data.id,
        communityId: data.id,
        details: { name: data.name },
      });
      navigate({ to: "/cad/dispatch" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not join that community"),
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <Link to="/" className="mb-8 inline-flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
          <Shield className="size-4" />
        </span>
        <span className="font-display text-sm font-bold">CodeBlueCAD</span>
      </Link>

      <h1 className="font-display text-2xl font-bold">Communities</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a department community or join an existing one with its code.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Your communities
        </h2>
        {isLoading ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : memberships.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            You're not in a community yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {memberships.map((m) => (
              <li key={m.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold">
                      {m.communities?.name ?? "Community"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Join code <span className="font-mono">{m.communities?.code}</span>
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {m.rank} · <span className="font-mono">{m.callsign}</span>
                    </p>
                  </div>
                  <Users className="size-4 text-muted-foreground" />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => {
                    setActive(m.community_id);
                    navigate({ to: "/cad/dispatch" });
                  }}
                >
                  Open terminal
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <h2 className="font-display text-base font-semibold">Your unit details</h2>
          <p className="text-sm text-muted-foreground">
            Used when you create or join a community.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="department">Department</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger id="department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="callsign">Callsign</Label>
          <Input
            id="callsign"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            placeholder="1-ADAM-1"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-4 rounded-lg border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div>
            <h2 className="font-display text-base font-semibold">Create a community</h2>
            <p className="text-sm text-muted-foreground">
              You become the owner and get a join code to share.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Community name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Los Santos County"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Whitelisted roleplay server"
            />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create community
          </Button>
        </form>

        <form
          className="space-y-4 rounded-lg border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            join.mutate();
          }}
        >
          <div>
            <h2 className="font-display text-base font-semibold">Join with a code</h2>
            <p className="text-sm text-muted-foreground">
              Ask an administrator for the six-character code.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Join code</Label>
            <Input
              id="code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
              placeholder="A1B2C3"
              className="font-mono uppercase"
            />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={join.isPending}>
            {join.isPending && <Loader2 className="size-4 animate-spin" />}
            Join community
          </Button>
        </form>
      </div>
    </div>
  );
}
