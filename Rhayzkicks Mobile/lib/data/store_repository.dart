// Mirrors web/src/lib/storeData.ts — storefront content (products,
// categories, collections) reads the exact same Supabase tables/columns the
// web admin manages; there is no mobile-specific content or admin UI for it.
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api_config.dart';
import '../models/database_models.dart';

const _itemColumns = 'id, name, brand, category, gender, base_price, image_urls, description, created_at';

SupabaseClient get _client => Supabase.instance.client;

// Products now go through the Laravel API (laravel-api/routes/api.php),
// which is the only thing that queries Supabase for item data. Every other
// function below still talks to Supabase directly.
Future<List<Product>> getActiveProducts() async {
  final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/products'));
  if (response.statusCode != 200) {
    throw Exception('Failed to load products: ${response.statusCode}');
  }
  final rows = jsonDecode(response.body) as List;
  return rows.map((r) => Product.fromMap(r as Map<String, dynamic>)).toList();
}

Future<List<Product>> getProductsForCategorySlug(String slug) async {
  final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/products/category/$slug'));
  if (response.statusCode != 200) {
    throw Exception('Failed to load products for $slug: ${response.statusCode}');
  }
  final rows = jsonDecode(response.body) as List;
  return rows.map((r) => Product.fromMap(r as Map<String, dynamic>)).toList();
}

Future<List<Product>> getRecommendedProducts(Product product, {int limit = 4}) async {
  final rows = await _client
      .from('items')
      .select(_itemColumns)
      .eq('is_active', true)
      .eq('category', product.category)
      .neq('id', product.id)
      .limit(limit);
  return (rows as List).map((r) => Product.fromMap(r as Map<String, dynamic>)).toList();
}

Future<ProductDetail?> getProductDetail(String id) async {
  final itemRow = await _client.from('items').select(_itemColumns).eq('id', id).eq('is_active', true).maybeSingle();
  if (itemRow == null) return null;

  final variantRows = await _client.from('item_variants').select('id, size, color, sku').eq('item_id', id).eq('is_active', true);
  final skus = (variantRows as List).map((v) => v['sku'] as String).toList();

  final inventoryBySku = <String, int>{};
  if (skus.isNotEmpty) {
    final inventoryRows = await _client.from('inventory').select('sku, quantity_on_hand').inFilter('sku', skus);
    for (final row in inventoryRows as List) {
      inventoryBySku[row['sku'] as String] = row['quantity_on_hand'] as int;
    }
  }

  final galleryByColor = <String, List<String>>{};
  final swatchByColor = <String, String>{};
  try {
    final galleryRows = await _client.from('item_images').select('color, image_url').eq('item_id', id).order('sort_order');
    for (final row in galleryRows as List) {
      (galleryByColor[row['color'] as String] ??= []).add(row['image_url'] as String);
    }
  } catch (_) {
    // item_images may not exist yet on older projects — tolerate its absence.
  }
  try {
    final colorwayRows = await _client.from('item_colorways').select('color, swatch_url').eq('item_id', id).order('sort_order');
    for (final row in colorwayRows as List) {
      final swatchUrl = row['swatch_url'] as String?;
      if (swatchUrl != null && swatchUrl.isNotEmpty) swatchByColor[row['color'] as String] = swatchUrl;
    }
  } catch (_) {
    // item_colorways may not exist yet on older projects — tolerate its absence.
  }

  final base = Product.fromMap(itemRow);
  return ProductDetail(
    id: base.id,
    name: base.name,
    brand: base.brand,
    price: base.price,
    category: base.category,
    gender: base.gender,
    isNew: base.isNew,
    description: base.description,
    imageUrl: base.imageUrl,
    variants: (variantRows).map((v) => ProductVariant(
          id: v['id'] ?? '',
          size: v['size'] ?? '',
          color: v['color'] ?? '',
          sku: v['sku'] ?? '',
          quantityOnHand: inventoryBySku[v['sku']] ?? 0,
        )).toList(),
    galleryByColor: galleryByColor,
    swatchByColor: swatchByColor,
  );
}

// Cart/wishlist reads and writes go through the Laravel API. Realtime sync
// (see ShopController._subscribe) still watches Supabase directly — it
// fires on the Postgres row change regardless of who wrote it.
Future<List<CartLine>> getCartLines(String customerId) async {
  final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/cart/$customerId'));
  if (response.statusCode != 200) {
    throw Exception('Failed to load cart: ${response.statusCode}');
  }
  final rows = jsonDecode(response.body) as List;
  return rows.map((r) {
    final row = r as Map<String, dynamic>;
    final variant = row['variant'] as Map<String, dynamic>;
    return CartLine(
      id: row['id'] as String,
      product: Product.fromMap(row['product'] as Map<String, dynamic>),
      qty: row['quantity'] as int,
      size: variant['size'] as String,
      colorway: variant['color'] as String,
      variantId: variant['id'] as String,
    );
  }).toList();
}

