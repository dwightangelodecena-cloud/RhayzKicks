import 'package:flutter/material.dart';
import '../models/database_models.dart';

// One line item in the bag: a product plus how many the shopper wants.
class CartLine {
  final Product product;
  int qty;
  final String? size;
  final String? colorway;

  CartLine({required this.product, this.qty = 1, this.size, this.colorway});
}

// Local, in-memory cart/wishlist state shared across the app via Provider.
// Mirrors web's ShopContext — no backend writes, browsing only, no checkout.
class ShopController extends ChangeNotifier {
  final List<CartLine> _cart = [];
  final List<Product> _wishlist = [];

  List<CartLine> get cart => List.unmodifiable(_cart);
  List<Product> get wishlist => List.unmodifiable(_wishlist);

  int get cartCount => _cart.fold(0, (sum, line) => sum + line.qty);

  num get cartSubtotal => _cart.fold<num>(0, (sum, line) => sum + line.qty * line.product.price);

  void addToCart(Product product, {String? size, String? colorway}) {
    final idx = _cart.indexWhere(
      (l) => l.product.id == product.id && l.size == size && l.colorway == colorway,
    );
    if (idx >= 0) {
      _cart[idx].qty += 1;
    } else {
      _cart.add(CartLine(product: product, size: size, colorway: colorway));
    }
    notifyListeners();
  }

  void removeFromCart(String productId, {String? size, String? colorway}) {
    _cart.removeWhere((l) => l.product.id == productId && l.size == size && l.colorway == colorway);
    notifyListeners();
  }

  void setQty(String productId, int qty, {String? size, String? colorway}) {
    if (qty <= 0) {
      removeFromCart(productId, size: size, colorway: colorway);
      return;
    }
    final idx = _cart.indexWhere(
      (l) => l.product.id == productId && l.size == size && l.colorway == colorway,
    );
    if (idx >= 0) {
      _cart[idx].qty = qty;
      notifyListeners();
    }
  }

  bool isWishlisted(String productId) => _wishlist.any((p) => p.id == productId);

  void toggleWishlist(Product product) {
    if (isWishlisted(product.id)) {
      _wishlist.removeWhere((p) => p.id == product.id);
    } else {
      _wishlist.add(product);
    }
    notifyListeners();
  }
}
