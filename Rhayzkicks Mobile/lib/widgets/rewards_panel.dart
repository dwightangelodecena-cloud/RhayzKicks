import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/store_repository.dart';
import '../models/database_models.dart';
import '../state/auth_controller.dart';
import '../theme/app_theme.dart';

// loyalty_settings singleton (021_default_loyalty_earning.sql) — admin sets
// the on/off switch and rates in the web Admin → Loyalty tab. Mirrors web's
// lib/loyaltySettings.ts; falls back to the DB defaults if unreadable.
class LoyaltySettings {
  final bool isEnabled;
  final num pesosPerPoint;
  final int pointsPerVoucher;

  const LoyaltySettings({required this.isEnabled, required this.pesosPerPoint, required this.pointsPerVoucher});

  static const defaults = LoyaltySettings(isEnabled: true, pesosPerPoint: 100, pointsPerVoucher: 100);

  static Future<LoyaltySettings> fetch() async {
    try {
      final row = await Supabase.instance.client
          .from('loyalty_settings')
          .select('is_enabled, pesos_per_point, points_per_voucher')
          .eq('id', true)
          .maybeSingle();
      if (row == null) return defaults;
      return LoyaltySettings(
        isEnabled: row['is_enabled'] as bool? ?? true,
        pesosPerPoint: num.tryParse('${row['pesos_per_point']}') ?? 100,
        pointsPerVoucher: int.tryParse('${row['points_per_voucher']}') ?? 100,
      );
    } catch (_) {
      return defaults;
    }
  }
}

// Mirrors web's RewardsPanel.tsx: progress to the next voucher, redemption
// options (voucher_templates), and the customer's own vouchers. Redeeming
// goes through the redeem_points RPC, which checks the balance and the
// on/off switch and deducts points server-side.
class RewardsPanel extends StatefulWidget {
  const RewardsPanel({super.key});

  @override
  State<RewardsPanel> createState() => _RewardsPanelState();
}

class _RewardsPanelState extends State<RewardsPanel> {
  SupabaseClient get _client => Supabase.instance.client;

  LoyaltySettings _settings = LoyaltySettings.defaults;
  List<VoucherTemplate> _templates = [];
  List<Voucher> _vouchers = [];
  bool _loading = true;
  String? _redeemingId;
  String? _message;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final customerId = context.read<AuthController>().customer?.id;
    if (customerId == null) return;
    try {
      final settingsFuture = LoyaltySettings.fetch();
      final templatesFuture = _client.from('voucher_templates').select().eq('is_active', true).order('value');
      final vouchersFuture =
          _client.from('vouchers').select().eq('customer_id', customerId).order('created_at', ascending: false);
      final settings = await settingsFuture;
      final templateRows = await templatesFuture;
      final voucherRows = await vouchersFuture;
      if (!mounted) return;
      setState(() {
        _settings = settings;
        _templates = templateRows.map(VoucherTemplate.fromMap).toList();
        _vouchers = voucherRows.map(Voucher.fromMap).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Could not load rewards. Pull down or reopen to try again.';
      });
    }
  }

  Future<void> _redeem(VoucherTemplate template) async {
    final auth = context.read<AuthController>();
    final customerId = auth.customer?.id;
    if (customerId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Redeem ${template.label}?'),
        content: Text('This uses ${_settings.pointsPerVoucher} of your points for a ${formatPeso(template.value)} voucher.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text('Use ${_settings.pointsPerVoucher} pts')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() {
      _redeemingId = template.id;
      _message = null;
      _error = null;
    });
    try {
      await _client.rpc('redeem_points', params: {'p_customer_id': customerId, 'p_template_id': template.id});
      await auth.refreshCustomer();
      await _load();
      if (!mounted) return;
      setState(() => _message = 'Redeemed! Your "${template.label}" voucher is below — pick it at online checkout or show the code in store.');
    } on PostgrestException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not redeem right now. Please try again.');
    } finally {
      if (mounted) setState(() => _redeemingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final points = context.watch<AuthController>().customer?.loyaltyPoints ?? 0;
    final cost = _settings.pointsPerVoucher;
    final canRedeem = _settings.isEnabled && points >= cost;
    final active = _vouchers.where((v) => !v.redeemed).toList();
    final used = _vouchers.where((v) => v.redeemed).toList();
    const gold = Color(0xFFF5B400);
    const green = Color(0xFF0CA30C);

    Widget sectionTitle(String text) => Padding(
          padding: const EdgeInsets.only(top: 24, bottom: 10),
          child: Text(
            text.toUpperCase(),
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.9, color: colors.textMuted),
          ),
        );

    Widget row({required Widget left, required Widget right, bool faded = false}) => Opacity(
          opacity: faded ? 0.55 : 1,
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(border: Border.all(color: colors.border), borderRadius: BorderRadius.circular(12)),
            child: Row(children: [Expanded(child: left), const SizedBox(width: 10), right]),
          ),
        );

    final note = TextStyle(fontSize: 13, height: 1.4, color: colors.textMuted);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        if (_settings.isEnabled) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: (points / cost).clamp(0, 1).toDouble(),
              minHeight: 8,
              backgroundColor: colors.border,
              valueColor: const AlwaysStoppedAnimation(gold),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            points >= cost
                ? 'You have enough points to redeem a voucher ($cost pts each).'
                : '${cost - points} more points to your next voucher. You earn 1 point for every ${formatPeso(_settings.pesosPerPoint)} spent.',
            style: note,
          ),
        ] else
          Text(
            "The loyalty program is paused right now — purchases aren't earning points and redeeming is unavailable. Your points and vouchers are safe.",
            style: note,
          ),
        if (_message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_message!, style: note.copyWith(color: green))),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: note.copyWith(color: colors.accentRed))),
        if (_settings.isEnabled) ...[
          sectionTitle('Redeem Points'),
          if (_loading)
            Text('Loading…', style: note)
          else if (_templates.isEmpty)
            Text('No rewards available right now — check back soon.', style: note)
          else
            for (final t in _templates)
              row(
                left: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.label, style: TextStyle(fontWeight: FontWeight.w700, color: colors.text)),
                    const SizedBox(height: 2),
                    Text('${formatPeso(t.value)} voucher · $cost pts', style: note),
                  ],
                ),
                right: FilledButton(
                  onPressed: canRedeem && _redeemingId == null ? () => _redeem(t) : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: colors.text,
                    foregroundColor: colors.bg,
                    shape: const StadiumBorder(),
                  ),
                  child: Text(
                    _redeemingId == t.id ? 'REDEEMING…' : 'REDEEM',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                  ),
                ),
              ),
        ],
        sectionTitle('My Vouchers'),
        if (active.isEmpty && used.isEmpty) Text('No vouchers yet.', style: note),
        for (final v in active)
          row(
            left: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SelectableText(v.code, style: TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800, fontSize: 16, color: colors.text)),
                const SizedBox(height: 2),
                Text('${formatPeso(v.value)} off · pick it at online checkout or show the code in store', style: note),
              ],
            ),
            right: Text('Available', style: note.copyWith(color: green)),
          ),
        for (final v in used)
          row(
            faded: true,
            left: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(v.code, style: TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800, fontSize: 16, color: colors.text)),
                const SizedBox(height: 2),
                Text('${formatPeso(v.value)} off', style: note),
              ],
            ),
            right: Text('Used', style: note),
          ),
      ],
    );
  }
}
