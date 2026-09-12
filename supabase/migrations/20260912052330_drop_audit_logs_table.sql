/*
# Drop audit_logs table

The audit system has been redesigned. Audit events are now sent directly
to a Discord webhook as rich embeds — they are no longer stored in the
database. This removes the audit_logs table and all its policies.
*/

DROP TABLE IF EXISTS public.audit_logs CASCADE;
