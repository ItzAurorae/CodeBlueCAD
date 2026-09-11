# CodeBlueCAD rebuild roadmap

## Done
- [x] Database: profiles, communities, community_members, calls, bolos, civilians, vehicles, weapons, warrants, citations, incidents (+ RLS)
- [x] Dark design system, landing page, auth (email + Discord)
- [x] Auth gate + community context
- [x] Dispatch board `/cad/dispatch`, BOLOs `/cad/bolos`
- [x] Records `/cad/records` (civilians, vehicles, firearms, warrants)
- [x] Citations `/cad/citations`, Incidents `/cad/incidents`
- [x] Unit status roster `/cad/units` (realtime)
- [x] Communities `/communities` (create, join by code, switch)
- [x] Settings `/settings` (display name, callsign, rank, department)
- [x] Legal pages `/privacy` `/terms` `/security`
- [x] Audit logs system — `audit_logs` table, edge function with Discord webhook forwarding, client + server audit utilities
- [x] Audit logging integrated into auth, Discord OAuth, communities, dispatch, records, citations, incidents, settings, unit status
- [x] Audit log viewer `/cad/audit`
- [x] `/api-docs` public API reference

## Open
- [ ] Department-specific terminals (police/ems/fire/dot/judge) — currently one CAD terminal with a department field per unit
- [ ] Community admin tools (promote/remove members, invite links)
