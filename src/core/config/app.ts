/** Client-safe application constants. Never put secrets here. */
export const appConfig = {
  name: "ThinkTechErp",
  shortName: "TT",
  description: "ThinkTech ERP administration console",
  loginPath: "/login",
  homePath: "/dashboard",
} as const;
