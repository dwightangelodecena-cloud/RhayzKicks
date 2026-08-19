import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/store_repository.dart';
import '../models/database_models.dart';

// Cart/wishlist state backed by Supabase (`cart_items`/`wishlist_items`), one
// row per logged-in customer, shared with the web app. A Realtime
// subscription keeps this in sync when the same customer edits their bag or
// wishlist on the other app. Mirrors web's ShopContext.
class ShopController extends ChangeNotifier {
  SupabaseClient get _client => Supabase.instance.client;

  String? _customerId;
  List<CartLine> _cart = [];
  List<Product> _wishlist = [];
  RealtimeChannel? _channel;

  List<CartLine> get cart => List.unmodifiable(_cart);
  List<Product> get wishlist => List.unmodifiable(_wishlist);

  int get cartCount => _cart.fold(0, (sum, line) => sum + line.qty);

  num get cartSubtotal => _cart.fold<num>(0, (sum, line) => sum + line.qty * line.product.price);

  // Called whenever AuthController's customer changes (login/logout/switch).
  void setCustomerId(String? customerId) {
    if (_customerId == customerId) return;
    _customerId = customerId;
    _unsubscribe();
    if (customerId == null) {
      _cart = [];
      _wishlist = [];
      notifyListeners();
      return;
    }
    _refreshCart();
    _refreshWishlist();
    _subscribe(customerId);
  }

  void _subscribe(String customerId) {
    _channel = _client
        .channel('shop-$customerId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'cart_items',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'customer_id', value: customerId),
          callback: (_) => _refreshCart(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'wishlist_items',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'customer_id', value: customerId),
          callback: (_) => _refreshWishlist(),
        )
        .subscribe();
  }

  void _unsubscribe() {
    final channel = _channel;
    _channel = null;
    if (channel != null) _client.removeChannel(channel);
  }

  Future<void> _refreshCart() async {
    final customerId = _customerId;
    if (customerId == null) return;
    try {
      final lines = await getCartLines(customerId);
      if (_customerId == customerId) {
        _cart = lines;
        notifyListeners();
      }
    } catch (_) {
      // Keep the last known cart rather than clearing it on a blip.
    }
  }

  Future<void> _refreshWishlist() async {
    final customerId = _customerId;
    if (customerId == null) return;
    try {
      final products = await getWishlistProducts(customerId);
      if (_customerId == customerId) {
        _wishlist = products;
        notifyListeners();
      }
    } catch (_) {
      // Keep the last known wishlist rather than clearing it on a blip.
    }
  }

  Future<void> addToCart(Product product, {required String variantId}) async {
    final customerId = _customerId;
    if (customerId == null) return;
    final existing = _cart.where((l) => l.variantId == variantId).firstOrNull;
    if (existing != null) {
      await _client.from('cart_items').update({'quantity': existing.qty + 1}).eq('id', existing.id);
    } else {
      await _client.from('cart_items').insert({'customer_id': customerId, 'variant_id': variantId, 'quantity': 1});
    }
    await _refreshCart();
  }

  Future<void> removeFromCart(String productId, {String? size, String? colorway}) async {
    final line = _cart.where((l) => l.product.id == productId && l.size == size && l.colorway == colorway).firstOrNull;
    if (line == null) return;
    await _client.from('cart_items').delete().eq('id', line.id);
    await _refreshCart();
  }

  Future<void> setQty(String productId, int qty, {String? size, String? colorway}) async {
    if (qty <= 0) {
      await removeFromCart(productId, size: size, colorway: colorway);
      return;
    }
    final line = _cart.where((l) => l.product.id == productId && l.size == size && l.colorway == colorway).firstOrNull;
    if (line == null) return;
    await _client.from('cart_items').update({'quantity': qty}).eq('id', line.id);
    await _refreshCart();
  }

  bool isWishlisted(String productId) => _wishlist.any((p) => p.id == productId);

  Future<void> toggleWishlist(Product product) async {
    final customerId = _customerId;
    if (customerId == null) return;
    if (isWishlisted(product.id)) {
      await _client.from('wishlist_items').delete().eq('customer_id', customerId).eq('item_id', product.id);
    } else {
      await _client.from('wishlist_items').insert({'customer_id': customerId, 'item_id': product.id});
    }
    await _refreshWishlist();
  }

  @override
  void dispose() {
    _unsubscribe();
    super.dispose();
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
