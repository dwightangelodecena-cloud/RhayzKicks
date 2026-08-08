import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

// Shared header block for the secondary screens (category, collections,
// help). Mirrors web's PageHero.tsx: eyebrow + big heading + optional
// subtitle, with an optional always-dark variant for the Sale category.
class PageHero extends StatelessWidget {
  final String? eyebrow;
  final String title;
  final String? subtitle;
  final bool dark;

  const PageHero({super.key, this.eyebrow, required this.title, this.subtitle, this.dark = false});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final bg = dark ? AppColors.darkSurface : colors.bgSecondary;
    final titleColor = dark ? AppColors.darkSurfaceText : colors.text;
    final subtitleColor = dark ? AppColors.darkSurfaceMuted : colors.textMuted;
    final eyebrowColor = dark ? AppColors.dark.accentRed : colors.accentRed;

    return Container(
      width: double.infinity,
      color: bg,
      padding: const EdgeInsets.fromLTRB(20, 40, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (eyebrow != null) ...[
            Text(
              eyebrow!.toUpperCase(),
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: eyebrowColor),
            ),
            const SizedBox(height: 8),
          ],
          Text(title, style: rkHeadingStyle(fontSize: 40, color: titleColor)),
          if (subtitle != null) ...[
            const SizedBox(height: 12),
            Text(
              subtitle!,
              style: TextStyle(fontSize: 15, color: subtitleColor, height: 1.5),
            ),
          ],
        ],
      ),
    );
  }
}
