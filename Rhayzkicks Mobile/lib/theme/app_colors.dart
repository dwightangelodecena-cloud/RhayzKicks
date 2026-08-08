import 'package:flutter/material.dart';

class AppColors {
  final Color bg;
  final Color bgSecondary;
  final Color text;
  final Color textMuted;
  final Color border;
  final Color placeholderBg;
  final Color placeholderBorder;
  final Color placeholderText;
  final Color accentRed;

  const AppColors({
    required this.bg,
    required this.bgSecondary,
    required this.text,
    required this.textMuted,
    required this.border,
    required this.placeholderBg,
    required this.placeholderBorder,
    required this.placeholderText,
    required this.accentRed,
  });

  static const light = AppColors(
    bg: Color(0xFFFFFFFF),
    bgSecondary: Color(0xFFF7F7F7),
    text: Color(0xFF111111),
    textMuted: Color(0xFF6B6B6B),
    border: Color(0xFFE2E2E2),
    placeholderBg: Color(0xFFE8E8E8),
    placeholderBorder: Color(0xFFC9C9C9),
    placeholderText: Color(0xFF9A9A9A),
    accentRed: Color(0xFFE4002B),
  );

  // placeholderBg/Border/Text kept clearly lighter than `dark`'s bg so
  // placeholder boxes read as boxes, not empty background, even after
  // screenshot/compression crushes small differences between near-black tones.
  static const dark = AppColors(
    bg: Color(0xFF0A0A0A),
    bgSecondary: Color(0xFF131313),
    text: Color(0xFFFFFFFF),
    textMuted: Color(0xFF9A9A9A),
    border: Color(0xFF262626),
    placeholderBg: Color(0xFF2A2A2A),
    placeholderBorder: Color(0xFF4D4D4D),
    placeholderText: Color(0xFF9A9A9A),
    accentRed: Color(0xFFFF3B57),
  );

  // Sections that stay dark regardless of app theme (hero, promo banner, footer) —
  // mirrors the `--dark-surface` tokens in the web app's theme.css.
  static const darkSurface = Color(0xFF0D0D0D);
  static const darkSurfaceText = Color(0xFFFFFFFF);
  static const darkSurfaceMuted = Color(0xFFB3B3B3);
  static const darkSurfaceBorder = Color(0xFF2A2A2A);
  static const darkPlaceholderBg = Color(0xFF2A2A2A);
  static const darkPlaceholderBorder = Color(0xFF4D4D4D);
  static const darkPlaceholderText = Color(0xFF9A9A9A);
}
