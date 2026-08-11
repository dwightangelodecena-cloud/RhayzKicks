// Plain TS mirrors of the RHAYZKICKS Supabase (Postgres) schema.
// Mirrors supabase/SCHEMA.md — keep in sync when the schema changes.
// Consumed by the React web app; the Flutter app gets an equivalent set of Dart models
// in Rhayzkicks Mobile/lib/models/database_models.dart.

export type StaffRole = "staff" | "admin";
export type PaymentMethod = "cash" | "card" | "gcash" | "other";
export type SaleStatus = "completed" | "refunded" | "voided";
export type StockMovementType = "restock" | "sale" | "return" | "adjustment" | "damaged";
export type Gender = "men" | "women" | "unisex" | "kids";

export interface Staff {
  id: string; // == Supabase Auth user id
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  employeeId: string;
  dateHired: string; // date, "YYYY-MM-DD"
  isActive: boolean;
  createdAt: string; // timestamptz, ISO 8601
}

export interface Customer {
  id: string;
  authUserId: string | null; // null = no login (walk-in/staff-entered profile)
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  zipCode: string;
  loyaltyPoints: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  name: string;
  brand: string;
  category: string;
  gender: Gender;
  description: string;
  basePrice: number;
  costPrice: number;
  pointsValue: number; // loyalty points earned per unit purchased, set per model by staff/admin
  imageUrls: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemVariant {
  id: string;
  itemId: string;
  size: string;
  color: string;
  sku: string;
  priceOverride: number | null;
  isActive: boolean;
}

export interface InventoryRecord {
  sku: string;
  quantityOnHand: number;
  reorderLevel: number;
  isLowStock: boolean; // generated column
  lastRestockedAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

// Row shape of the inventory_detail view (inventory joined with item/variant names)
export interface InventoryDetail extends InventoryRecord {
  itemId: string;
  variantId: string;
  itemName: string;
  brand: string;
  size: string;
  color: string;
}

export interface StockMovement {
  id: string;
  sku: string;
  type: StockMovementType;
  quantityChange: number;
  quantityAfter: number;
  reason: string | null;
  saleId: string | null;
  staffId: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  orderNumber: string;
  customerId: string | null;
  staffId: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  createdAt: string;
}

// Row shape of the sales_detail view (sales joined with customer/staff names)
export interface SaleDetail extends Sale {
  customerName: string | null;
  staffName: string;
}

export interface SoldItem {
  id: string;
  saleId: string;
  itemId: string;
  variantId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number; // generated column
}

// Row shape of the sold_items_detail view
export interface SoldItemDetail extends SoldItem {
  saleDate: string;
  itemName: string;
  size: string;
  color: string;
}

// Params for the create_sale() RPC (see supabase/SCHEMA.md)
export interface CreateSaleLineItem {
  item_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
}

export interface CreateSaleParams {
  p_staff_id: string;
  p_customer_id: string | null;
  p_payment_method: PaymentMethod;
  p_discount: number;
  p_tax: number;
  p_line_items: CreateSaleLineItem[];
  p_voucher_id?: string | null;
}

// Mobile-only browsing: wishlist (no size needed) and cart (a specific
// size/sku — shared with the web app so staff can see it while building a
// sale; no checkout ever happens on mobile itself).
export interface WishlistItem {
  id: string;
  customerId: string;
  itemId: string;
  createdAt: string;
}

export interface CartItem {
  id: string;
  customerId: string;
  variantId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

// The reusable catalog of voucher options an admin curates — populates the
// customer's 100-point redemption pop-up and any future ad-hoc grant.
export interface VoucherTemplate {
  id: string;
  label: string;
  value: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
}

export type VoucherSource = "points_redemption" | "admin_grant";

export interface Voucher {
  id: string;
  code: string;
  customerId: string;
  templateId: string | null;
  value: number; // snapshotted from the template at issue time
  source: VoucherSource;
  issuedBy: string | null; // null for points_redemption (self-service)
  redeemed: boolean;
  redeemedAt: string | null;
  redeemedSaleId: string | null;
  createdAt: string;
}

// Params for the redeem_points() RPC — customer picks a voucher_templates
// option once they have >= 100 points.
export interface RedeemPointsParams {
  p_customer_id: string;
  p_template_id: string;
}

// Vendor management (supplier directory + purchase orders). See
// supabase/004_vendor_management.sql / SCHEMA.md.
export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseOrderStatus = "draft" | "ordered" | "shipped" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  staffId: string;
  status: PurchaseOrderStatus;
  orderDate: string; // date, "YYYY-MM-DD"
  expectedDate: string | null;
  receivedDate: string | null;
  totalCost: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// Row shape of the purchase_orders_detail view
export interface PurchaseOrderDetail extends PurchaseOrder {
  vendorName: string;
  vendorContactName: string;
  vendorPhone: string;
  staffName: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string | null; // null = a new/one-off item not yet in the catalog
  description: string;
  quantity: number;
  unitCost: number;
  lineTotal: number; // generated column
}

// Staff time tracking. See supabase/005_staff_time_tracking.sql / SCHEMA.md.
export interface StaffShift {
  id: string;
  staffId: string;
  clockIn: string;
  clockOut: string | null;
  durationHours: number | null; // generated column, null while still clocked in
  loggedBy: string; // who entered this record — self, or a manager logging for someone else
  notes: string;
  createdAt: string;
}

// Row shape of the staff_shifts_detail view
export interface StaffShiftDetail extends StaffShift {
  staffName: string;
}

// Online checkout (PayMongo). See supabase/011_online_orders.sql / SCHEMA.md.
// Separate lifecycle from Sale/SoldItem — a POS sale is always instantly
// completed by a staff member, an online order goes pending -> paid ->
// fulfilled, created and transitioned only by the create-paymongo-checkout /
// paymongo-webhook Edge Functions (service role, bypasses RLS).
export type OnlineOrderStatus = "pending" | "paid" | "cancelled" | "fulfilled";

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OnlineOrderStatus;
  paymentProvider: string;
  paymentReference: string | null;
  paymentMethod: string | null;
  subtotal: number;
  total: number;
  paidAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Row shape of the online_orders_detail view
export interface OnlineOrderDetail extends OnlineOrder {
  customerName: string;
  customerPhone: string;
}

export interface OnlineOrderItem {
  id: string;
  orderId: string;
  itemId: string;
  variantId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number; // generated column
}
