/** Client-safe application constants. Never put secrets here. */
export const appConfig = {
  name: "ThinkTechErp",
  shortName: "TT",
  /** The product the console is, as its logo shows it (src/assets/brand). */
  productName: "BizOne ERP",
  productSlogan: "Connect. Manage. Grow",
  description: "ThinkTech ERP administration console",
  loginPath: "/login",
  homePath: "/dashboard",
} as const;
