-- Update purchase metadata without changing SMS quantities or wallet balances.
BEGIN;

CREATE OR REPLACE FUNCTION sms.update_adn_purchase
(
    p_purchase_id bigint,
    p_provider_reference text,
    p_amount_paid numeric,
    p_currency char(3),
    p_exchange_rate numeric,
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
    IF p_purchase_id IS NULL OR p_purchase_id < 0 THEN
        RAISE EXCEPTION 'Purchase id must be greater than zero';
    END IF;
    IF p_provider_reference IS NULL OR length(btrim(p_provider_reference)) = 0 THEN
        RAISE EXCEPTION 'Provider is required';
    END IF;
    IF p_amount_paid IS NULL OR p_amount_paid < 0 THEN
        RAISE EXCEPTION 'Amount paid must be zero or greater';
    END IF;
    IF p_currency NOT IN ('BDT', 'USD') THEN
        RAISE EXCEPTION 'Currency must be BDT or USD';
    END IF;
    IF p_currency = 'USD' AND p_exchange_rate IS NULL THEN
        RAISE EXCEPTION 'Exchange rate is required for USD purchases';
    END IF;
    IF p_currency = 'BDT' AND p_exchange_rate IS NOT NULL THEN
        RAISE EXCEPTION 'Exchange rate is only used for USD purchases';
    END IF;
    IF p_exchange_rate IS NOT NULL AND p_exchange_rate <= 0 THEN
        RAISE EXCEPTION 'Exchange rate must be greater than zero';
    END IF;

    UPDATE sms.adn_purchases
       SET provider_reference = p_provider_reference,
           amount_paid = p_amount_paid,
           currency = p_currency,
           exchange_rate = p_exchange_rate,
           note = p_note
     WHERE purchase_id = p_purchase_id
     RETURNING transaction_id INTO v_transaction_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE sms.balance_transactions
       SET provider_reference = p_provider_reference,
           note = p_note
     WHERE transaction_id = v_transaction_id;

    RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION sms.update_adn_purchase(bigint, text, numeric, character, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sms.update_adn_purchase(bigint, text, numeric, character, numeric, text) TO sms_api_runtime;

COMMIT;