// Shared Postgres row shapes for the RHAYZKICKS shoe shop system.
// Mirrors supabase/SCHEMA.md and web/src/types/database.types.ts — keep all three in sync.
//
// Each model's fromMap() takes the raw Map<String, dynamic> row returned by
// supabase_flutter (postgrest-dart already decodes JSON into this shape —
// no DocumentSnapshot/Timestamp involved like the old Firestore models).

class Staff {
  final String id; // == Supabase Auth user id
  final String fullName;
  final String email;
  final String phone;
  final String role; // staff | admin
  final String employeeId;
  final DateTime dateHired;
  final bool isActive;
  final DateTime createdAt;

  Staff({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    required this.employeeId,
    required this.dateHired,
    required this.isActive,
    required this.createdAt,
  });

  bool get isAdmin => role == 'admin';

  factory Staff.fromMap(Map<String, dynamic> row) => Staff(
        id: row['id'] ?? '',
        fullName: row['full_name'] ?? '',
        email: row['email'] ?? '',
        phone: row['phone'] ?? '',
        role: row['role'] ?? 'staff',
        employeeId: row['employee_id'] ?? '',
        dateHired: DateTime.parse(row['date_hired']),
        isActive: row['is_active'] ?? true,
        createdAt: DateTime.parse(row['created_at']),
      );
}

// hero_slides — the "Hero & Banners" web admin tab writes here; the mobile
// home screen's carousel and the web homepage both read the same rows.
class HeroSlide {
  final String id;
  final String eyebrow;
  final String headline;
  final String subtext;
  final String imageUrl;
  final String primaryCtaLabel;
  final String primaryCtaLink;
  final String? secondaryCtaLabel;
  final String? secondaryCtaLink;

  HeroSlide({
    required this.id,
    required this.eyebrow,
    required this.headline,
    required this.subtext,
    required this.imageUrl,
    required this.primaryCtaLabel,
    required this.primaryCtaLink,
    this.secondaryCtaLabel,
    this.secondaryCtaLink,
  });

  factory HeroSlide.fromMap(Map<String, dynamic> row) => HeroSlide(
        id: row['id'] ?? '',
        eyebrow: row['eyebrow'] ?? '',
        headline: row['headline'] ?? '',
        subtext: row['subtext'] ?? '',
        imageUrl: row['image_url'] ?? '',
        primaryCtaLabel: row['primary_cta_label'] ?? '',
        primaryCtaLink: row['primary_cta_link'] ?? '/collections',
        secondaryCtaLabel: row['secondary_cta_label'],
        secondaryCtaLink: row['secondary_cta_link'],
      );
}

// promo_banner_settings — the homepage membership promo banner, same
// singleton row the web admin's "Promotional Banner" card manages.
class PromoBannerContent {
  final String? imageUrl;
  final String label;
  final String headline;
  final String subtext;
  final String primaryCtaLabel;
  final String primaryCtaLink;
  final String? secondaryCtaLabel;
  final String? secondaryCtaLink;

  PromoBannerContent({
    this.imageUrl,
    required this.label,
    required this.headline,
    required this.subtext,
    required this.primaryCtaLabel,
    required this.primaryCtaLink,
    this.secondaryCtaLabel,
    this.secondaryCtaLink,
  });

  factory PromoBannerContent.fromMap(Map<String, dynamic> row) => PromoBannerContent(
        imageUrl: (row['image_url'] as String?)?.isNotEmpty == true ? row['image_url'] as String : null,
        label: row['label'] ?? '',
        headline: row['headline'] ?? '',
        subtext: row['subtext'] ?? '',
        primaryCtaLabel: row['primary_cta_label'] ?? '',
        primaryCtaLink: row['primary_cta_link'] ?? '/join',
        secondaryCtaLabel: row['secondary_cta_label'],
        secondaryCtaLink: row['secondary_cta_link'],
      );
}

// announcements — the top ticker strip, same rows the web header ticker reads.
class Announcement {
  final String id;
  final String message;

  Announcement({required this.id, required this.message});

  factory Announcement.fromMap(Map<String, dynamic> row) => Announcement(
        id: row['id'] ?? '',
        message: row['message'] ?? '',
      );
}

// collections — the "Featured Collections" grid, same rows the web admin's
// Collections tab manages and web's FeaturedCollections.tsx reads.
class Collection {
  final String id;
  final String slug;
  final String tag;
  final String title;
  final String description;
  final String? imageUrl;
  final String ctaLabel;
  final String size; // 'regular' | 'wide'

