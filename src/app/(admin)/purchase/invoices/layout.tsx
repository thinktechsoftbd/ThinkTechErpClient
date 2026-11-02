/** Purchase invoices with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function PurchaseInvoicesLayout({ children, modal }: LayoutProps<"/purchase/invoices">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
