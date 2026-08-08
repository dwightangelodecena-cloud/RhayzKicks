import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../data/store_repository.dart';
import '../state/auth_controller.dart';
import '../state/require_auth.dart';
import '../state/shop_controller.dart';
import '../theme/app_theme.dart';
import 'network_image_or_slot.dart';

// Tall, near-fullscreen bottom sheets for the wishlist and bag, opened from
// RkTopBar's heart/bag icons. Mirrors web's WishlistDrawer/CartDrawer. The
// Checkout button is a placeholder — this app doesn't process real payment.

void showWishlistSheet(BuildContext context) {
  _showShopSheet(context, title: 'Wishlist', body: const _WishlistSheetBody());
}

void showCartSheet(BuildContext context) {
  _showShopSheet(
    context,
    title: 'Your Bag',
    body: const _CartSheetBody(),
    footer: const _CartSheetFooter(),
  );
}

void _showShopSheet(BuildContext context, {required String title, required Widget body, Widget? footer}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: context.rkColors.bg,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
    builder: (sheetContext) {
      final colors = sheetContext.rkColors;
      return FractionallySizedBox(
        heightFactor: 0.9,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: colors.border, borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: Text(title, style: rkHeadingStyle(fontSize: 24, color: colors.text))),
                  IconButton(icon: Icon(Icons.close, color: colors.text), onPressed: () => Navigator.pop(sheetContext)),
                ],
              ),
              Divider(color: colors.border),
              Expanded(child: body),
              ?footer,
              const SizedBox(height: 12),
            ],
          ),
        ),
      );
    },
  );
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _EmptyState({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 40, color: colors.textMuted),
          const SizedBox(height: 12),
          Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: colors.text)),
          const SizedBox(height: 4),
          Text(subtitle, style: TextStyle(fontSize: 13, color: colors.textMuted)),
        ],
      ),
    );
  }
}

Widget _thumb(String label, String? imageUrl) => SizedBox(width: 76, height: 76, child: NetworkImageOrSlot(imageUrl: imageUrl, label: label, size: ''));

Widget _smallButton(BuildContext context, String label, {required bool filled, required VoidCallback onTap}) {
  final colors = context.rkColors;
  return OutlinedButton(
    onPressed: onTap,
    style: OutlinedButton.styleFrom(
      backgroundColor: filled ? colors.text : null,
      foregroundColor: filled ? colors.bg : colors.text,
      side: BorderSide(color: filled ? colors.text : colors.border),
      shape: const StadiumBorder(),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      minimumSize: Size.zero,
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    ),
    child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
  );
}

Widget _qtyButton(BuildContext context, IconData icon, VoidCallback onTap) {
  final colors = context.rkColors;
  return InkWell(
    onTap: onTap,
    customBorder: const CircleBorder(),
    child: Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: colors.border)),
      child: Icon(icon, size: 14, color: colors.text),
    ),
  );
}

class _WishlistSheetBody extends StatelessWidget {
  const _WishlistSheetBody();

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final shop = context.watch<ShopController>();
    final isAuthenticated = context.watch<AuthController>().isAuthenticated;

    if (shop.wishlist.isEmpty) {
      return const _EmptyState(
        icon: Icons.favorite_border,
        title: 'Nothing saved yet',
        subtitle: 'Heart items to save them for later.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: shop.wishlist.length,
      separatorBuilder: (_, _) => Divider(color: colors.border),
      itemBuilder: (context, i) {
        final product = shop.wishlist[i];
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _thumb(product.name, product.imageUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.name, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: colors.text)),
                    Text(formatPeso(product.price), style: TextStyle(fontSize: 13, color: colors.textMuted)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _smallButton(
                          context,
                          'Add to Bag',
                          filled: true,
                          onTap: () => isAuthenticated ? context.read<ShopController>().addToCart(product) : requireAuth(context),
                        ),
                        const SizedBox(width: 8),
                        _smallButton(
                          context,
                          'Remove',
                          filled: false,
                          onTap: () => isAuthenticated ? context.read<ShopController>().toggleWishlist(product) : requireAuth(context),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CartSheetBody extends StatelessWidget {
  const _CartSheetBody();

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final shop = context.watch<ShopController>();

    if (shop.cart.isEmpty) {
      return const _EmptyState(
        icon: Icons.shopping_bag_outlined,
        title: 'Your bag is empty',
        subtitle: 'Add some kicks to get started.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: shop.cart.length,
      separatorBuilder: (_, _) => Divider(color: colors.border),
      itemBuilder: (context, i) {
        final line = shop.cart[i];
        final product = line.product;
        final variantLabel = [line.colorway, line.size].where((v) => v != null).join(' · ');
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _thumb(product.name, product.imageUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.name, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: colors.text)),
                    if (variantLabel.isNotEmpty)
                      Text(variantLabel, style: TextStyle(fontSize: 12, color: colors.textMuted)),
                    Text(formatPeso(product.price), style: TextStyle(fontSize: 13, color: colors.textMuted)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _qtyButton(
                          context,
                          Icons.remove,
                          () => context.read<ShopController>().setQty(product.id, line.qty - 1, size: line.size, colorway: line.colorway),
                        ),
                        SizedBox(width: 30, child: Center(child: Text('${line.qty}', style: TextStyle(fontWeight: FontWeight.w700, color: colors.text)))),
                        _qtyButton(
                          context,
                          Icons.add,
                          () => context.read<ShopController>().setQty(product.id, line.qty + 1, size: line.size, colorway: line.colorway),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () => context.read<ShopController>().removeFromCart(product.id, size: line.size, colorway: line.colorway),
                          style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                          child: Text('Remove', style: TextStyle(color: colors.textMuted, fontSize: 12, decoration: TextDecoration.underline)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CartSheetFooter extends StatefulWidget {
  const _CartSheetFooter();

  @override
  State<_CartSheetFooter> createState() => _CartSheetFooterState();
}

class _CartSheetFooterState extends State<_CartSheetFooter> {
  bool _checkoutTapped = false;

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final shop = context.watch<ShopController>();
    final isAuthenticated = context.watch<AuthController>().isAuthenticated;
    if (shop.cart.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Column(
        children: [
          Divider(color: colors.border),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Subtotal', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: colors.text)),
              Text(formatPeso(shop.cartSubtotal), style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: colors.text)),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (!isAuthenticated) {
                  Navigator.pop(context);
                  requireAuth(context);
                  return;
                }
                setState(() => _checkoutTapped = true);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: colors.text,
                foregroundColor: colors.bg,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: const StadiumBorder(),
                elevation: 0,
              ),
              child: const Text('CHECKOUT', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.6)),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            _checkoutTapped
                ? 'Checkout isn\'t live yet — head in-store or watch for our next release.'
                : 'Checkout happens in-store or on our next release — this app is browsing only for now.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: colors.textMuted),
          ),
        ],
      ),
    );
  }
}
