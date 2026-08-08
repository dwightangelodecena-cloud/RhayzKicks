import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../screens/auth_screen.dart';
import '../screens/category_screen.dart';
import '../screens/collections_screen.dart';
import '../screens/help_screen.dart';
import '../screens/profile_screen.dart';
import '../state/auth_controller.dart';
import '../state/home_content_controller.dart';
import '../theme/app_theme.dart';
import 'rk_logo_badge.dart';

const _guestLinks = ['Help', 'Join Us', 'Sign In'];
const _memberLinks = ['Help', 'My Account', 'Sign Out'];

void _openUtilityLink(BuildContext context, String link) {
  Navigator.pop(context);
  switch (link) {
    case 'Help':
      Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpScreen()));
    case 'Join Us':
      Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen(mode: AuthMode.join)));
    case 'Sign In':
      Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen(mode: AuthMode.signIn)));
    case 'My Account':
      Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
    case 'Sign Out':
      Supabase.instance.client.auth.signOut();
  }
}

// Nav links mirror web's Header.tsx navLinks: one per nav_categories row
// (admin-managed on web) plus a static Collections link at the end.
class RkNavDrawer extends StatelessWidget {
  const RkNavDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final navCategories = context.watch<HomeContentController>().navCategories;
    final isAuthenticated = context.watch<AuthController>().isAuthenticated;
    final utilityLinks = isAuthenticated ? _memberLinks : _guestLinks;

    return Drawer(
      backgroundColor: colors.bg,
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                const RkLogoBadge(size: 38),
                const SizedBox(width: 10),
                Text('RHAYZ.', style: rkHeadingStyle(fontSize: 20, color: colors.text)),
              ],
            ),
            const SizedBox(height: 24),
            ...navCategories.map(
              (category) => ListTile(
                title: Text(
                  category.label,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                    color: category.label == 'Sale' ? colors.accentRed : colors.text,
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => CategoryScreen(slug: category.slug)));
                },
              ),
            ),
            ListTile(
              title: Text('Collections', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: colors.text)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const CollectionsScreen()));
              },
            ),
            Divider(color: colors.border, height: 32),
            ...utilityLinks.map(
              (link) => ListTile(
                title: Text(link, style: TextStyle(color: colors.textMuted, fontSize: 14)),
                onTap: () => _openUtilityLink(context, link),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
