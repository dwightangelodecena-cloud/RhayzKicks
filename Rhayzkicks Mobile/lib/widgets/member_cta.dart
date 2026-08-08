import 'package:flutter/material.dart';
import '../screens/auth_screen.dart';
import '../theme/app_theme.dart';
import 'rk_button.dart';
import 'rk_logo_badge.dart';

class MemberCTA extends StatelessWidget {
  const MemberCTA({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Column(
        children: [
          const RkLogoBadge(size: 54),
          const SizedBox(height: 12),
          Text('BECOME A MEMBER', style: rkHeadingStyle(fontSize: 26, color: colors.text), textAlign: TextAlign.center),
          const SizedBox(height: 12),
          Text(
            'Enjoy free delivery, member-only products, exclusive discounts, and priority access to every new Rhayz Kicks drop.',
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: [
              RkButton(
                label: 'Join Free Today',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AuthScreen(mode: AuthMode.join)),
                ),
              ),
              const RkButton(label: 'Learn More', style: RkButtonStyle.outline),
            ],
          ),
        ],
      ),
    );
  }
}
