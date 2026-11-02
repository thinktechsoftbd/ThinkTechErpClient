/** Goods receipts with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function GoodsReceiptsLayout({ children, modal }: LayoutProps<"/purchase/goods-receipts">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
