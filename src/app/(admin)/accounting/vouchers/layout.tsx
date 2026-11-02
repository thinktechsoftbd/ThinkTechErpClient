/**
 * The vouchers pages with the @modal slot: from the list (or a voucher) New voucher and Edit open in a
 * popup over the page (@modal/(.)new, @modal/(.)[voucherId]/edit) instead of navigating away.
 */
export default function VouchersLayout({ children, modal }: LayoutProps<"/accounting/vouchers">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
