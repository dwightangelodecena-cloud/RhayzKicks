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

  AuthController() {
    _syncFromSession(Supabase.instance.client.auth.currentSession);
    _sub = Supabase.instance.client.auth.onAuthStateChange.listen((state) {
      _syncFromSession(state.session);
    });
  }

  Future<void> _syncFromSession(Session? session) async {
    if (session == null) {
      _user = null;
      _customer = null;
      _isShopper = false;
      notifyListeners();
      return;
    }
    final staff = await _isCallerStaffAdmin();
    _user = session.user;
    _isShopper = !staff;
    if (staff) {
      _customer = null;
      notifyListeners();
      return;
    }
    _customer = await _ensureCustomerRow(session.user);
    notifyListeners();
  }

  Future<void> refreshCustomer() async {
    final user = _user;
    if (user == null) return;
    try {
      final row = await Supabase.instance.client.from('customers').select().eq('auth_user_id', user.id).maybeSingle();
      if (row != null) {
        _customer = Customer.fromMap(row);
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
    super.dispose();
  }
}
