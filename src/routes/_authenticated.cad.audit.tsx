import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCad } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/cad/audit")({
  ssr: false,
  component: AuditLogPage,
});

type AuditLog = {
  id: string;
  community_id: string | null;
  user_id: string | null;
  actor_email: string | null;
  actor_callsign: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

function actionColor(action: string): string {
  if (action.includes("delete") || action.includes("fail")) return "text-destructive";
  if (
    action.includes("create") ||
    action.includes("signin") ||
    action.includes("signup") ||
    action.includes("join")
  )
    return "text-success";
  if (action.includes("update") || action.includes("signout") || action.includes("status"))
    return "text-warning";
  return "text-primary";
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) return "";
  const entries = Object.entries(details).map(([k, v]) => {
    const val = typeof v === "string" ? v : JSON.stringify(v);
    return `${k}: ${val.length > 60 ? val.slice(0, 60) + "\u2026" : val}`;
  });
  return entries.join(", ");
}

function AuditLogPage() {
  const { active } = useCad();
  const communityId = active?.community_id;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("community_id", communityId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });

  if (!active) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Last 100 actions recorded in {active.communities?.name}. All entries are immutable and
          also forwarded to Discord.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-14 text-center">
          <ScrollText className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No audit entries yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium text-muted-foreground">Time</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Callsign</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Entity</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className={`p-3 font-mono text-xs font-medium ${actionColor(log.action)}`}>
                    {log.action}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {log.actor_callsign ?? log.actor_email?.split("@")[0] ?? "\u2014"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {log.entity_type ?? "\u2014"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground max-w-md truncate">
                    {formatDetails(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
