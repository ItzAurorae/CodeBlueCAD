import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Radio,
  TriangleAlert,
  Database,
  FileText,
  BadgeCheck,
  Users,
  Settings,
  Shield,
  LogOut,
  Siren,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UNIT_STATUSES, useCad } from "@/lib/cad";
import { useAuditLogger } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/_authenticated/cad")({
  ssr: false,
  component: CadLayout,
});

const nav = [
  { to: "/cad/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cad/dispatch", label: "Dispatch", icon: Radio },
  { to: "/cad/bolos", label: "BOLOs", icon: TriangleAlert },
  { to: "/cad/records", label: "Records", icon: Database },
  { to: "/cad/citations", label: "Citations", icon: FileText },
  { to: "/cad/incidents", label: "Incidents", icon: BadgeCheck },
  { to: "/cad/units", label: "Units", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function CadLayout() {
  const { user } = useAuth();
  const { active, memberships, setActive, isLoading } = useCad();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logAudit = useAuditLogger();
  const [panicOpen, setPanicOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && memberships.length === 0) navigate({ to: "/communities", replace: true });
  }, [isLoading, memberships.length, navigate]);

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("community_members")
        .update({ status })
        .eq("id", active!.id);
      if (error) throw error;
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit status updated");
      void logAudit({
        action: "unit.status",
        entityType: "unit",
        entityId: active!.id,
        details: { status },
      });
    },
  });

  const panic = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("community_members")
        .update({ status: "panic" })
        .eq("id", active!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      setPanicOpen(false);
      toast.error("PANIC ACTIVATED — all units notified");
      void logAudit({
        action: "unit.status",
        entityType: "unit",
        entityId: active!.id,
        details: { status: "panic", panic: true },
      });
    },
  });

  async function signOut() {
    void logAudit({ action: "auth.signout" });
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!active) return null;

  const isPanicking = active.status === "panic";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="flex flex-col gap-6 border-b border-border bg-sidebar p-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Shield className="size-4" />
          </span>
          <span className="font-display text-sm font-bold">CodeBlueCAD</span>
        </Link>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Community
          </p>
          <Select
            value={active.community_id}
            onValueChange={(v) => {
              setActive(v);
              void logAudit({
                action: "community.switch",
                communityId: v,
                details: { to: v },
              });
            }}
          >
            <SelectTrigger aria-label="Active community">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {memberships.map((m) => (
                <SelectItem key={m.community_id} value={m.community_id}>
                  {m.communities?.name ?? "Community"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link
            to="/communities"
            className="block text-xs text-primary underline-offset-2 hover:underline"
          >
            Manage communities
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
            >
              <item.icon className="size-4" /> {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
          {/* Panic button */}
          {isPanicking ? (
            <Button
              variant="destructive"
              size="sm"
              className="w-full animate-pulse"
              onClick={() => setStatus.mutate("available")}
              disabled={setStatus.isPending}
            >
              <Siren className="size-4" /> Clear panic
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => setPanicOpen(true)}
            >
              <Siren className="size-4" /> Panic
            </Button>
          )}

          {/* Panic confirmation */}
          <AlertDialog open={panicOpen} onOpenChange={setPanicOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Siren className="size-5 text-destructive" /> Activate panic?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately alert all units in {active.communities?.name}. Only use
                  this in a genuine emergency.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => panic.mutate()}
                  disabled={panic.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {panic.isPending ? "Activating…" : "Activate panic"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              My status
            </p>
            <Select value={active.status} onValueChange={(v) => setStatus.mutate(v)}>
              <SelectTrigger className="mt-1.5" aria-label="Unit status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="font-mono text-foreground">{active.callsign}</p>
            <p className="truncate">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 p-5 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
