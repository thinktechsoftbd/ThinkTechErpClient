/** Stock transfers with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function StockTransfersLayout({ children, modal }: LayoutProps<"/inventory/transfers">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
