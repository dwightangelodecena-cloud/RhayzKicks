import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../data/store_repository.dart';
import '../models/database_models.dart';
import '../state/home_content_controller.dart';
import '../state/shop_controller.dart';
import '../theme/app_theme.dart';
import '../widgets/page_hero.dart';
import '../widgets/product_card.dart';

const _genderChips = ['All', 'Men', 'Women', 'Unisex', 'Kids'];

// Mirrors web's CategoryPage.tsx — fetches products for this nav category
// slug straight from Supabase (getProductsForCategorySlug), same as web.
class CategoryScreen extends StatefulWidget {
  final String slug;

  const CategoryScreen({super.key, required this.slug});

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> {
  String _genderChip = 'All';
  String _sort = sortOptions.first;
  List<Product> _products = [];
  bool _loading = true;
  bool _notFound = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final products = await getProductsForCategorySlug(widget.slug);
      if (!mounted) return;
      setState(() {
        _products = products;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _notFound = true;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final homeContent = context.watch<HomeContentController>();
    final navCategories = homeContent.navCategories;
    NavCategory? match;
    for (final c in navCategories) {
      if (c.slug == widget.slug) {
        match = c;
        break;
      }
    }

    final stillLoading = _loading || homeContent.isLoading;
    final notFound = !stillLoading && (_notFound || (match == null && widget.slug != 'new-releases'));

    if (notFound) {
      return Scaffold(
        backgroundColor: colors.bg,
        appBar: AppBar(backgroundColor: colors.bg, foregroundColor: colors.text, elevation: 0),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              "This category doesn't exist yet — an admin can add it from the Content tab.",
              textAlign: TextAlign.center,
              style: TextStyle(color: colors.textMuted),
            ),
          ),
        ),
      );
    }

    final label = widget.slug == 'new-releases' ? 'New Releases' : (match?.label ?? widget.slug);

    var products = _genderChip == 'All'
        ? _products
        : _products.where((p) => p.gender == _genderChip.toLowerCase()).toList();
    if (_sort == 'Price: Low to High') {
      products = [...products]..sort((a, b) => a.price.compareTo(b.price));
    } else if (_sort == 'Price: High to Low') {
      products = [...products]..sort((a, b) => b.price.compareTo(a.price));
    }

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(backgroundColor: colors.bg, foregroundColor: colors.text, elevation: 0),
      body: SafeArea(
        top: false,
        child: stillLoading
            ? const SizedBox.shrink()
            : ListView(
                padding: EdgeInsets.zero,
                children: [
                  PageHero(title: label),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 40,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _genderChips.length,
                            separatorBuilder: (_, _) => const SizedBox(width: 8),
                            itemBuilder: (context, i) {
                              final chip = _genderChips[i];
                              final active = chip == _genderChip;
                              return ChoiceChip(
                                label: Text(chip),
                                selected: active,
                                onSelected: (_) => setState(() => _genderChip = chip),
                                selectedColor: colors.text,
                                backgroundColor: colors.bg,
                                labelStyle: TextStyle(color: active ? colors.bg : colors.text, fontWeight: FontWeight.w600),
                                side: BorderSide(color: colors.border),
                                shape: const StadiumBorder(),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${products.length} items', style: TextStyle(color: colors.textMuted, fontSize: 13)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                border: Border.all(color: colors.border),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _sort,
                                  isDense: true,
                                  icon: Icon(Icons.keyboard_arrow_down, color: colors.text, size: 18),
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: colors.text),
                                  dropdownColor: colors.bg,
                                  items: sortOptions.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
                                  onChanged: (v) => setState(() => _sort = v ?? _sort),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        if (products.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48),
                            child: Center(
                              child: Text('No products match this filter.', style: TextStyle(color: colors.textMuted)),
                            ),
                          )
                        else
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: products.length,
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 24,
                              childAspectRatio: 0.62,
                            ),
                            itemBuilder: (context, i) {
                              final product = products[i];
                              return ProductCard(
                                product: product,
                                onQuickAdd: () => context.read<ShopController>().addToCart(product),
                              );
                            },
                          ),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
