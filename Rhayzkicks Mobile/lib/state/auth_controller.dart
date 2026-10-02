import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/database_models.dart';

Future<bool> _isCallerStaffAdmin() async {
  try {
    final data = await Supabase.instance.client.from('staff').select('role, is_active').maybeSingle();
    if (data == null) return false;
    return data['role'] == 'admin' && data['is_active'] == true;
  } catch (_) {
    return false;
  }
}

// A shopper who signs up doesn't automatically get a `customers` row (no DB
// trigger for it) — this finds their row by auth_user_id, or creates one on
// the spot the first time they're seen as a signed-in shopper. Relies on the
// customers_select_self/customers_insert_self RLS policies (policies.sql).
// Mirrors web's AuthContext.tsx ensureCustomerRow — keep both in sync.
Future<Customer?> _ensureCustomerRow(User user) async {
  try {
    final existing = await Supabase.instance.client.from('customers').select().eq('auth_user_id', user.id).maybeSingle();
    if (existing != null) return Customer.fromMap(existing);
    final fullName = user.userMetadata?['full_name'] as String? ?? '';
    final created = await Supabase.instance.client
        .from('customers')
        .insert({'auth_user_id': user.id, 'email': user.email ?? '', 'full_name': fullName})
        .select()
        .single();
    return Customer.fromMap(created);
  } catch (_) {
    return null;
  }
}

// Mirrors web's AuthContext.tsx — tracks the Supabase session so cart,
// wishlist, and checkout can be gated behind having an account. Staff/admin
// accounts share the same Supabase Auth session as shoppers (the `staff`
// table is what tells them apart), so a staff session is excluded here —
// it should not also count as a signed-in shopper.
class AuthController extends ChangeNotifier {
  User? _user;
  Customer? _customer;
  bool _isShopper = false;
  late final StreamSubscription<AuthState> _sub;
  RealtimeChannel? _customerChannel;
  String? _subscribedCustomerId;

  // Points gained since the last time the popup consumed them — set when the
  // live customer row shows loyalty_points going up (a paid web order or a
  // POS sale). LoyaltyPointsPopup reads this and calls clearEarnedPoints().
  int _pointsJustEarned = 0;
  int get pointsJustEarned => _pointsJustEarned;

  // Set when total_purchases goes up for the signed-in customer (a paid web
  // order or a POS sale) — LoyaltyPointsPopup then shows the Part 2 ad once
  // the points popup is closed. Mirrors web's OrderSuccessPage trigger.
  bool _part2Pending = false;
  bool get part2Pending => _part2Pending;

  void clearPart2() {
    if (!_part2Pending) return;
    _part2Pending = false;
    notifyListeners();
  }

  void clearEarnedPoints() {
    if (_pointsJustEarned == 0) return;
    _pointsJustEarned = 0;
    notifyListeners();
  }

  // Swaps in a fresh customer row, noting any loyalty point increase for the
  // same customer. Decreases (redeeming for a voucher) don't count.
  void _applyCustomer(Customer? next) {
    final prev = _customer;
    if (prev != null && next != null && prev.id == next.id && next.loyaltyPoints > prev.loyaltyPoints) {
      _pointsJustEarned += next.loyaltyPoints - prev.loyaltyPoints;
    }
    if (prev != null && next != null && prev.id == next.id && next.totalPurchases > prev.totalPurchases) {
      _part2Pending = true;
    }
    if (next == null) _part2Pending = false;
    _customer = next;
    _syncCustomerChannel();
  }

  // Mirrors web's AuthContext realtime subscription on the customers row.
  // Needs `customers` in the supabase_realtime publication (020_*.sql).
  void _syncCustomerChannel() {
    final id = _customer?.id;
    if (id == _subscribedCustomerId) return;
    final old = _customerChannel;
    _customerChannel = null;
    if (old != null) Supabase.instance.client.removeChannel(old);
    _subscribedCustomerId = id;
    if (id == null) return;
    _customerChannel = Supabase.instance.client
        .channel('customer-$id')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'customers',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'id', value: id),
          callback: (payload) {
            try {
              _applyCustomer(Customer.fromMap(payload.newRecord));
              notifyListeners();
            } catch (_) {
              // Malformed payload — the next refreshCustomer() will catch up.
            }
          },
        )
        .subscribe();
  }

  AuthController() {
    _syncFromSession(Supabase.instance.client.auth.currentSession);
    _sub = Supabase.instance.client.auth.onAuthStateChange.listen((state) {
      _syncFromSession(state.session);
    });
  }

  Future<void> _syncFromSession(Session? session) async {
    if (session == null) {
      _user = null;
      _applyCustomer(null);
      _pointsJustEarned = 0;
      _isShopper = false;
      notifyListeners();
      return;
    }
    final staff = await _isCallerStaffAdmin();
    _user = session.user;
    _isShopper = !staff;
    if (staff) {
      _applyCustomer(null);
      notifyListeners();
      return;
    }
    _applyCustomer(await _ensureCustomerRow(session.user));
    notifyListeners();
  }

  Future<void> refreshCustomer() async {
    final user = _user;
    if (user == null) return;
    try {
      final row = await Supabase.instance.client.from('customers').select().eq('auth_user_id', user.id).maybeSingle();
      if (row != null) {
        _applyCustomer(Customer.fromMap(row));
        notifyListeners();
      }
    } catch (_) {
      // Keep the last known customer row rather than clearing it on a blip.
    }
  }

  User? get user => _user;
  Customer? get customer => _customer;
  bool get isAuthenticated => _isShopper;

  @override
  void dispose() {
    _sub.cancel();
    final channel = _customerChannel;
    if (channel != null) Supabase.instance.client.removeChannel(channel);
    super.dispose();
  }
}
