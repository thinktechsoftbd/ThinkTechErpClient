/** Purchase orders with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function PurchaseOrdersLayout({ children, modal }: LayoutProps<"/purchase/orders">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
