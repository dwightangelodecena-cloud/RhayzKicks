import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/shop_controller.dart';
import '../theme/app_theme.dart';
import '../widgets/announcement_ticker.dart';
import '../widgets/featured_collections.dart';
import '../widgets/hero_carousel.dart';
import '../widgets/member_cta.dart';
import '../widgets/promo_banner.dart';
import '../widgets/rk_footer.dart';
import '../widgets/rk_nav_drawer.dart';
import '../widgets/rk_top_bar.dart';
import '../widgets/shop_by_activity.dart';
import '../widgets/signature_silhouettes.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final cartCount = context.watch<ShopController>().cartCount;
    return Scaffold(
      backgroundColor: colors.bg,
      drawer: const RkNavDrawer(),
      // SafeArea keeps content clear of the notch / dynamic island (top) and
      // the home-indicator gesture area (bottom).
      body: SafeArea(
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(child: AnnouncementTicker()),
            SliverAppBar(
              pinned: true,
              floating: true,
              automaticallyImplyLeading: false,
              toolbarHeight: 56,
              titleSpacing: 0,
              flexibleSpace: RkTopBar(cartCount: cartCount),
            ),
          ],
          body: ListView(
            padding: EdgeInsets.zero,
            children: const [
              HeroCarousel(),
              FeaturedCollections(),
              PromoBanner(),
              ShopByActivity(),
              SignatureSilhouettes(),
              MemberCTA(),
              RkFooter(),
            ],
          ),
        ),
      ),
    );
  }
}
