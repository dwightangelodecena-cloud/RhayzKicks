import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../screens/profile_screen.dart';
import '../state/auth_controller.dart';
import '../theme/app_theme.dart';
import 'rewards_panel.dart';

// Mirrors web's LoyaltyPointsPopup.tsx. Wraps the whole app (MaterialApp
// builder) and pops a card over everything whenever AuthController reports
// loyalty points going up — the customers row is live over Realtime, so this
// fires for paid web orders and in-store POS sales alike. Also re-reads the
// customer row when the app comes back to the foreground, so points earned
// while it was backgrounded still get announced.
class LoyaltyPointsPopup extends StatefulWidget {
  final Widget child;
  final GlobalKey<NavigatorState> navigatorKey;

  const LoyaltyPointsPopup({super.key, required this.child, required this.navigatorKey});

  @override
  State<LoyaltyPointsPopup> createState() => _LoyaltyPointsPopupState();
}

class _LoyaltyPointsPopupState extends State<LoyaltyPointsPopup> with WidgetsBindingObserver {
  int _pointsPerVoucher = LoyaltySettings.defaults.pointsPerVoucher;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final s = await LoyaltySettings.fetch();
    if (mounted) setState(() => _pointsPerVoucher = s.pointsPerVoucher);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<AuthController>().refreshCustomer();
      _loadSettings();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final earned = auth.pointsJustEarned;
    final total = auth.customer?.loyaltyPoints ?? 0;

    return Stack(
      children: [
        widget.child,
        if (earned > 0)
          Positioned.fill(
            child: _PopupCard(
              earned: earned,
              total: total,
              pointsPerVoucher: _pointsPerVoucher,
              onClose: auth.clearEarnedPoints,
              onViewPoints: () {
                auth.clearEarnedPoints();
                widget.navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const ProfileScreen()));
              },
            ),
          ),
      ],
    );
  }
}

class _PopupCard extends StatelessWidget {
  final int earned;
  final int total;
  final int pointsPerVoucher;
  final VoidCallback onClose;
  final VoidCallback onViewPoints;

  const _PopupCard({required this.earned, required this.total, required this.pointsPerVoucher, required this.onClose, required this.onViewPoints});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    const gold = Color(0xFFF5B400);
    final note = total >= pointsPerVoucher ? ' — enough to redeem a voucher!' : ' — ${pointsPerVoucher - total} more to unlock a voucher.';

    return Material(
      color: Colors.black.withValues(alpha: 0.45),
      child: InkWell(
        onTap: onClose,
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.85, end: 1),
              duration: const Duration(milliseconds: 350),
              curve: Curves.easeOutBack,
              builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
              child: GestureDetector(
                onTap: () {}, // swallow taps so only the backdrop closes it
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 352),
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                  decoration: BoxDecoration(
                    color: colors.bg,
                    border: Border.all(color: colors.border),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [BoxShadow(color: Color(0x4D000000), blurRadius: 50, offset: Offset(0, 20))],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 68,
                        height: 68,
                        decoration: BoxDecoration(color: gold.withValues(alpha: 0.15), shape: BoxShape.circle),
                        child: const Icon(Icons.star_rounded, color: gold, size: 40),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'YOU EARNED LOYALTY POINTS!',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1, color: colors.textMuted),
                      ),
                      const SizedBox(height: 4),
                      Text('+$earned pts', style: rkHeadingStyle(fontSize: 44, color: colors.text)),
                      const SizedBox(height: 8),
                      Text.rich(
                        TextSpan(
                          style: TextStyle(fontSize: 14, height: 1.5, color: colors.textMuted),
                          children: [
                            const TextSpan(text: 'Thanks for your purchase. You now have '),
                            TextSpan(text: '$total', style: TextStyle(fontWeight: FontWeight.w800, color: colors.text)),
                            TextSpan(text: ' points$note'),
                          ],
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: onClose,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: colors.text,
                                side: BorderSide(color: colors.border),
                                shape: const StadiumBorder(),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                              child: const Text('NICE!', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton(
                              onPressed: onViewPoints,
                              style: FilledButton.styleFrom(
                                backgroundColor: colors.text,
                                foregroundColor: colors.bg,
                                shape: const StadiumBorder(),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                              child: const Text('VIEW POINTS', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