Future<void> addCartItem(String customerId, String variantId) async {
  final response = await http.post(
    Uri.parse('${ApiConfig.baseUrl}/cart'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'customer_id': customerId, 'variant_id': variantId}),
  );
  if (response.statusCode != 201) {
    throw Exception('Failed to add to cart: ${response.statusCode}');
  }
}

Future<void> updateCartItemQty(String cartLineId, int qty) async {
  final response = await http.put(
    Uri.parse('${ApiConfig.baseUrl}/cart/$cartLineId'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'quantity': qty}),
  );
  if (response.statusCode != 200) {
    throw Exception('Failed to update cart item: ${response.statusCode}');
  }
}

Future<void> removeCartItem(String cartLineId) async {
  final response = await http.delete(Uri.parse('${ApiConfig.baseUrl}/cart/$cartLineId'));
  if (response.statusCode != 200) {
    throw Exception('Failed to remove cart item: ${response.statusCode}');
  }
}

Future<List<Product>> getWishlistProducts(String customerId) async {
  final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/wishlist/$customerId'));
  if (response.statusCode != 200) {
    throw Exception('Failed to load wishlist: ${response.statusCode}');
  }
  final rows = jsonDecode(response.body) as List;
  return rows.map((r) => Product.fromMap(r as Map<String, dynamic>)).toList();
}

Future<void> addWishlistItem(String customerId, String itemId) async {
  final response = await http.post(
    Uri.parse('${ApiConfig.baseUrl}/wishlist'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'customer_id': customerId, 'item_id': itemId}),
  );
  if (response.statusCode != 201) {
    throw Exception('Failed to add to wishlist: ${response.statusCode}');
  }
}

Future<void> removeWishlistItem(String customerId, String itemId) async {
  final response = await http.delete(Uri.parse('${ApiConfig.baseUrl}/wishlist/$customerId/$itemId'));
  if (response.statusCode != 200) {
    throw Exception('Failed to remove from wishlist: ${response.statusCode}');
  }
}

Future<List<NavCategory>> getNavCategories() async {
  final rows = await _client.from('nav_categories').select('slug, label, image_url').eq('is_visible', true).order('sort_order');
  return (rows as List).map((r) => NavCategory.fromMap(r as Map<String, dynamic>)).toList();
}

Future<List<Collection>> getCollections({bool homeOnly = false}) async {
  var query = _client.from('collections').select('id, slug, tag, title, description, image_url, cta_label, size').eq('is_active', true);
  if (homeOnly) query = query.eq('show_on_home', true);
  final rows = await query.order('sort_order');
  return (rows as List).map((r) => Collection.fromMap(r as Map<String, dynamic>)).toList();
}

// Bullet copy isn't in the schema (no per-item marketing copy field) —
// grouped by the closest broad category so product pages still show
// something useful. Mirrors storeData.ts's detailBulletsForCategory.
const _footwearCategories = {'running', 'basketball', 'lifestyle', 'training', 'limited'};

List<String> detailBulletsForCategory(String category) {
  if (category == 'apparel') {
    return const [
      'Soft, breathable fabric blend for everyday wear',
      'Relaxed fit designed to layer easily',
      'Reinforced seams for lasting durability',
      'Machine washable, colorfast print',
    ];
  }
  if (category == 'accessories') {
    return const [
      'Built with durable, weather-resistant materials',
      'Compact design for everyday carry',
      'Reinforced stitching for lasting use',
      'Adjustable fit for all-day comfort',
    ];
  }
  if (_footwearCategories.contains(category)) {
    return const [
      'Breathable mesh and synthetic upper for all-day comfort',
      'Cushioned midsole absorbs impact with every step',
      'Durable rubber outsole built for reliable traction',
      'Reinforced heel counter for a secure, locked-in fit',
    ];
  }
  return const [
    'Crafted with quality materials for everyday performance',
    'Designed to hold up to daily wear',
  ];
}

const sortOptions = ['Featured', 'Price: Low to High', 'Price: High to Low'];

String formatPeso(num amount) {
  final s = amount.round().toString();
  final buf = StringBuffer();
  for (int i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return '₱$buf';
}
