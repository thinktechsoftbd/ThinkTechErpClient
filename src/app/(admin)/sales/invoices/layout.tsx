/** Sales with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function SalesInvoicesLayout({ children, modal }: LayoutProps<"/sales/invoices">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
