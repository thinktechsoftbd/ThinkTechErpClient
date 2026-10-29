-- Add allocation finalization and metadata-edit support.
BEGIN;
DO $role$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'sms_api_runtime') THEN
        CREATE ROLE sms_api_runtime NOLOGIN;
    END IF;
END;
$role$;

GRANT USAGE ON SCHEMA sms TO sms_api_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA sms TO sms_api_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA sms
    GRANT SELECT ON TABLES TO sms_api_runtime;

ALTER TABLE sms.client_allocations
    ADD COLUMN IF NOT EXISTS is_finalize boolean NOT NULL DEFAULT false;
UPDATE sms.client_allocations SET is_finalize = false WHERE is_finalize IS NULL;
ALTER TABLE sms.client_allocations ALTER COLUMN is_finalize SET DEFAULT false;
ALTER TABLE sms.client_allocations ALTER COLUMN is_finalize SET NOT NULL;
CREATE OR REPLACE FUNCTION sms.allocate_sms
(
    p_client_id text,
    p_client_name text,
    p_sms_quantity bigint,
    p_note text DEFAULT NULL,
    p_is_finalized boolean DEFAULT false
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, sms
AS $function$
DECLARE
    v_platform_balance bigint;
    v_client_balance bigint;
    v_transaction_id bigint;
BEGIN
    IF p_client_id IS NULL OR length(btrim(p_client_id)) = 0 THEN
        RAISE EXCEPTION 'Client id must not be blank';
    END IF;
    IF p_client_name IS NULL OR length(btrim(p_client_name)) = 0 THEN
        RAISE EXCEPTION 'Client name must not be blank';
    END IF;
    IF p_sms_quantity IS NULL OR p_sms_quantity <= 0 THEN
        RAISE EXCEPTION 'SMS quantity must be greater than zero';
    END IF;

    -- Lock the shared pool first so concurrent allocations cannot overspend it.
    SELECT balance INTO v_platform_balance
      FROM sms.platform_wallet
     WHERE wallet_id = 1
     FOR UPDATE;

    IF v_platform_balance < p_sms_quantity THEN
        RAISE EXCEPTION 'Insufficient unallocated SMS balance: available %, requested %',
            v_platform_balance, p_sms_quantity;
    END IF;

    INSERT INTO sms.clients (client_id, display_name)
    VALUES (p_client_id, p_client_name)
    ON CONFLICT (client_id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            updated_at = now();

    INSERT INTO sms.client_wallets (client_id)
    VALUES (p_client_id)
    ON CONFLICT (client_id) DO NOTHING;

    SELECT balance INTO v_client_balance
      FROM sms.client_wallets
     WHERE client_id = p_client_id
     FOR UPDATE;

    UPDATE sms.platform_wallet
       SET balance = balance - p_sms_quantity,
           updated_at = now()
     WHERE wallet_id = 1
     RETURNING balance INTO v_platform_balance;

    UPDATE sms.client_wallets
       SET balance = balance + p_sms_quantity,
           total_allocated = total_allocated + p_sms_quantity,
           updated_at = now()
     WHERE client_id = p_client_id
     RETURNING balance INTO v_client_balance;

    INSERT INTO sms.balance_transactions
        (transaction_type, quantity, client_id, platform_delta, client_delta,
         platform_balance_after, client_balance_after, note)
    VALUES
        ('allocation', p_sms_quantity, p_client_id, -p_sms_quantity, p_sms_quantity,
         v_platform_balance, v_client_balance, p_note)
    RETURNING transaction_id INTO v_transaction_id;

    INSERT INTO sms.client_allocations (transaction_id, client_id, sms_quantity, note, is_finalize)
    VALUES (v_transaction_id, p_client_id, p_sms_quantity, p_note, p_is_finalized);

    RETURN v_transaction_id;
END;
$function$;
CREATE OR REPLACE FUNCTION sms.update_allocation_note
(
    p_allocation_id bigint,
    p_note text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, sms
AS $function$
DECLARE
    v_transaction_id bigint;
BEGIN
    UPDATE sms.client_allocations
       SET note = p_note
     WHERE allocation_id = p_allocation_id
     RETURNING transaction_id INTO v_transaction_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE sms.balance_transactions
       SET note = p_note
     WHERE transaction_id = v_transaction_id;

    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION sms.finalize_allocation
(
    p_allocation_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, sms
AS $function$
DECLARE
    v_rows_updated bigint;
BEGIN
    UPDATE sms.client_allocations
       SET is_finalize = true
     WHERE allocation_id = p_allocation_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RETURN v_rows_updated > 0;
END;
$function$;

REVOKE ALL ON FUNCTION sms.allocate_sms(text, text, bigint, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sms.allocate_sms(text, text, bigint, text, boolean) TO sms_api_runtime;
REVOKE ALL ON FUNCTION sms.update_allocation_note(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sms.update_allocation_note(bigint, text) TO sms_api_runtime;
REVOKE ALL ON FUNCTION sms.finalize_allocation(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sms.finalize_allocation(bigint) TO sms_api_runtime;

COMMIT;