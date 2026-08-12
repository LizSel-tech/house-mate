CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('user', 'artisan', 'admin');
CREATE TYPE account_status AS ENUM ('pending_payment', 'active', 'suspended');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE booking_status AS ENUM (
  'requested',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'disputed'
);
CREATE TYPE escrow_status AS ENUM ('held', 'released', 'refunded');
CREATE TYPE otp_purpose AS ENUM ('login', 'signup');
CREATE TYPE payment_method_type AS ENUM ('mtn_momo', 'telecel_cash', 'bank_transfer', 'other');
CREATE TYPE signup_payment_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE kyc_status AS ENUM ('draft', 'pending', 'verified', 'rejected', 'error');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  role user_role NOT NULL DEFAULT 'user',
  location TEXT,
  account_status account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE artisan_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  trade TEXT NOT NULL DEFAULT 'plumber',
  bio TEXT,
  service_area TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  subscription_status TEXT NOT NULL DEFAULT 'none',
  average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  jobs_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES artisan_profiles (id) ON DELETE CASCADE,
  ghana_card_url TEXT,
  ghana_card_number TEXT,
  police_report_url TEXT,
  residence_proof_url TEXT,
  guarantor_name TEXT,
  guarantor_phone TEXT,
  skills_evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  status verification_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users (id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES artisan_profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_amount NUMERIC(12, 2) NOT NULL,
  price_unit TEXT NOT NULL DEFAULT 'job',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id),
  artisan_id UUID NOT NULL REFERENCES artisan_profiles (id),
  service_id UUID REFERENCES services (id),
  location TEXT,
  problem_description TEXT,
  agreed_price NUMERIC(12, 2),
  status booking_status NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  commission NUMERIC(12, 2) NOT NULL DEFAULT 0,
  escrow_status escrow_status NOT NULL DEFAULT 'held',
  paystack_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id),
  artisan_id UUID NOT NULL REFERENCES artisan_profiles (id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES artisan_profiles (id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose otp_purpose NOT NULL DEFAULT 'login',
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX otp_codes_phone_purpose_idx ON otp_codes (phone, purpose);

CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 12,
  subscription_fee NUMERIC(12, 2) NOT NULL DEFAULT 50,
  user_signup_fee NUMERIC(12, 2) NOT NULL DEFAULT 20,
  artisan_signup_fee NUMERIC(12, 2) NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type payment_method_type NOT NULL DEFAULT 'other',
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE signup_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  method_id UUID NOT NULL REFERENCES payment_methods (id),
  amount NUMERIC(12, 2) NOT NULL,
  role user_role NOT NULL,
  reference TEXT NOT NULL,
  proof_url TEXT NOT NULL,
  status signup_payment_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users (id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX signup_payments_status_created_at_idx ON signup_payments (status, created_at);
CREATE INDEX signup_payments_user_id_idx ON signup_payments (user_id);

CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  read_at TIMESTAMPTZ,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_notifications_read_at_created_at_idx ON admin_notifications (read_at, created_at);

CREATE TABLE kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES artisan_profiles (id) ON DELETE SET NULL,
  status kyc_status NOT NULL DEFAULT 'draft',
  provider TEXT NOT NULL DEFAULT 'smile_identity',
  provider_job_id TEXT,
  provider_user_id TEXT,
  ghana_card_number TEXT,
  first_name TEXT,
  last_name TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  liveness_image_urls TEXT[] NOT NULL DEFAULT '{}',
  extracted_fields JSONB,
  failure_reason TEXT,
  provider_raw_result JSONB,
  consent_granted_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX kyc_verifications_user_id_status_idx ON kyc_verifications (user_id, status);
CREATE INDEX kyc_verifications_provider_job_id_idx ON kyc_verifications (provider_job_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER platform_settings_set_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER payment_methods_set_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER signup_payments_set_updated_at
  BEFORE UPDATE ON signup_payments
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER kyc_verifications_set_updated_at
  BEFORE UPDATE ON kyc_verifications
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
