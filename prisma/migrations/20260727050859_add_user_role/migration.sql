-- Add nullable role column for role-based signup (Teacher/Student).
-- Additive only: no default, existing rows get NULL, no existing
-- query behavior changes. See docs/implementation/
-- ROLE_BASED_SIGNUP_IMPLEMENTATION_PLAN.md (Phase 0) for context.
ALTER TABLE "public"."users" ADD COLUMN "role" TEXT;
