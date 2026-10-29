-- Add the ADN purchase exchange rate and update the function used by the API.
BEGIN;

ALTER TABLE sms.adn_purchases
    ADD COLUMN IF NOT EXISTS exchange_rate numeric(18, 6);

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_constraint
        WHERE conname = 'adn_purchases_exchange_rate_positive'
          AND conrelid = 'sms.adn_purchases'::regclass
    ) THEN
        ALTER TABLE sms.adn_purchases
            ADD CONSTRAINT adn_purchases_exchange_rate_positive
            CHECK (exchange_rate IS NULL OR exchange_rate > 0);
    END IF;
END;
$migration$;
CREATE OR REPLACE FUNCTION sms.record_adn_purchase
(
    p_sms_quantity bigint,
    p_provider_reference text DEFAULT NULL,
    p_amount_paid numeric DEFAULT NULL,
    p_currency char(3) DEFAULT NULL,
    p_exchange_rate numeric DEFAULT NULL,
    p_purchased_at timestamptz DEFAULT now(),
    p_note text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, sms
AS $function$
DECLARE
    v_platform_balance bigint;
    v_transaction_id bigint;
BEGIN
    IF p_sms_quantity IS NULL OR p_sms_quantity <= 0 THEN
        RAISE EXCEPTION 'SMS quantity must be greater than zero';
    END IF;
    IF p_exchange_rate IS NOT NULL AND p_exchange_rate <= 0 THEN
        RAISE EXCEPTION 'Exchange rate must be greater than zero';
    END IF;

    UPDATE sms.platform_wallet
       SET balance = balance + p_sms_quantity,
           total_purchased = total_purchased + p_sms_quantity,
           updated_at = now()
     WHERE wallet_id = 1
     RETURNING balance INTO v_platform_balance;

    INSERT INTO sms.balance_transactions
        (transaction_type, quantity, platform_delta, client_delta,
         platform_balance_after, provider_reference, note, created_at)
    VALUES
        ('purchase', p_sms_quantity, p_sms_quantity, 0,
         v_platform_balance, p_provider_reference, p_note, p_purchased_at)
    RETURNING transaction_id INTO v_transaction_id;

    INSERT INTO sms.adn_purchases
        (transaction_id, provider_reference, sms_quantity, amount_paid,
         currency, exchange_rate, purchased_at, note)
    VALUES
        (v_transaction_id, p_provider_reference, p_sms_quantity, p_amount_paid,
         p_currency, p_exchange_rate, p_purchased_at, p_note);

    RETURN v_transaction_id;
END;
$function$;
REVOKE ALL ON FUNCTION sms.record_adn_purchase(bigint, text, numeric, character, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sms.record_adn_purchase(bigint, text, numeric, character, numeric, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sms.record_adn_purchase(bigint, text, numeric, character, numeric, timestamptz, text) FROM sms_api_runtime;
GRANT EXECUTE ON FUNCTION sms.record_adn_purchase(bigint, text, numeric, character, numeric, timestamptz, text) TO sms_api_runtime;

COMMIT;