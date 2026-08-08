import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

enum RkButtonStyle { primary, outline }

class RkButton extends StatelessWidget {
  final String label;
  final RkButtonStyle style;
  final bool onDark; // use fixed dark-surface colors regardless of app theme
  final VoidCallback? onPressed;

  const RkButton({
    super.key,
    required this.label,
    this.style = RkButtonStyle.primary,
    this.onDark = false,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final fg = onDark ? AppColors.darkSurfaceText : colors.text;
    final bg = onDark ? AppColors.darkSurface : colors.bg;

    if (style == RkButtonStyle.primary) {
      return ElevatedButton(
        onPressed: onPressed ?? () {},
        style: ElevatedButton.styleFrom(
          backgroundColor: fg,
          foregroundColor: bg,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: const StadiumBorder(),
          elevation: 0,
        ),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
      );
    }

    return OutlinedButton(
      onPressed: onPressed ?? () {},
      style: OutlinedButton.styleFrom(
        foregroundColor: fg,
        side: BorderSide(color: fg, width: 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: const StadiumBorder(),
      ),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
    );
  }
}
