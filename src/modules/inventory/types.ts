// Contract of ThinkTechErpAPI's Inventory area (Areas/Inventory). JSON is camelCase; dates are
// "YYYY-MM-DD" (C# DateOnly) and timestamps ISO strings. Every call works in the organization
// chosen in the header (X-Organization-Id).

export const INVENTORY_VIEW_PERMISSION = "INVENTORY.V";
export const INVENTORY_MANAGE_PERMISSION = "INVENTORY.M";

export const UNIT_TYPES = ["Count", "Weight", "Volume", "Length", "Area", "Time", "Other"] as const;
export const WAREHOUSE_TYPES = ["Store", "Warehouse"] as const;
export const PRODUCT_TYPES = ["Stock", "NonStock", "Service"] as const;
export const TRACKING_TYPES = ["None", "Batch", "Serial"] as const;
export const ADJUSTMENT_REASONS = ["Damage", "Expired", "Lost", "InternalUse", "Sample", "Other"] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];
export type TrackingType = (typeof TRACKING_TYPES)[number];

export type Unit = {
  id: number;
  code: string;
  name: string;
  nameLocal: string | null;
  unitType: string;
  isoCode: string | null;
  allowDecimal: boolean;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type UnitUpsertRequest = {
  code: string;
  name: string;
  nameLocal: string | null;
  unitType: string;
  isoCode: string | null;
  allowDecimal: boolean;
  isActive: boolean;
};

export type Category = {
  id: number;
  parentCategoryId: number | null;
  parentName: string | null;
  code: string | null;
  name: string;
  nameLocal: string | null;
  /** "Fertilizer > Urea" */
  path: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type CategoryUpsertRequest = {
  parentCategoryId: number | null;
  code: string | null;
  name: string;
  nameLocal: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Brand = {
  id: number;
  name: string;
  nameLocal: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type BrandUpsertRequest = { name: string; nameLocal: string | null; isActive: boolean };

export type Warehouse = {
  id: number;
  code: string;
  name: string;
  nameLocal: string | null;
  warehouseType: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  isDefault: boolean;
  stockValue: number;
  createdAt: string;
  updatedAt: string | null;
};

export type WarehouseUpsertRequest = {
  code: string;
  name: string;
  nameLocal: string | null;
  warehouseType: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
};

export type InventorySetting = {
  /** False until saved once; the values are then the defaults. */
  isConfigured: boolean;
  baseCurrencyLookupDataId: number | null;
  baseCurrency: string | null;
  fiscalYearStartMonth: number;
  pricesIncludeTax: boolean;
  allowNegativeStock: boolean;
  requireApproval: boolean;
  expiryAlertDays: number;
  defaultWarehouseId: number | null;
  defaultWarehouseName: string | null;
  updatedAt: string | null;
};

export type InventorySettingUpdateRequest = {
  baseCurrencyLookupDataId: number;
  fiscalYearStartMonth: number;
  pricesIncludeTax: boolean;
  allowNegativeStock: boolean;
  requireApproval: boolean;
  expiryAlertDays: number;
  defaultWarehouseId: number | null;
};

export type ProductUnit = {
  unitId: number;
  unitCode: string;
  unitName: string;
  /** Base units in one of this unit (bag of urea = 50 kg). */
  conversionFactor: number;
  salePrice: number | null;
  isPurchaseDefault: boolean;
  isSaleDefault: boolean;
};

export type ProductBarcode = { unitId: number | null; unitCode: string | null; barcode: string };

export type Product = {
  id: number;
  objectId: string;
  code: string;
  name: string;
  nameLocal: string | null;
  productType: ProductType;
  categoryId: number | null;
  categoryName: string | null;
  brandId: number | null;
  brandName: string | null;
  baseUnitId: number;
  baseUnitCode: string;
  baseUnitAllowsDecimal: boolean;
  trackingType: TrackingType;
  hasExpiry: boolean;
  shelfLifeDays: number | null;
  genericName: string | null;
  registrationNo: string | null;
  hsCode: string | null;
  countryOfOrigin: string | null;
  purchaseTaxGroupId: number | null;
  purchaseTaxGroupName: string | null;
  saleTaxGroupId: number | null;
  lastPurchaseCost: number;
  salePrice: number;
  mrp: number | null;
  reorderLevel: number;
  reorderQuantity: number;
  attributes: Record<string, string>;
  imageUrl: string | null;
  isActive: boolean;
  /** Base units on hand in all warehouses. */
  stockQuantity: number;
  createdAt: string;
  updatedAt: string | null;
  /** Base unit first (factor 1). */
  units: ProductUnit[];
  barcodes: ProductBarcode[];
};

export type ProductUpsertRequest = {
  code: string;
  name: string;
  nameLocal: string | null;
  productType: ProductType;
  categoryId: number | null;
  brandId: number | null;
  baseUnitId: number;
  trackingType: TrackingType;
  hasExpiry: boolean;
  shelfLifeDays: number | null;
  genericName: string | null;
  registrationNo: string | null;
  hsCode: string | null;
  countryOfOrigin: string | null;
  purchaseTaxGroupId: number | null;
  saleTaxGroupId: number | null;
  salePrice: number;
  mrp: number | null;
  reorderLevel: number;
  reorderQuantity: number;
  attributes: Record<string, string> | null;
  imageUrl: string | null;
  isActive: boolean;
  /** Packs other than the base unit. */
  units: { unitId: number; conversionFactor: number; salePrice: number | null; isPurchaseDefault: boolean; isSaleDefault: boolean }[];
  barcodes: { unitId: number | null; barcode: string }[];
};

/** A product as a document line picks it (GET /api/inventory/products/lookup). */
export type ProductLookupItem = {
  id: number;
  code: string;
  name: string;
  nameLocal: string | null;
  productType: ProductType;
  trackingType: TrackingType;
  hasExpiry: boolean;
  baseUnitId: number;
  baseUnitCode: string;
  allowDecimal: boolean;
  purchaseTaxGroupId: number | null;
  saleTaxGroupId: number | null;
  lastPurchaseCost: number;
  /** Per base unit; a pack's own price is on its unit (units[].salePrice). */
  salePrice: number;
  /** Maximum retail price per base unit, where the pack prints one. */
  mrp: number | null;
  stockQuantity: number;
  /** Set when the search matched a barcode: that barcode and its pack. */
  matchedBarcode: string | null;
  matchedUnitId: number | null;
  units: ProductUnit[];
};

export type BatchStockItem = {
  batchId: number;
  batchNo: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  quantity: number;
  averageCost: number;
};

export type SerialStockItem = { serialNumberId: number; serialNo: string; batchId: number | null };

export type TaxGroupRateItem = {
  taxRateId: number;
  taxCode: string;
  taxName: string;
  taxType: string;
  ratePercent: number;
  isRecoverable: boolean;
  isCompound: boolean;
  sequenceNo: number;
};

export type TaxGroupOption = { id: number; name: string; isActive: boolean; rates: TaxGroupRateItem[] };

/** Everything the inventory forms pick from (GET /api/inventory/options). */
export type InventoryOptions = {
  units: Unit[];
  categories: Category[];
  brands: Brand[];
  warehouses: Warehouse[];
  taxGroups: TaxGroupOption[];
};

// ---- Stock documents

export type DocumentStatus = "Draft" | "Posted" | "Cancelled" | "InTransit" | "Received" | "InProgress";

/** One line of a stock document as entered. Quantity and unitCost are in unitId. */
export type StockLineRequest = {
  productId: number;
  unitId: number;
  /** Adjustments: negative removes stock. */
  quantity: number;
  batchId: number | null;
  batchNo: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  /** Cost per unitId of stock added (opening stock). */
  unitCost: number | null;
  serialNos: string[];
  remarks: string | null;
};

export type StockLine = {
  id: number;
  lineNo: number;
  productId: number;
  productCode: string;
  productName: string;
  trackingType: TrackingType;
  hasExpiry: boolean;
  unitId: number;
  unitCode: string;
  baseUnitCode: string;
  conversionFactor: number;
  quantity: number;
  baseQuantity: number;
  batchId: number | null;
  batchNo: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  /** Per base unit. */
  unitCost: number | null;
  remarks: string | null;
  serialNos: string[];
};

export type StockAdjustment = {
  id: number;
  adjustmentNo: string;
  adjustmentDate: string;
  warehouseId: number;
  warehouseName: string;
  reason: string;
  stockCountId: number | null;
  stockCountNo: string | null;
  status: "Draft" | "Posted" | "Cancelled";
  totalValue: number;
  lineCount: number;
  postedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
  lines: StockLine[];
};

export type StockAdjustmentUpsertRequest = {
  adjustmentDate: string;
  warehouseId: number;
  /** Opening for opening stock. */
  reason: string;
  remarks: string | null;
  lines: StockLineRequest[];
};

export type StockTransferLine = StockLine & { receivedBaseQuantity: number | null };

export type StockTransfer = {
  id: number;
  transferNo: string;
  transferDate: string;
  fromWarehouseId: number;
  fromWarehouseName: string;
  toWarehouseId: number;
  toWarehouseName: string;
  status: "Draft" | "InTransit" | "Received" | "Cancelled";
  totalValue: number;
  lineCount: number;
  dispatchedAt: string | null;
  receivedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
  lines: StockTransferLine[];
};

export type StockTransferUpsertRequest = {
  transferDate: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  remarks: string | null;
  lines: StockLineRequest[];
};

export type StockTransferReceiveRequest = { lines: { lineId: number; receivedBaseQuantity: number }[] };

export type StockCountLine = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  baseUnitCode: string;
  batchId: number | null;
  batchNo: string | null;
  expiryDate: string | null;
  systemQuantity: number;
  countedQuantity: number | null;
  differenceQuantity: number | null;
  unitCost: number;
  remarks: string | null;
};

export type StockCount = {
  id: number;
  countNo: string;
  countDate: string;
  warehouseId: number;
  warehouseName: string;
  categoryId: number | null;
  categoryName: string | null;
  status: "InProgress" | "Posted" | "Cancelled";
  lineCount: number;
  countedLineCount: number;
  differenceValue: number;
  stockAdjustmentId: number | null;
  stockAdjustmentNo: string | null;
  startedAt: string | null;
  postedAt: string | null;
  remarks: string | null;
  createdAt: string;
  lines: StockCountLine[];
};

export type StockCountCreateRequest = {
  countDate: string;
  warehouseId: number;
  categoryId: number | null;
  includeZeroStock: boolean;
  remarks: string | null;
};

export type StockCountUpdateRequest = {
  remarks: string | null;
  lines: { lineId: number; countedQuantity: number | null; remarks: string | null }[];
};

// ---- Reports

/** A page of report rows plus totals over all rows. */
export type ReportPage<T> = {
  items: T[];
  totalCount: number;
  limit: number;
  offset: number;
  totals: Record<string, number>;
};

export type StockOnHandRow = {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string | null;
  baseUnitCode: string;
  warehouseId: number | null;
  warehouseName: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  stockValue: number;
  reorderLevel: number;
  needsReorder: boolean;
};

export type StockCardEntry = {
  movementId: number;
  movementDate: string;
  movementType: string;
  documentType: string;
  documentId: number;
  documentNo: string;
  warehouseName: string;
  batchNo: string | null;
  quantityIn: number;
  quantityOut: number;
  unitCost: number;
  value: number;
  balance: number;
};

export type StockCard = {
  productId: number;
  productCode: string;
  productName: string;
  baseUnitCode: string;
  warehouseId: number | null;
  warehouseName: string | null;
  from: string;
  to: string;
  openingQuantity: number;
  openingValue: number;
  quantityIn: number;
  quantityOut: number;
  closingQuantity: number;
  closingValue: number;
  entries: StockCardEntry[];
};

export type StockValuationRow = {
  groupId: number | null;
  groupName: string;
  productCount: number;
  quantity: number;
  stockValue: number;
};

export type StockMovementRow = {
  id: number;
  movementDate: string;
  movementType: string;
  warehouseName: string;
  productId: number;
  productCode: string;
  productName: string;
  baseUnitCode: string;
  batchNo: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  documentType: string;
  documentId: number;
  documentNo: string;
  isReversal: boolean;
  createdAt: string;
};

export type ReorderRow = {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string | null;
  baseUnitCode: string;
  quantity: number;
  reorderLevel: number;
  reorderQuantity: number;
  suggestedQuantity: number;
  lastPurchaseCost: number;
};

export type ExpiryRow = {
  productId: number;
  productCode: string;
  productName: string;
  baseUnitCode: string;
  warehouseId: number;
  warehouseName: string;
  batchId: number;
  batchNo: string;
  expiryDate: string;
  /** Negative once expired. */
  daysLeft: number;
  quantity: number;
  stockValue: number;
};

export const MOVEMENT_TYPES = [
  "Opening",
  "PurchaseReceipt",
  "PurchaseReturn",
  "Sale",
  "SaleReturn",
  "TransferOut",
  "TransferIn",
  "AdjustmentIn",
  "AdjustmentOut",
  "CostAdjustment",
] as const;

/** Readable labels for enum-like values the API returns. */
export const LABELS: Record<string, string> = {
  NonStock: "Non-stock",
  InternalUse: "Internal use",
  CountDifference: "Count difference",
  InTransit: "In transit",
  InProgress: "In progress",
  PurchaseReceipt: "Purchase receipt",
  PurchaseReturn: "Purchase return",
  SaleReturn: "Sale return",
  TransferOut: "Transfer out",
  TransferIn: "Transfer in",
  AdjustmentIn: "Adjustment in",
  AdjustmentOut: "Adjustment out",
  CostAdjustment: "Cost adjustment",
  StockAdjustment: "Stock adjustment",
  StockTransfer: "Stock transfer",
  StockCount: "Stock count",
  GoodsReceipt: "Goods receipt",
  PurchaseInvoice: "Purchase invoice",
};

export const label = (value: string | null | undefined) => (value ? (LABELS[value] ?? value) : "—");
