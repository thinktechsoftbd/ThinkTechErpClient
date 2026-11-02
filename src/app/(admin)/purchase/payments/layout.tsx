/** Supplier payments with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function SupplierPaymentsLayout({ children, modal }: LayoutProps<"/purchase/payments">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
