import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../screens/category_screen.dart';
import '../state/home_content_controller.dart';
import '../theme/app_theme.dart';
import 'network_image_or_slot.dart';

class ShopByActivity extends StatelessWidget {
  const ShopByActivity({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final categories = context.watch<HomeContentController>().navCategories;
    if (categories.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Shop By Activity', style: rkHeadingStyle(fontSize: 24, color: colors.text)),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 200,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) {
                final category = categories[i];
                return GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => CategoryScreen(slug: category.slug)),
                  ),
                  child: SizedBox(
                    width: 140,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: NetworkImageOrSlot(imageUrl: category.imageUrl, label: category.label, size: '400 x 500 px')),
                        const SizedBox(height: 6),
                        Text(category.label, style: TextStyle(fontWeight: FontWeight.w600, color: colors.text)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
