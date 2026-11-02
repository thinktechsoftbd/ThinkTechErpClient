/** Stock adjustments with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function StockAdjustmentsLayout({ children, modal }: LayoutProps<"/inventory/adjustments">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
