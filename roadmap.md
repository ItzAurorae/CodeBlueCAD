# CodeBlueCAD rebuild roadmap

Source: Softgen project "CodeBlueCAD" (dark CAD terminal for police/EMS/fire).

## Done
- [x] Database: profiles, communities, community_members, calls, bolos, civilians, vehicles, weapons, warrants, citations, incidents (+ RLS scoped to community membership)
- [x] Dark design system (Space Grotesk / DM Sans, cyan-blue accent)
- [x] Landing page `/`
- [x] Auth page `/auth` (email + Google)
- [x] Auth gate + community context

## Pages to build (from user's route list)
- [ ] `/dashboard` — live dispatch board
- [ ] `/dashboard/community/$slug` — community overview by code
- [ ] `/police` `/ems` `/fire` `/dot` `/judge` — department terminals
- [ ] `/members` — unit status roster
- [ ] `/communities`, `/community/join`, `/community/admin`, `/community/$id/invite`
- [ ] `/settings` — profile, callsign, department
- [ ] `/privacy` `/terms` `/security` `/api-docs` `/403` `/404`

## Notes
- Discord sign-in from the original is not available; using email + Google.
- `/:id/:department` from the original list is covered by the named department routes.
