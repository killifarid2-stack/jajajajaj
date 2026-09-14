-- Production RLS verification checklist for broadcast_designs.
-- Run this against a staging project with four real authenticated test users.
-- Each user's JWT app_metadata.role must be exactly ADMIN/SUPERVISOR/OPERATOR/REFEREE.
-- Do NOT use service_role for these checks because it bypasses RLS.
-- Expected matrix:
-- ADMIN:      SELECT/INSERT/UPDATE/DELETE all designs.
-- SUPERVISOR: SELECT/INSERT/UPDATE/DELETE all designs.
-- OPERATOR:   SELECT all; INSERT/UPDATE only rows where updated_by = auth.uid().
-- REFEREE:    SELECT only published designs; no INSERT/UPDATE/DELETE.
-- ANON:       no access.
-- Also verify Operator cannot update another operator's draft, Referee cannot
-- read drafts, and anonymous sessions cannot mutate anything.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename='broadcast_designs'
order by policyname, cmd;
