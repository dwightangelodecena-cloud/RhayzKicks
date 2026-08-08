import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

// Drop-in placeholder for a real product/marketing photo.
// Swap the child for a real Image widget once assets exist.
class ImgSlot extends StatelessWidget {
  final String label;
  final String size;
  final bool dark;
  final double? aspectRatio;

  const ImgSlot({super.key, required this.label, required this.size, this.dark = false, this.aspectRatio});

  @override
  Widget build(BuildContext context) {
    final bg = dark ? AppColors.darkPlaceholderBg : context.rkColors.placeholderBg;
    final border = dark ? AppColors.darkPlaceholderBorder : context.rkColors.placeholderBorder;
    final fg = dark ? AppColors.darkPlaceholderText : context.rkColors.placeholderText;

    final content = LayoutBuilder(
      builder: (context, constraints) {
        // Scale the icon/label with the box so larger slots don't look sparse.
        final double base = constraints.biggest.shortestSide.isFinite
            ? constraints.biggest.shortestSide
            : constraints.maxWidth;
        // Mirrors web's ImgSlot.css clamp(28px, 22cqmin, 140px) so both
        // platforms scale the placeholder content the same way.
        final double iconSize = (base * 0.22).clamp(28.0, 140.0);
        final double labelSize = (iconSize * 0.2).clamp(11.0, 28.0);
        final double sizeTextSize = (iconSize * 0.13).clamp(9.0, 18.0);

        return Container(
          decoration: BoxDecoration(
            color: bg,
            border: Border.all(color: border, width: 1),
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.image_outlined, size: iconSize, color: fg),
              SizedBox(height: iconSize * 0.2),
              Text(
                label.toUpperCase(),
                style: TextStyle(fontSize: labelSize, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: fg),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: iconSize * 0.06),
              Text(size, style: TextStyle(fontSize: sizeTextSize, color: fg.withValues(alpha: 0.8))),
            ],
          ),
        );
      },
    );

    if (aspectRatio != null) {
      return AspectRatio(aspectRatio: aspectRatio!, child: content);
    }
    return content;
  }
}
