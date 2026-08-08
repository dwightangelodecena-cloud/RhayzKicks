import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../data/store_repository.dart';
import '../models/database_models.dart';
import '../state/auth_controller.dart';
import '../state/require_auth.dart';
import '../state/shop_controller.dart';
import '../theme/app_theme.dart';
import '../widgets/network_image_or_slot.dart';
import '../widgets/product_card.dart';

// Mirrors web's ProductDetailPage.tsx — fetches the product by id straight
// from Supabase (getProductDetail), same real variants/gallery/colorway data
// the web admin's Products tab manages. Sizes are scoped to the selected
// colorway and out-of-stock sizes render disabled, matching the web fix.
class ProductDetailScreen extends StatefulWidget {
  final String productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  ProductDetail? _product;
  List<Product> _recommended = [];
  bool _loading = true;
  bool _notFound = false;

  String? _size;
  String? _colorway;
  int _activePhoto = 0;
  bool _added = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final detail = await getProductDetail(widget.productId);
      if (!mounted) return;
      if (detail == null) {
        setState(() {
          _notFound = true;
          _loading = false;
        });
        return;
      }
      setState(() {
        _product = detail;
        _colorway = detail.variants.isNotEmpty ? detail.variants.first.color : null;
        _loading = false;
      });
      getRecommendedProducts(detail).then((rec) {
        if (mounted) setState(() => _recommended = rec);
      }).catchError((_) {});
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _notFound = true;
        _loading = false;
      });
    }
  }

  void _selectColorway(String c) {
    setState(() {
      _colorway = c;
      _size = null;
      _activePhoto = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;

    if (_loading) {
      return Scaffold(
        backgroundColor: colors.bg,
        appBar: AppBar(backgroundColor: colors.bg, elevation: 0, foregroundColor: colors.text),
        body: const SizedBox.shrink(),
      );
    }
    if (_notFound || _product == null) {
      return Scaffold(
        backgroundColor: colors.bg,
        appBar: AppBar(backgroundColor: colors.bg, elevation: 0, foregroundColor: colors.text),
        body: Center(child: Text("This product isn't available.", style: TextStyle(color: colors.textMuted))),
      );
    }

    final product = _product!;
    final colorway = _colorway;
    final variantsForColorway = colorway != null ? product.variants.where((v) => v.color == colorway).toList() : product.variants;
    final sizes = <String>{for (final v in variantsForColorway) v.size}.toList();
    final colorways = <String>{for (final v in product.variants) v.color}.toList();

    ProductVariant? selectedVariant;
    for (final v in product.variants) {
      if (v.size == _size && v.color == colorway) {
        selectedVariant = v;
        break;
      }
    }

    var photos = colorway != null ? (product.galleryByColor[colorway] ?? const <String>[]) : const <String>[];
    if (photos.isEmpty && product.imageUrl != null) photos = [product.imageUrl!];
    final activePhotoIndex = photos.isEmpty ? 0 : _activePhoto.clamp(0, photos.length - 1);
    final activeImage = photos.isEmpty ? null : photos[activePhotoIndex];

    final shop = context.watch<ShopController>();
    final wishlisted = shop.isWishlisted(product.id);
    final detailBullets = detailBulletsForCategory(product.category);
    final isAuthenticated = context.watch<AuthController>().isAuthenticated;

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        backgroundColor: colors.bg,
        elevation: 0,
        foregroundColor: colors.text,
        title: Text('Product', style: TextStyle(color: colors.text, fontSize: 16, fontWeight: FontWeight.w700)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  NetworkImageOrSlot(imageUrl: activeImage, label: product.name, size: '1200 x 900 px'),
                  if (product.isNew)
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        color: colors.text,
                        child: Text(
                          'NEW',
                          style: TextStyle(color: colors.bg, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.6),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: InkWell(
                      onTap: () => isAuthenticated ? context.read<ShopController>().toggleWishlist(product) : requireAuth(context),
                      customBorder: const CircleBorder(),
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(color: colors.bg, shape: BoxShape.circle, boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8)]),
                        child: Icon(
                          wishlisted ? Icons.favorite : Icons.favorite_border,
                          color: wishlisted ? colors.accentRed : colors.text,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (photos.length > 1)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: SizedBox(
                  height: 64,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: photos.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      final active = i == activePhotoIndex;
                      return GestureDetector(
                        onTap: () => setState(() => _activePhoto = i),
                        child: Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(border: Border.all(color: active ? colors.text : Colors.transparent, width: 2)),
                          child: NetworkImageOrSlot(imageUrl: photos[i], label: 'Photo ${i + 1}', size: ''),
                        ),
                      );
                    },
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, style: rkHeadingStyle(fontSize: 26, color: colors.text)),
                  const SizedBox(height: 4),
                  Text(formatPeso(product.price), style: TextStyle(fontSize: 16, color: colors.textMuted)),
                  const SizedBox(height: 24),
                  if (colorways.isNotEmpty) ...[
                    Text(
                      'COLORWAY${colorway != null ? ' — ${colorway.toUpperCase()}' : ''}',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: colors.textMuted),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: colorways.map((c) {
                        final active = c == colorway;
                        final swatchImg = product.swatchByColor[c] ?? product.galleryByColor[c]?.firstOrNull ?? product.imageUrl;
                        return GestureDetector(
                          onTap: () => _selectColorway(c),
                          child: Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(border: Border.all(color: active ? colors.text : colors.border, width: 2)),
                            child: NetworkImageOrSlot(imageUrl: swatchImg, label: c, size: ''),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],
                  if (sizes.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text("This product isn't available for purchase yet.", style: TextStyle(fontSize: 12, color: colors.accentRed)),
                    )
                  else ...[
                    Text(
                      _size == null ? 'SIZE' : 'SIZE — $_size',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: colors.textMuted),
                    ),
                    const SizedBox(height: 10),
                    GridView.count(
                      crossAxisCount: 4,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                      childAspectRatio: 1.7,
                      children: sizes.map((s) {
                        final active = s == _size;
                        int stock = 0;
                        for (final v in variantsForColorway) {
                          if (v.size == s) {
                            stock = v.quantityOnHand;
                            break;
                          }
                        }
                        final outOfStock = stock == 0;
                        return InkWell(
                          onTap: outOfStock ? null : () => setState(() => _size = s),
                          child: Container(
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: active ? colors.text : colors.bg,
                              border: Border.all(color: active ? colors.text : colors.border),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              s,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: outOfStock ? colors.textMuted : (active ? colors.bg : colors.text),
                                decoration: outOfStock ? TextDecoration.lineThrough : null,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    if (_size == null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text('Select a size to add this to your bag.', style: TextStyle(fontSize: 12, color: colors.accentRed)),
                      )
                    else if (selectedVariant?.quantityOnHand == 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text('Out of stock in this size/colorway.', style: TextStyle(fontSize: 12, color: colors.accentRed)),
                      ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: (_size == null || selectedVariant == null || selectedVariant.quantityOnHand == 0)
                          ? null
                          : () {
                              if (!isAuthenticated) {
                                requireAuth(context);
                                return;
                              }
                              context.read<ShopController>().addToCart(product, size: _size, colorway: colorway);
                              setState(() => _added = true);
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colors.text,
                        foregroundColor: colors.bg,
                        disabledBackgroundColor: colors.border,
                        disabledForegroundColor: colors.textMuted,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: const StadiumBorder(),
                        elevation: 0,
                      ),
                      child: const Text('ADD TO BAG', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.6)),
                    ),
                  ),
                  if (_added) ...[
                    const SizedBox(height: 10),
                    Center(
                      child: Text('Added to your bag.', style: TextStyle(fontSize: 13, color: Color(0xFF1A9C4A))),
                    ),
                  ],
                  const SizedBox(height: 32),
                  Divider(color: colors.border),
                  const SizedBox(height: 24),
                  Text('Product Details', style: rkHeadingStyle(fontSize: 20, color: colors.text)),
                  const SizedBox(height: 10),
                  Text(
                    product.description.isNotEmpty ? product.description : 'Crafted with quality materials and built for everyday performance.',
                    style: TextStyle(fontSize: 13.5, height: 1.5, color: colors.textMuted),
                  ),
                  const SizedBox(height: 16),
                  ...detailBullets.map(
                    (bullet) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.check, size: 16, color: colors.accentRed),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(bullet, style: TextStyle(fontSize: 13, color: colors.text)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_recommended.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Divider(color: colors.border),
                    const SizedBox(height: 24),
                    Text('You Might Also Like', style: rkHeadingStyle(fontSize: 20, color: colors.text)),
                    const SizedBox(height: 16),
                  ],
                ],
              ),
            ),
            if (_recommended.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _recommended.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 24,
                    childAspectRatio: 0.62,
                  ),
                  itemBuilder: (context, i) {
                    final rec = _recommended[i];
                    return ProductCard(
                      product: rec,
                      onQuickAdd: () => context.read<ShopController>().addToCart(rec),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
