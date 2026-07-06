-- Phase 5: Stripe billing linkage on profiles, plus column-level hardening
-- so a signed-in user can't grant themselves the "pro" plan (or forge
-- billing state) through a direct supabase-js call — only the webhook
-- (service-role key, bypasses RLS/grants) may write these fields. The
-- existing "own profile update" RLS policy is row-scoped only, so without
-- this, any authenticated user could `update({ plan: 'pro' })` their own row.

alter table public.profiles
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column subscription_status text;

create index profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id);

-- Lock down column-level write access for the authenticated role: users may
-- still update their own display_name, but plan/subscription fields are
-- webhook-only (service_role bypasses grants entirely, unaffected by this).
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
