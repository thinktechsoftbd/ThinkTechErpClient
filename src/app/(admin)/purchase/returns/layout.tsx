/** Purchase returns with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function PurchaseReturnsLayout({ children, modal }: LayoutProps<"/purchase/returns">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
