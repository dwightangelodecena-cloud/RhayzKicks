import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

ThemeData buildTheme(Brightness brightness) {
  final colors = brightness == Brightness.dark ? AppColors.dark : AppColors.light;

  return ThemeData(
    brightness: brightness,
    scaffoldBackgroundColor: colors.bg,
    fontFamily: GoogleFonts.inter().fontFamily,
    colorScheme: ColorScheme.fromSeed(
      seedColor: colors.accentRed,
      brightness: brightness,
      surface: colors.bg,
      onSurface: colors.text,
    ),
    dividerColor: colors.border,
    extensions: [RkColorsExtension(colors)],
  );
}

// Lets any widget do `context.rkColors` to get the theme-aware palette,
// mirroring the CSS custom properties in the web app's theme.css.
class RkColorsExtension extends ThemeExtension<RkColorsExtension> {
  final AppColors colors;
  const RkColorsExtension(this.colors);

  @override
  RkColorsExtension copyWith({AppColors? colors}) =>
      RkColorsExtension(colors ?? this.colors);

  @override
  RkColorsExtension lerp(ThemeExtension<RkColorsExtension>? other, double t) {
    if (other is! RkColorsExtension) return this;
    return t < 0.5 ? this : other;
  }
}

extension RkColorsContext on BuildContext {
  AppColors get rkColors =>
      Theme.of(this).extension<RkColorsExtension>()!.colors;
}

TextStyle rkHeadingStyle({double fontSize = 32, Color? color}) {
  return GoogleFonts.barlowCondensed(
    fontSize: fontSize,
    fontWeight: FontWeight.w800,
    height: 0.95,
    letterSpacing: -0.2,
    color: color,
  );
}