  Collection({
    required this.id,
    required this.slug,
    required this.tag,
    required this.title,
    required this.description,
    required this.ctaLabel,
    required this.size,
    this.imageUrl,
  });

  bool get isWide => size == 'wide';

  factory Collection.fromMap(Map<String, dynamic> row) => Collection(
        id: row['id'] ?? '',
        slug: row['slug'] ?? '',
        tag: row['tag'] ?? '',
        title: row['title'] ?? '',
        description: row['description'] ?? '',
        imageUrl: (row['image_url'] as String?)?.isNotEmpty == true ? row['image_url'] as String : null,
        ctaLabel: row['cta_label'] ?? 'Shop Now',
        size: row['size'] ?? 'regular',
      );
}

// nav_categories — the storefront nav/drawer links, same rows the web
// admin's "Categories" tab manages.
class NavCategory {
  final String slug;
  final String label;
  final String? imageUrl;

  NavCategory({required this.slug, required this.label, this.imageUrl});

  factory NavCategory.fromMap(Map<String, dynamic> row) => NavCategory(
        slug: row['slug'] ?? '',
        label: row['label'] ?? '',
        imageUrl: (row['image_url'] as String?)?.isNotEmpty == true ? row['image_url'] as String : null,
      );
}

// items — the product catalog, same rows the web admin's "Products" tab
// manages. Mirrors web's Product interface in web/src/lib/storeData.ts.
class Product {
  final String id;
  final String name;
  final String brand;
  final num price;
  final String category;
  final String gender; // men | women | unisex | kids
  final String? imageUrl;
  final bool isNew;
  final String description;

  Product({
    required this.id,
    required this.name,
    required this.brand,
    required this.price,
    required this.category,
    required this.gender,
    required this.isNew,
    required this.description,
    this.imageUrl,
  });

  factory Product.fromMap(Map<String, dynamic> row) {
    final imageUrls = row['image_urls'] as List?;
    final createdAt = row['created_at'] != null ? DateTime.tryParse(row['created_at']) : null;
    final isNew = createdAt != null && DateTime.now().difference(createdAt).inDays <= 30;
    return Product(
      id: row['id'] ?? '',
      name: row['name'] ?? '',
      brand: row['brand'] ?? '',
      price: row['base_price'] ?? 0,
      category: row['category'] ?? '',
      gender: row['gender'] ?? 'unisex',
      description: row['description'] ?? '',
      imageUrl: (imageUrls != null && imageUrls.isNotEmpty) ? imageUrls.first as String : null,
      isNew: isNew,
    );
  }
}

// item_variants + inventory — one purchasable size/color combo for a product.
class ProductVariant {
  final String id;
  final String size;
  final String color;
  final String sku;
  final int quantityOnHand;

  ProductVariant({required this.id, required this.size, required this.color, required this.sku, required this.quantityOnHand});
}

// A single product's full detail: base fields plus its variants and
// per-colorway gallery/swatch, same shape as web's ProductDetail.
class ProductDetail extends Product {
  final List<ProductVariant> variants;
  final Map<String, List<String>> galleryByColor;
  final Map<String, String> swatchByColor;

  ProductDetail({
    required super.id,
    required super.name,
    required super.brand,
    required super.price,
    required super.category,
    required super.gender,
    required super.isNew,
    required super.description,
    super.imageUrl,
    required this.variants,
    required this.galleryByColor,
    required this.swatchByColor,
  });
}

