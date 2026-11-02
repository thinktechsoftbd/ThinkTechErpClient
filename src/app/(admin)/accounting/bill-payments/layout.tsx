/** Supplier bill payments with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function BillPaymentsLayout({ children, modal }: LayoutProps<"/accounting/bill-payments">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
