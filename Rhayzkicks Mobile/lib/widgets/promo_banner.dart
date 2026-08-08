import 'package:flutter/material.dart';
import '../screens/auth_screen.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'rk_button.dart';
import 'rk_logo_badge.dart';

class PromoBanner extends StatelessWidget {
  const PromoBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.darkSurface,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Column(
        children: [
          const RkLogoBadge(size: 54),
          const SizedBox(height: 12),
          Text(
            'MEMBERS ONLY',
            style: TextStyle(color: context.rkColors.accentRed, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.5),
          ),
          const SizedBox(height: 8),
          Text('LIMITED DROPS', style: rkHeadingStyle(fontSize: 34, color: AppColors.darkSurfaceText), textAlign: TextAlign.center),
          Text('EVERY WEEK', style: rkHeadingStyle(fontSize: 34, color: AppColors.darkSurfaceText), textAlign: TextAlign.center),
          const SizedBox(height: 12),
          const Text(
            'Get early access to the most anticipated releases. Join Rhayz Kicks Members and never miss a drop again.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.darkSurfaceMuted, fontSize: 13),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: [
              RkButton(
                label: 'Join Free',
                onDark: true,
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AuthScreen(mode: AuthMode.join)),
                ),
              ),
              const RkButton(label: 'Notify Me', style: RkButtonStyle.outline, onDark: true),
            ],
          ),
        ],
      ),
    );
  }
}
