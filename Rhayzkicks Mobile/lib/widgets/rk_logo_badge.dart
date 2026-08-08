import 'package:flutter/material.dart';

class RkLogoBadge extends StatelessWidget {
  final double size;

  const RkLogoBadge({super.key, this.size = 28});

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: Image.asset(
        'assets/images/logo.png',
        width: size,
        height: size,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.high,
      ),
    );
  }
}
