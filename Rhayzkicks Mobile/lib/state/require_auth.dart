import 'package:flutter/material.dart';
import '../screens/auth_screen.dart';

// Shared gate for cart/wishlist/checkout actions — mirrors web's requireAuth
// helpers in ProductCard/ProductDetailPage/CartDrawer/WishlistDrawer.
void requireAuth(BuildContext context) {
  Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen(mode: AuthMode.signIn)));
}
