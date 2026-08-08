import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/database_models.dart';
import '../state/home_content_controller.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'img_slot.dart';
import 'rk_button.dart';
import 'section_eyebrow.dart';

class FeaturedCollections extends StatelessWidget {
  const FeaturedCollections({super.key});

  @override
  Widget build(BuildContext context) {
    final collections = context.watch<HomeContentController>().collections;
    if (collections.isEmpty) return const SizedBox.shrink();

    final wide = collections.where((c) => c.isWide).toList();
    final regular = collections.where((c) => !c.isWide).toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionEyebrow('Featured Collections'),
          const SizedBox(height: 12),
          for (final c in wide) ...[
            _CollectionCard(collection: c, aspectRatio: 4 / 5),
            const SizedBox(height: 12),
          ],
          if (regular.isNotEmpty)
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.95,
              children: regular.map((c) => _CollectionCard(collection: c, aspectRatio: null)).toList(),
            ),
        ],
      ),
    );
  }
}

class _CollectionCard extends StatelessWidget {
  final Collection collection;
  final double? aspectRatio;

  const _CollectionCard({required this.collection, this.aspectRatio});

  @override
  Widget build(BuildContext context) {
    final card = ClipRRect(
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (collection.imageUrl != null)
            Image.network(
              collection.imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => ImgSlot(label: collection.title, size: '600 x 400 px'),
            )
          else
            ImgSlot(label: collection.title, size: '600 x 400 px'),
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [Color(0xCC000000), Colors.transparent],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (collection.tag.isNotEmpty)
                  Text(
                    collection.tag,
                    style: const TextStyle(
                      color: AppColors.darkSurfaceMuted,
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.6,
                    ),
                  ),
                const SizedBox(height: 4),
                Text(collection.title, style: rkHeadingStyle(fontSize: 18, color: AppColors.darkSurfaceText)),
                if (collection.isWide && collection.ctaLabel.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  RkButton(label: collection.ctaLabel, onDark: true),
                ],
              ],
            ),
          ),
        ],
      ),
    );

    if (aspectRatio != null) {
      return AspectRatio(aspectRatio: aspectRatio!, child: card);
    }
    return card;
  }
}
