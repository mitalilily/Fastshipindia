DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_approval_status') THEN
    CREATE TYPE refund_approval_status AS ENUM ('pending', 'approved', 'declined');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS refund_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES b2c_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status refund_approval_status NOT NULL DEFAULT 'pending',
  reason VARCHAR(128) NOT NULL,
  source VARCHAR(80) NOT NULL,
  notes TEXT,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS refund_approval_order_source_reason_unique
  ON refund_approval_requests(order_id, source, reason);

CREATE INDEX IF NOT EXISTS refund_approval_status_created_at_idx
  ON refund_approval_requests(status, created_at DESC);
