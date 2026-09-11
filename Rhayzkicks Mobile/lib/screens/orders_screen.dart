import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/store_repository.dart';
import '../models/database_models.dart';
import '../state/auth_controller.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/delivery_stepper.dart';
import '../widgets/page_hero.dart';

// Mirrors AccountPage.tsx's order grouping — split by status instead of one
// flat list, so a long history doesn't bury what's still pending.
const _orderGroups = [
  ('pending', 'Pending Payment'),
  ('paid', 'Paid'),
  ('fulfilled', 'Completed'),
  ('cancelled', 'Cancelled'),
];

// Customer-facing order tracking — mirrors the "My Orders" section of web's
// AccountPage.tsx, but as its own screen since mobile's profile screen has
// no equivalent card list slot for something this info-dense. Online orders
// only (mobile has no in-store sales history equivalent to show alongside).
class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<OnlineOrder>? _orders;
  String? _error;
  String? _expandedId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_orders == null && _error == null) _load();
  }

  Future<void> _load() async {
    final customer = context.read<AuthController>().customer;
    if (customer == null) return;
    try {
      final orders = await getMyOnlineOrders(customer.id);
      if (mounted) setState(() => _orders = orders);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(backgroundColor: colors.bg, foregroundColor: colors.text, elevation: 0),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          const PageHero(title: 'My Orders', subtitle: 'Track packing, pickup, and delivery for your online orders.'),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
            child: _buildBody(colors),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(AppColors colors) {
    if (_error != null) {
      return Text(_error!, style: TextStyle(color: colors.accentRed, fontSize: 13));
    }
    if (_orders == null) {
      return const Center(child: Padding(padding: EdgeInsets.only(top: 40), child: CircularProgressIndicator()));
    }
    if (_orders!.isEmpty) {
      return Text('No online orders yet.', style: TextStyle(color: colors.textMuted, fontSize: 13));
    }

    final groups = <Widget>[];
    for (final (key, label) in _orderGroups) {
      final groupOrders = _orders!.where((o) => o.status == key).toList();
      if (groupOrders.isEmpty) continue;
      groups.add(_OrderGroup(
        label: label,
        orders: groupOrders,
        expandedId: _expandedId,
        onToggle: (id) => setState(() => _expandedId = _expandedId == id ? null : id),
      ));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: groups);
  }
}

class _OrderGroup extends StatelessWidget {
  final String label;
  final List<OnlineOrder> orders;
  final String? expandedId;
  final ValueChanged<String> onToggle;

  const _OrderGroup({required this.label, required this.orders, required this.expandedId, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                label.toUpperCase(),
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: colors.textMuted),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                decoration: BoxDecoration(color: colors.bgSecondary, borderRadius: BorderRadius.circular(999)),
                child: Text('${orders.length}', style: TextStyle(fontSize: 10, color: colors.textMuted)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...orders.map((o) => _OrderCard(
                order: o,
                expanded: expandedId == o.id,
                onTap: () => onToggle(o.id),
              )),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OnlineOrder order;
  final bool expanded;
  final VoidCallback onTap;

  const _OrderCard({required this.order, required this.expanded, required this.onTap});

  Color _statusColor(AppColors colors) {
    switch (order.status) {
      case 'fulfilled':
      case 'paid':
        return const Color(0xFF0CA30C);
      case 'cancelled':
        return colors.accentRed;
      default:
        return const Color(0xFF8A5A00);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final trackable = order.status == 'paid' || order.status == 'fulfilled';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(color: colors.bgSecondary, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: trackable ? onTap : null,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(order.orderNumber, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: colors.text)),
                        const SizedBox(height: 2),
                        Text(
                          '${order.createdAt.month}/${order.createdAt.day}/${order.createdAt.year}',
                          style: TextStyle(fontSize: 11.5, color: colors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  Text(formatPeso(order.total), style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: colors.text)),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: _statusColor(colors).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                    child: Text(
                      order.status.toUpperCase(),
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: _statusColor(colors), letterSpacing: 0.4),
                    ),
                  ),
                  if (trackable) ...[
                    const SizedBox(width: 6),
                    Icon(expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, size: 18, color: colors.textMuted),
                  ],
                ],
              ),
            ),
          ),
          if (trackable && expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 16),
              child: DeliveryStepper(
                stage: order.deliveryStage,
                packedAt: order.packedAt,
                pickedUpAt: order.pickedUpAt,
                receivedAt: order.receivedAt,
              ),
            ),
        ],
      ),
    );
  }
}
