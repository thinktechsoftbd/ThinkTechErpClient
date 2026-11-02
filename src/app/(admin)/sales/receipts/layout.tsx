/** Customer receipts with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). */
export default function CustomerReceiptsLayout({ children, modal }: LayoutProps<"/sales/receipts">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
