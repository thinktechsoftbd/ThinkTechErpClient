// Contract of ThinkTechErpAPI's GET api/dashboard/overview (Areas/Dashboard). Dates are "YYYY-MM-DD"; amounts
// are in the base currency and count posted documents. A section is null when the user can't view its module.

export const DASHBOARD_PERIODS = [
  { value: "this-month", label: "This month", previous: "same days last month" },
  { value: "last-month", label: "Last month", previous: "the month before" },
  { value: "this-year", label: "This year", previous: "same days last year" },
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]["value"];

export type DashboardPoint = { date: string; amount: number };
export type DashboardShare = { name: string; amount: number };

export type DashboardOverview = {
  period: DashboardPeriod;
  from: string;
  to: string;
  axisTo: string;
  previousFrom: string;
  previousTo: string;
  previousAxisTo: string;
  today: string;
  granularity: "day" | "month";
  sales: {
    total: number;
    previousTotal: number;
    invoiceCount: number;
    series: DashboardPoint[];
    previousSeries: DashboardPoint[];
    byCategory: DashboardShare[];
  } | null;
  purchase: { total: number; previousTotal: number; invoiceCount: number; series: DashboardPoint[] } | null;
  warranty: {
    claims: number;
    previousClaims: number;
    activeCount: number;
    previousActiveCount: number;
    inWarranty: number;
    underClaim: number;
    expired: number;
    expiringSoon: {
      warrantyRegistrationId: number;
      warrantyNo: string;
      productName: string;
      productImageUrl: string | null;
      serialNo: string | null;
      customerName: string | null;
      endDate: string;
      daysLeft: number;
    }[];
  } | null;
  recentTransactions: {
    type: "Sale" | "Purchase" | "Warranty";
    id: number;
    date: string;
    referenceNo: string;
    partyName: string | null;
    amount: number | null;
    status: string;
  }[];
};
