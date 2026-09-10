import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCad, DEPARTMENTS } from "@/lib/cad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { active, refresh } = useCad();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [callsign, setCallsign] = useState("");
  const [rank, setRank] = useState("");
  const [department, setDepartment] = useState("police");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  useEffect(() => {
    if (!active) return;
    setCallsign(active.callsign);
    setRank(active.rank);
    setDepartment(active.department);
  }, [active]);

  const save = useMutation({
    mutationFn: async () => {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user!.id, display_name: displayName }, { onConflict: "id" });
      if (profileError) throw profileError;
      if (active) {
        const { error } = await supabase
          .from("community_members")
          .update({ callsign, rank, department })
          .eq("id", active.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      refresh();
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <Link
        to="/cad/dispatch"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to terminal
      </Link>

      <h1 className="mt-6 font-display text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your profile and unit details{active ? ` for ${active.communities?.name}` : ""}.
      </p>

      <form
        className="mt-8 space-y-5 rounded-lg border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} readOnly disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Officer J. Doe"
          />
        </div>

        {active ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="callsign">Callsign</Label>
              <Input
                id="callsign"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rank">Rank</Label>
              <Input id="rank" value={rank} onChange={(e) => setRank(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="dept">
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Join a community to set your callsign and department.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </form>
    </div>
  );
}
