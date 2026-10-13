-- Signup fees can be paid through Paystack: no manual payment method or proof upload for those rows.

ALTER TABLE signup_payments
  ALTER COLUMN method_id DROP NOT NULL,
  ALTER COLUMN proof_url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS signup_payments_paystack_reference_key
  ON signup_payments (reference) WHERE provider = 'paystack';

CREATE INDEX IF NOT EXISTS idx_paystack_transactions_user_purpose
  ON paystack_transactions (user_id, purpose);
