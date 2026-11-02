/** Customer bill collections with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function BillCollectionsLayout({ children, modal }: LayoutProps<"/accounting/bill-collections">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
