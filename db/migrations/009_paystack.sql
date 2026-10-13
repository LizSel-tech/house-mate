-- Paystack: booking checkout transactions, provider payout accounts and escrow payouts (transfers).

CREATE TABLE IF NOT EXISTS paystack_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'booking',
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings (id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  commission NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending',
  access_code TEXT,
  channel TEXT,
  gateway_response TEXT,
  paid_at TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paystack_transactions_booking ON paystack_transactions (booking_id);

-- payout_status: none (not released yet) | pending | paid | failed | manual (paid outside Paystack)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS payout_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_reference TEXT,
  ADD COLUMN IF NOT EXISTS transfer_code TEXT,
  ADD COLUMN IF NOT EXISTS payout_error TEXT,
  ADD COLUMN IF NOT EXISTS paid_out_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS payments_transfer_reference_key
  ON payments (transfer_reference) WHERE transfer_reference IS NOT NULL;

UPDATE payments
   SET payout_status = 'manual',
       payout_amount = amount - commission
 WHERE escrow_status = 'released' AND payout_status = 'none';

ALTER TABLE artisan_profiles
  ADD COLUMN IF NOT EXISTS payout_type TEXT,
  ADD COLUMN IF NOT EXISTS payout_bank_code TEXT,
  ADD COLUMN IF NOT EXISTS payout_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_number TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_name TEXT,
  ADD COLUMN IF NOT EXISTS paystack_recipient_code TEXT,
  ADD COLUMN IF NOT EXISTS payout_updated_at TIMESTAMPTZ;
