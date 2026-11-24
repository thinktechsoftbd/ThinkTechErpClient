/** Opening stock with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function OpeningStockLayout({ children, modal }: LayoutProps<"/inventory/opening-stock">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
