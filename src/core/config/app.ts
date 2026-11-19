/** Client-safe application constants. Never put secrets here. */
export const appConfig = {
  /** The app's name in browser tab titles ("Dashboard | BizOneErp"). */
  name: "BizOneErp",
  shortName: "BE",
  /** The product the console is, as its logo shows it (src/assets/brand). */
  productName: "BizOne ERP",
  productSlogan: "Connect. Manage. Grow",
  description: "BizOne ERP administration console",
  loginPath: "/login",
  homePath: "/dashboard",
} as const;
