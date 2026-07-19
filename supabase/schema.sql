-- The Handyman — Phase 0 data model (Supabase / Postgres)
-- Run this in the Supabase SQL editor when connecting the backend.

create type public.user_role as enum ('user', 'artisan', 'admin');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.booking_status as enum (
  'requested',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'disputed'
);
create type public.escrow_status as enum ('held', 'released', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text unique not null,
  email text,
  role public.user_role not null default 'user',
  location text,
  created_at timestamptz not null default now()
);

create table public.artisan_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  trade text not null,
  bio text,
  service_area text,
  verification_status public.verification_status not null default 'pending',
  subscription_status text default 'none',
  average_rating numeric(3,2) default 0,
  jobs_completed integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisan_profiles (id) on delete cascade,
  ghana_card_url text,
  ghana_card_number text,
  police_report_url text,
  residence_proof_url text,
  guarantor_name text,
  guarantor_phone text,
  skills_evidence_urls text[],
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisan_profiles (id) on delete cascade,
  title text not null,
  description text,
  price_amount numeric(12,2) not null,
  price_unit text default 'job',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  artisan_id uuid not null references public.artisan_profiles (id),
  service_id uuid references public.services (id),
  location text,
  problem_description text,
  agreed_price numeric(12,2),
  status public.booking_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount numeric(12,2) not null,
  commission numeric(12,2) not null default 0,
  escrow_status public.escrow_status not null default 'held',
  paystack_reference text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  artisan_id uuid not null references public.artisan_profiles (id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisan_profiles (id) on delete cascade,
  plan text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payment_status text not null default 'pending',
  created_at timestamptz not null default now()
);
