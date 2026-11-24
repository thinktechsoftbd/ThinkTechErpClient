/** Sales returns with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function SalesReturnsLayout({ children, modal }: LayoutProps<"/sales/returns">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
