import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SectionEyebrow extends StatelessWidget {
  final String text;

  const SectionEyebrow(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.5,
        color: context.rkColors.textMuted,
      ),
    );
  }
}