class Customer {
  final String id;
  final String? authUserId; // null = no login (walk-in/staff-entered profile)
  final String fullName;
  final String email;
  final String phone;
  final String street;
  final String city;
  final String province;
  final String zipCode;
  final int loyaltyPoints;
  final num totalPurchases;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  Customer({
    required this.id,
    required this.authUserId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.street,
    required this.city,
    required this.province,
    required this.zipCode,
    required this.loyaltyPoints,
    required this.totalPurchases,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Customer.fromMap(Map<String, dynamic> row) => Customer(
        id: row['id'] ?? '',
        authUserId: row['auth_user_id'],
        fullName: row['full_name'] ?? '',
        email: row['email'] ?? '',
        phone: row['phone'] ?? '',
        street: row['street'] ?? '',
        city: row['city'] ?? '',
        province: row['province'] ?? '',
        zipCode: row['zip_code'] ?? '',
        loyaltyPoints: row['loyalty_points'] ?? 0,
        totalPurchases: row['total_purchases'] ?? 0,
        isActive: row['is_active'] ?? true,
        createdAt: DateTime.parse(row['created_at']),
        updatedAt: DateTime.parse(row['updated_at']),
      );
}

class Item {
  final String id;
  final String name;
  final String brand;
  final String category;
  final String gender; // men | women | unisex | kids
  final String description;
  final num basePrice;
  final num costPrice;
  final int pointsValue; // loyalty points earned per unit purchased, set per model by staff/admin
  final List<String> imageUrls;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  Item({
    required this.id,
    required this.name,
    required this.brand,
    required this.category,
    required this.gender,
    required this.description,
    required this.basePrice,
    required this.costPrice,
    required this.pointsValue,
    required this.imageUrls,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Item.fromMap(Map<String, dynamic> row) => Item(
        id: row['id'] ?? '',
        name: row['name'] ?? '',
        brand: row['brand'] ?? '',
        category: row['category'] ?? '',
        gender: row['gender'] ?? 'unisex',
        description: row['description'] ?? '',
        basePrice: row['base_price'] ?? 0,
        costPrice: row['cost_price'] ?? 0,
        pointsValue: row['points_value'] ?? 0,
        imageUrls: List<String>.from(row['image_urls'] ?? []),
        isActive: row['is_active'] ?? true,
        createdAt: DateTime.parse(row['created_at']),
        updatedAt: DateTime.parse(row['updated_at']),
      );
}

class ItemVariant {
  final String id;
  final String itemId;
  final String size;
  final String color;
  final String sku;
  final num? priceOverride;
  final bool isActive;

  ItemVariant({
    required this.id,
    required this.itemId,
    required this.size,
    required this.color,
    required this.sku,
    required this.priceOverride,
    required this.isActive,
  });

  factory ItemVariant.fromMap(Map<String, dynamic> row) => ItemVariant(
        id: row['id'] ?? '',
        itemId: row['item_id'] ?? '',
        size: row['size'] ?? '',
        color: row['color'] ?? '',
        sku: row['sku'] ?? '',
        priceOverride: row['price_override'],
        isActive: row['is_active'] ?? true,
      );
}

class InventoryRecord {
  final String sku;
  final int quantityOnHand;
  final int reorderLevel;
  final bool isLowStock; // generated column
  final DateTime? lastRestockedAt;
  final DateTime updatedAt;
  final String? updatedBy;

  InventoryRecord({
    required this.sku,
    required this.quantityOnHand,
    required this.reorderLevel,
    required this.isLowStock,
    required this.lastRestockedAt,
    required this.updatedAt,
    required this.updatedBy,
  });

  factory InventoryRecord.fromMap(Map<String, dynamic> row) => InventoryRecord(
        sku: row['sku'] ?? '',
        quantityOnHand: row['quantity_on_hand'] ?? 0,
        reorderLevel: row['reorder_level'] ?? 0,
        isLowStock: row['is_low_stock'] ?? false,
        lastRestockedAt:
            row['last_restocked_at'] != null ? DateTime.parse(row['last_restocked_at']) : null,
        updatedAt: DateTime.parse(row['updated_at']),
        updatedBy: row['updated_by'],
      );
}

/// Row shape of the `inventory_detail` view (inventory joined with item/variant names).
class InventoryDetail extends InventoryRecord {
  final String itemId;
  final String variantId;
  final String itemName;
  final String brand;
  final String size;
  final String color;

  InventoryDetail({
    required super.sku,
    required super.quantityOnHand,
    required super.reorderLevel,
    required super.isLowStock,
    required super.lastRestockedAt,
    required super.updatedAt,
    required super.updatedBy,
    required this.itemId,
    required this.variantId,
    required this.itemName,
    required this.brand,
    required this.size,
    required this.color,
  });

  factory InventoryDetail.fromMap(Map<String, dynamic> row) => InventoryDetail(
        sku: row['sku'] ?? '',
        quantityOnHand: row['quantity_on_hand'] ?? 0,
        reorderLevel: row['reorder_level'] ?? 0,
        isLowStock: row['is_low_stock'] ?? false,
        lastRestockedAt:
            row['last_restocked_at'] != null ? DateTime.parse(row['last_restocked_at']) : null,
        updatedAt: DateTime.parse(row['updated_at']),
        updatedBy: row['updated_by'],
        itemId: row['item_id'] ?? '',
        variantId: row['variant_id'] ?? '',
        itemName: row['item_name'] ?? '',
        brand: row['brand'] ?? '',
        size: row['size'] ?? '',
        color: row['color'] ?? '',
      );
}

class StockMovement {
  final String id;
  final String sku;
  final String type; // restock | sale | return | adjustment | damaged
  final int quantityChange;
  final int quantityAfter;
  final String? reason;
  final String? saleId;
  final String staffId;
  final DateTime createdAt;

  StockMovement({
    required this.id,
    required this.sku,
    required this.type,
    required this.quantityChange,
    required this.quantityAfter,
    required this.reason,
    required this.saleId,
    required this.staffId,
    required this.createdAt,
  });

  factory StockMovement.fromMap(Map<String, dynamic> row) => StockMovement(
        id: row['id'] ?? '',
        sku: row['sku'] ?? '',
        type: row['type'] ?? 'adjustment',
        quantityChange: row['quantity_change'] ?? 0,
        quantityAfter: row['quantity_after'] ?? 0,
        reason: row['reason'],
        saleId: row['sale_id'],
        staffId: row['staff_id'] ?? '',
        createdAt: DateTime.parse(row['created_at']),
      );
}

class Sale {
  final String id;
  final String orderNumber;
  final String? customerId;
  final String staffId;
  final DateTime saleDate;
  final num subtotal;
  final num discount;
  final num tax;
  final num total;
  final String paymentMethod; // cash | card | gcash | other
  final String status; // completed | refunded | voided
  final DateTime createdAt;

  Sale({
    required this.id,
    required this.orderNumber,
    required this.customerId,
    required this.staffId,
    required this.saleDate,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    required this.paymentMethod,
    required this.status,
    required this.createdAt,
  });

  factory Sale.fromMap(Map<String, dynamic> row) => Sale(
        id: row['id'] ?? '',
        orderNumber: row['order_number'] ?? '',
        customerId: row['customer_id'],
        staffId: row['staff_id'] ?? '',
        saleDate: DateTime.parse(row['sale_date']),
        subtotal: row['subtotal'] ?? 0,
        discount: row['discount'] ?? 0,
        tax: row['tax'] ?? 0,
        total: row['total'] ?? 0,
        paymentMethod: row['payment_method'] ?? 'cash',
        status: row['status'] ?? 'completed',
        createdAt: DateTime.parse(row['created_at']),
      );
}

/// Row shape of the `sales_detail` view (sales joined with customer/staff names).
class SaleDetail extends Sale {
  final String? customerName;
  final String staffName;

  SaleDetail({
    required super.id,
    required super.orderNumber,
    required super.customerId,
    required super.staffId,
    required super.saleDate,
    required super.subtotal,
    required super.discount,
    required super.tax,
    required super.total,
    required super.paymentMethod,
    required super.status,
    required super.createdAt,
    required this.customerName,
    required this.staffName,
  });

  factory SaleDetail.fromMap(Map<String, dynamic> row) => SaleDetail(
        id: row['id'] ?? '',
        orderNumber: row['order_number'] ?? '',
        customerId: row['customer_id'],
        staffId: row['staff_id'] ?? '',
        saleDate: DateTime.parse(row['sale_date']),
        subtotal: row['subtotal'] ?? 0,
        discount: row['discount'] ?? 0,
        tax: row['tax'] ?? 0,
        total: row['total'] ?? 0,
        paymentMethod: row['payment_method'] ?? 'cash',
        status: row['status'] ?? 'completed',
        createdAt: DateTime.parse(row['created_at']),
        customerName: row['customer_name'],
        staffName: row['staff_name'] ?? '',
      );
}

class SoldItem {
  final String id;
  final String saleId;
  final String itemId;
  final String variantId;
  final String sku;
  final int quantity;
  final num unitPrice;
  final num lineTotal; // generated column

  SoldItem({
    required this.id,
    required this.saleId,
    required this.itemId,
    required this.variantId,
    required this.sku,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
  });

  factory SoldItem.fromMap(Map<String, dynamic> row) => SoldItem(
        id: row['id'] ?? '',
        saleId: row['sale_id'] ?? '',
        itemId: row['item_id'] ?? '',
        variantId: row['variant_id'] ?? '',
        sku: row['sku'] ?? '',
        quantity: row['quantity'] ?? 0,
        unitPrice: row['unit_price'] ?? 0,
        lineTotal: row['line_total'] ?? 0,
      );
}

/// Row shape of the `sold_items_detail` view.
class SoldItemDetail extends SoldItem {
  final DateTime saleDate;
  final String itemName;
  final String size;
  final String color;

  SoldItemDetail({
    required super.id,
    required super.saleId,
    required super.itemId,
    required super.variantId,
    required super.sku,
    required super.quantity,
    required super.unitPrice,
    required super.lineTotal,
    required this.saleDate,
    required this.itemName,
    required this.size,
    required this.color,
  });

  factory SoldItemDetail.fromMap(Map<String, dynamic> row) => SoldItemDetail(
        id: row['id'] ?? '',
        saleId: row['sale_id'] ?? '',
        itemId: row['item_id'] ?? '',
        variantId: row['variant_id'] ?? '',
        sku: row['sku'] ?? '',
        quantity: row['quantity'] ?? 0,
        unitPrice: row['unit_price'] ?? 0,
        lineTotal: row['line_total'] ?? 0,
        saleDate: DateTime.parse(row['sale_date']),
        itemName: row['item_name'] ?? '',
        size: row['size'] ?? '',
        color: row['color'] ?? '',
      );
}

// Mobile-only browsing: wishlist (no size needed) and cart (a specific
// size/sku — shared with the web app so staff can see it while building a
// sale; no checkout ever happens on mobile itself).
class WishlistItem {
  final String id;
  final String customerId;
  final String itemId;
  final DateTime createdAt;

  WishlistItem({
    required this.id,
    required this.customerId,
    required this.itemId,
    required this.createdAt,
  });

  factory WishlistItem.fromMap(Map<String, dynamic> row) => WishlistItem(
        id: row['id'] ?? '',
        customerId: row['customer_id'] ?? '',
        itemId: row['item_id'] ?? '',
        createdAt: DateTime.parse(row['created_at']),
      );
}

class CartItem {
  final String id;
  final String customerId;
  final String variantId;
  final int quantity;
  final DateTime createdAt;
  final DateTime updatedAt;

  CartItem({
    required this.id,
    required this.customerId,
    required this.variantId,
    required this.quantity,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CartItem.fromMap(Map<String, dynamic> row) => CartItem(
        id: row['id'] ?? '',
        customerId: row['customer_id'] ?? '',
        variantId: row['variant_id'] ?? '',
        quantity: row['quantity'] ?? 1,
        createdAt: DateTime.parse(row['created_at']),
        updatedAt: DateTime.parse(row['updated_at']),
      );
}

// One line item in the bag as shown in the UI: a `cart_items` row (id,
// variantId, qty) joined with its product for display. Built by
// store_repository.getCartLines — mirrors web's ShopContext CartLine.
class CartLine {
  final String id;
  final Product product;
  int qty;
  final String size;
  final String colorway;
  final String variantId;

  CartLine({
    required this.id,
    required this.product,
    required this.qty,
    required this.size,
    required this.colorway,
    required this.variantId,
  });
}

/// The reusable catalog of voucher options an admin curates — populates the
/// customer's 100-point redemption pop-up and any future ad-hoc grant.
class VoucherTemplate {
  final String id;
  final String label;
  final num value;
  final bool isActive;
  final String? createdBy;
  final DateTime createdAt;

  VoucherTemplate({
    required this.id,
    required this.label,
    required this.value,
    required this.isActive,
    required this.createdBy,
    required this.createdAt,
  });

  factory VoucherTemplate.fromMap(Map<String, dynamic> row) => VoucherTemplate(
        id: row['id'] ?? '',
        label: row['label'] ?? '',
        value: row['value'] ?? 0,
        isActive: row['is_active'] ?? true,
        createdBy: row['created_by'],
        createdAt: DateTime.parse(row['created_at']),
      );
}

class Voucher {
  final String id;
  final String code;
  final String customerId;
  final String? templateId;
  final num value; // snapshotted from the template at issue time
  final String source; // points_redemption | admin_grant
  final String? issuedBy; // null for points_redemption (self-service)
  final bool redeemed;
  final DateTime? redeemedAt;
  final String? redeemedSaleId;
  final DateTime createdAt;

  Voucher({
    required this.id,
    required this.code,
    required this.customerId,
    required this.templateId,
    required this.value,
    required this.source,
    required this.issuedBy,
    required this.redeemed,
    required this.redeemedAt,
    required this.redeemedSaleId,
    required this.createdAt,
  });

  factory Voucher.fromMap(Map<String, dynamic> row) => Voucher(
        id: row['id'] ?? '',
        code: row['code'] ?? '',
        customerId: row['customer_id'] ?? '',
        templateId: row['template_id'],
        value: row['value'] ?? 0,
        source: row['source'] ?? 'admin_grant',
        issuedBy: row['issued_by'],
        redeemed: row['redeemed'] ?? false,
        redeemedAt: row['redeemed_at'] != null ? DateTime.parse(row['redeemed_at']) : null,
        redeemedSaleId: row['redeemed_sale_id'],
        createdAt: DateTime.parse(row['created_at']),
      );
}
