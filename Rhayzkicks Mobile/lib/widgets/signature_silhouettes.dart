import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../data/store_repository.dart';
import '../models/database_models.dart';
import '../screens/category_screen.dart';
import '../screens/product_detail_screen.dart';
import '../state/auth_controller.dart';
import '../state/require_auth.dart';
import '../state/shop_controller.dart';
import '../theme/app_theme.dart';
import 'network_image_or_slot.dart';
import 'rk_button.dart';
import 'section_eyebrow.dart';

class SignatureSilhouettes extends StatefulWidget {
  const SignatureSilhouettes({super.key});

  @override
  State<SignatureSilhouettes> createState() => _SignatureSilhouettesState();
}

class _SignatureSilhouettesState extends State<SignatureSilhouettes> {
  String _activeFilter = 'All';
  List<Product> _products = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    getActiveProducts().then((products) {
      if (!mounted) return;
      setState(() {
        _products = products;
        _loading = false;
      });
    }).catchError((_) {
      if (!mounted) return;
      setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    if (_loading || _products.isEmpty) return const SizedBox.shrink();

    final chips = ['All', ...{for (final p in _products) p.category}];
    final visible = (_activeFilter == 'All' ? _products : _products.where((p) => p.category == _activeFilter).toList())
        .take(8)
        .toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionEyebrow('Spotlight'),
          const SizedBox(height: 4),
          Text('Signature Silhouettes', style: rkHeadingStyle(fontSize: 26, color: colors.text)),
          const SizedBox(height: 12),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: chips.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final chip = chips[i];
                final active = chip == _activeFilter;
                return ChoiceChip(
                  label: Text(chip),
                  selected: active,
                  onSelected: (_) => setState(() => _activeFilter = chip),
                  selectedColor: colors.text,
                  backgroundColor: colors.bg,
                  labelStyle: TextStyle(
                    color: active ? colors.bg : colors.text,
                    fontWeight: FontWeight.w600,
                  ),
                  side: BorderSide(color: colors.border),
                  shape: const StadiumBorder(),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: visible.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 16,
              childAspectRatio: 0.78,
            ),
            itemBuilder: (context, i) {
              final product = visible[i];
              final shop = context.watch<ShopController>();
              final wishlisted = shop.isWishlisted(product.id);
              final isAuthenticated = context.watch<AuthController>().isAuthenticated;

              void openDetail() {
                Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(productId: product.id)));
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: openDetail,
                      child: Stack(
                        children: [
                          Positioned.fill(child: NetworkImageOrSlot(imageUrl: product.imageUrl, label: product.name, size: '400 x 300 px')),
                          if (product.isNew)
                            Positioned(
                              top: 6,
                              left: 6,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                color: colors.text,
                                child: Text(
                                  'NEW',
                                  style: TextStyle(color: colors.bg, fontSize: 9, fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          Positioned(
                            top: 6,
                            right: 6,
                            child: InkWell(
                              onTap: () {
                                if (!isAuthenticated) return requireAuth(context);
                                context.read<ShopController>().toggleWishlist(product);
                              },
                              customBorder: const CircleBorder(),
                              child: Container(
                                padding: const EdgeInsets.all(5),
                                decoration: BoxDecoration(color: colors.bg, shape: BoxShape.circle, boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)]),
                                child: Icon(
                                  wishlisted ? Icons.favorite : Icons.favorite_border,
                                  size: 14,
                                  color: wishlisted ? colors.accentRed : colors.text,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            right: 6,
                            bottom: 6,
                            child: InkWell(
                              onTap: () {
                                if (!isAuthenticated) return requireAuth(context);
                                context.read<ShopController>().addToCart(product);
                              },
                              customBorder: const CircleBorder(),
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(color: colors.text, shape: BoxShape.circle),
                                child: Icon(Icons.add, size: 16, color: colors.bg),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  GestureDetector(
                    onTap: openDetail,
                    child: Text(product.name, style: TextStyle(fontWeight: FontWeight.w600, color: colors.text)),
                  ),
                  Text(formatPeso(product.price), style: TextStyle(color: colors.textMuted, fontSize: 13)),
                ],
              );
            },
          ),
          const SizedBox(height: 20),
          Center(
            child: RkButton(
              label: 'View All Products',
              style: RkButtonStyle.outline,
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CategoryScreen(slug: 'new-releases')),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
