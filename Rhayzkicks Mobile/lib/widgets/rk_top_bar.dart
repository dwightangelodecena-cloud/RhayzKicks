import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'rk_logo_badge.dart';
import 'shop_sheets.dart';

class RkTopBar extends StatelessWidget implements PreferredSizeWidget {
  final int cartCount;

  const RkTopBar({super.key, required this.cartCount});

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    return AppBar(
      backgroundColor: colors.bg,
      elevation: 0,
      scrolledUnderElevation: 1,
      surfaceTintColor: colors.bg,
      leading: Builder(
        builder: (ctx) => IconButton(
          icon: Icon(Icons.menu, color: colors.text),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        ),
      ),
      titleSpacing: 0,
      // FittedBox absorbs the near-zero width the nested AppBar's title slot
      // is transiently handed during the SliverAppBar(pinned+floating,
      // flexibleSpace: this) first layout passes, instead of throwing a
      // RenderFlex overflow — at the normal/settled width it renders at
      // natural size same as before.
      title: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const RkLogoBadge(size: 32),
            const SizedBox(width: 8),
            Text(
              'RHAYZ.',
              style: rkHeadingStyle(fontSize: 18, color: colors.text),
              maxLines: 1,
              softWrap: false,
            ),
          ],
        ),
      ),
      actions: [
        IconButton(
          visualDensity: VisualDensity.compact,
          icon: Icon(Icons.favorite_border, color: colors.text),
          onPressed: () => showWishlistSheet(context),
        ),
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              visualDensity: VisualDensity.compact,
              icon: Icon(Icons.shopping_bag_outlined, color: colors.text),
              onPressed: () => showCartSheet(context),
            ),
            if (cartCount > 0)
              Positioned(
                top: 4,
                right: 4,
                child: IgnorePointer(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(color: colors.text, borderRadius: BorderRadius.circular(8)),
                    constraints: const BoxConstraints(minWidth: 16),
                    child: Text(
                      '$cartCount',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: colors.bg),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(width: 4),
      ],
    );
  }
}
