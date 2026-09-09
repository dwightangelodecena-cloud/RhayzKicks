import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../data/store_repository.dart';
import '../models/database_models.dart';
import '../screens/product_detail_screen.dart';
import '../state/auth_controller.dart';
import '../state/require_auth.dart';
import '../state/shop_controller.dart';
import '../theme/app_theme.dart';
import 'network_image_or_slot.dart';

// Grid tile used on category pages: media + badge + favorite heart, a
// full-width "Select Size" button, then name/price. Tapping the image, name,
// or the button opens ProductDetailScreen to pick size/colorway — a cart
// line always needs a real variant, so there's no size-less quick add.
// Mirrors web's ProductCard.tsx.
class ProductCard extends StatelessWidget {
  final Product product;
  final String? badgeOverride;

  const ProductCard({super.key, required this.product, this.badgeOverride});

  void _openDetail(BuildContext context) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(productId: product.id)));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final badge = badgeOverride ?? (product.isNew ? 'New' : null);
    final shop = context.watch<ShopController>();
    final wishlisted = shop.isWishlisted(product.id);
    final isAuthenticated = context.watch<AuthController>().isAuthenticated;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AspectRatio(
          aspectRatio: 4 / 3,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => _openDetail(context),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    NetworkImageOrSlot(imageUrl: product.imageUrl, label: product.name, size: '400 x 300 px'),
                    if (badge != null)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          color: colors.text,
                          child: Text(
                            badge.toUpperCase(),
                            style: TextStyle(color: colors.bg, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 0.6),
                          ),
                        ),
                      ),
                    Positioned(
                      top: 6,
                      right: 6,
                      child: InkWell(
                        onTap: () => isAuthenticated ? context.read<ShopController>().toggleWishlist(product) : requireAuth(context),
                        customBorder: const CircleBorder(),
                        child: Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(color: colors.bg, shape: BoxShape.circle, boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)]),
                          child: Icon(
                            wishlisted ? Icons.favorite : Icons.favorite_border,
                            size: 16,
                            color: wishlisted ? colors.accentRed : colors.text,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => _openDetail(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: colors.text,
              foregroundColor: colors.bg,
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: const StadiumBorder(),
              elevation: 0,
            ),
            child: const Text('SELECT SIZE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6)),
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => _openDetail(context),
          child: Text(
            product.name,
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: colors.text),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        Text(formatPeso(product.price), style: TextStyle(fontSize: 12, color: colors.textMuted)),
      ],
    );
  }
}
