import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/home_content_controller.dart';
import '../screens/auth_screen.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'network_image_or_slot.dart';
import 'rk_button.dart';
import 'rk_logo_badge.dart';

// Content (image/label/headline/subtext/CTA copy) and visibility are editable
// from the web admin's Content > Banners > "Promotional Banner" card — see
// promo_banner_settings in Supabase, read via HomeContentController.
class PromoBanner extends StatelessWidget {
  const PromoBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final content = context.watch<HomeContentController>().promoBanner;
    if (content == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      color: AppColors.darkSurface,
      child: Stack(
        children: [
          if (content.imageUrl != null)
            Positioned.fill(
              child: Opacity(
                opacity: 0.14,
                child: NetworkImageOrSlot(imageUrl: content.imageUrl, label: 'Promo Background'),
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
            child: Column(
              children: [
                const RkLogoBadge(size: 54),
                const SizedBox(height: 12),
                Text(
                  content.label.toUpperCase(),
                  style: TextStyle(color: context.rkColors.accentRed, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.5),
                ),
                const SizedBox(height: 8),
                Text(content.headline, style: rkHeadingStyle(fontSize: 34, color: AppColors.darkSurfaceText), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                Text(
                  content.subtext,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.darkSurfaceMuted, fontSize: 13),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  alignment: WrapAlignment.center,
                  children: [
                    RkButton(
                      label: content.primaryCtaLabel,
                      onDark: true,
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AuthScreen(mode: AuthMode.join)),
                      ),
                    ),
                    if (content.secondaryCtaLabel != null)
                      RkButton(label: content.secondaryCtaLabel!, style: RkButtonStyle.outline, onDark: true),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
