import 'package:flutter/material.dart';
import '../data/store_repository.dart';
import '../models/database_models.dart';
import '../theme/app_theme.dart';
import '../widgets/network_image_or_slot.dart';
import '../widgets/page_hero.dart';
import '../widgets/rk_button.dart';

// Mirrors web's CollectionsPage.tsx — fetches ALL active collections (not
// just the home-page subset HomeContentController carries).
class CollectionsScreen extends StatefulWidget {
  const CollectionsScreen({super.key});

  @override
  State<CollectionsScreen> createState() => _CollectionsScreenState();
}

class _CollectionsScreenState extends State<CollectionsScreen> {
  List<Collection> _collections = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    getCollections().then((rows) {
      if (!mounted) return;
      setState(() {
        _collections = rows;
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

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(backgroundColor: colors.bg, foregroundColor: colors.text, elevation: 0),
      body: SafeArea(
        top: false,
        child: _loading
            ? const SizedBox.shrink()
            : ListView(
                padding: EdgeInsets.zero,
                children: [
                  const PageHero(
                    title: 'Collections',
                    subtitle: 'Explore our curated drops — each collection tells a story of style and purpose.',
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
                    child: Column(
                      children: _collections.map((c) => _CollectionCard(collection: c)).toList(),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _CollectionCard extends StatelessWidget {
  final Collection collection;

  const _CollectionCard({required this.collection});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(border: Border.all(color: colors.border), borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 3 / 2,
            child: Stack(
              fit: StackFit.expand,
              children: [
                NetworkImageOrSlot(imageUrl: collection.imageUrl, label: collection.title, size: '800 x 400 px'),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
                    ),
                  ),
                ),
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (collection.tag.isNotEmpty)
                        Text(
                          collection.tag.toUpperCase(),
                          style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1),
                        ),
                      Text(collection.title, style: rkHeadingStyle(fontSize: 26, color: Colors.white)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (collection.description.isNotEmpty)
                  Text(collection.description, style: TextStyle(color: colors.textMuted, fontSize: 13, height: 1.4)),
                const SizedBox(height: 14),
                RkButton(label: collection.ctaLabel.isNotEmpty ? collection.ctaLabel : 'Shop Collection', onPressed: () {}),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
