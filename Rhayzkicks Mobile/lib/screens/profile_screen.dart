import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/store_repository.dart';
import '../models/database_models.dart';
import '../state/auth_controller.dart';
import '../theme/app_theme.dart';
import '../theme/theme_controller.dart';
import '../widgets/page_hero.dart';

// Mirrors web's AccountPage.tsx: profile info, address, rewards, theme
// (mobile-only — web's theme toggle stays where it already is), and
// privacy/security (change password). Reached from the nav drawer.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _streetController = TextEditingController();
  final _cityController = TextEditingController();
  final _provinceController = TextEditingController();
  final _zipController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _savingProfile = false;
  bool _savingAddress = false;
  bool _savingPassword = false;
  String? _profileMessage;
  String? _addressMessage;
  String? _passwordMessage;
  String? _passwordError;

  String? _loadedCustomerId;

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _provinceController.dispose();
    _zipController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _loadFrom(Customer customer) {
    if (_loadedCustomerId == customer.id) return;
    _loadedCustomerId = customer.id;
    _fullNameController.text = customer.fullName;
    _phoneController.text = customer.phone;
    _streetController.text = customer.street;
    _cityController.text = customer.city;
    _provinceController.text = customer.province;
    _zipController.text = customer.zipCode;
  }

  Future<void> _saveProfile(Customer customer) async {
    setState(() {
      _savingProfile = true;
      _profileMessage = null;
    });
    try {
      await Supabase.instance.client
          .from('customers')
          .update({'full_name': _fullNameController.text.trim(), 'phone': _phoneController.text.trim()})
          .eq('id', customer.id);
      if (!mounted) return;
      await context.read<AuthController>().refreshCustomer();
      setState(() => _profileMessage = 'Saved.');
    } catch (e) {
      setState(() => _profileMessage = e.toString());
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _saveAddress(Customer customer) async {
    setState(() {
      _savingAddress = true;
      _addressMessage = null;
    });
    try {
      await Supabase.instance.client.from('customers').update({
        'street': _streetController.text.trim(),
        'city': _cityController.text.trim(),
        'province': _provinceController.text.trim(),
        'zip_code': _zipController.text.trim(),
      }).eq('id', customer.id);
      if (!mounted) return;
      await context.read<AuthController>().refreshCustomer();
      setState(() => _addressMessage = 'Saved.');
    } catch (e) {
      setState(() => _addressMessage = e.toString());
    } finally {
      if (mounted) setState(() => _savingAddress = false);
    }
  }

  Future<void> _changePassword() async {
    setState(() {
      _passwordError = null;
      _passwordMessage = null;
    });
    if (_passwordController.text.length < 6) {
      setState(() => _passwordError = 'Password must be at least 6 characters.');
      return;
    }
    if (_passwordController.text != _confirmController.text) {
      setState(() => _passwordError = "Passwords don't match.");
      return;
    }
    setState(() => _savingPassword = true);
    try {
      await Supabase.instance.client.auth.updateUser(UserAttributes(password: _passwordController.text));
      _passwordController.clear();
      _confirmController.clear();
      if (mounted) setState(() => _passwordMessage = 'Password updated.');
    } catch (e) {
      if (mounted) setState(() => _passwordError = e.toString());
    } finally {
      if (mounted) setState(() => _savingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final customer = context.watch<AuthController>().customer;

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(backgroundColor: colors.bg, foregroundColor: colors.text, elevation: 0),
      body: customer == null
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              top: false,
              child: Builder(builder: (context) {
                _loadFrom(customer);
                return ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    const PageHero(title: 'My Account', subtitle: 'Manage your profile, address, and security settings.'),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _Card(
                            title: 'Profile',
                            description: 'Your name and contact number.',
                            saving: _savingProfile,
                            message: _profileMessage,
                            saveLabel: 'Save Profile',
                            onSave: () => _saveProfile(customer),
                            children: [
                              _LabeledField(label: 'Full name', controller: _fullNameController),
                              _LabeledField(label: 'Email', initialValue: customer.email, enabled: false),
                              _LabeledField(label: 'Phone', controller: _phoneController, keyboardType: TextInputType.phone),
                            ],
                          ),
                          _Card(
                            title: 'Shipping Address',
                            description: 'Used to pre-fill delivery details at checkout.',
                            saving: _savingAddress,
                            message: _addressMessage,
                            saveLabel: 'Save Address',
                            onSave: () => _saveAddress(customer),
                            children: [
                              _LabeledField(label: 'Street', controller: _streetController),
                              _LabeledField(label: 'City', controller: _cityController),
                              _LabeledField(label: 'Province', controller: _provinceController),
                              _LabeledField(label: 'ZIP Code', controller: _zipController),
                            ],
                          ),
                          _Card(
                            title: 'Rewards',
                            description: 'Earned from purchases made in-store or online.',
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: _Stat(value: '${customer.loyaltyPoints}', label: 'Loyalty Points'),
                                  ),
                                  Expanded(
                                    child: _Stat(value: formatPeso(customer.totalPurchases), label: 'Total Purchases'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const _ThemeCard(),
                          _Card(
                            title: 'Privacy & Security',
                            description: 'Change the password used to sign in.',
                            saving: _savingPassword,
                            message: _passwordMessage,
                            errorMessage: _passwordError,
                            saveLabel: 'Update Password',
                            onSave: _changePassword,
                            children: [
                              _LabeledField(label: 'New password', controller: _passwordController, obscureText: true),
                              _LabeledField(label: 'Confirm new password', controller: _confirmController, obscureText: true),
                            ],
                          ),
                          const SizedBox(height: 8),
                          OutlinedButton(
                            onPressed: () => Supabase.instance.client.auth.signOut(),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: colors.text,
                              side: BorderSide(color: colors.border),
                              shape: const StadiumBorder(),
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            ),
                            child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w800)),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              }),
            ),
    );
  }
}

class _Card extends StatelessWidget {
  final String title;
  final String? description;
  final List<Widget> children;
  final bool saving;
  final String? message;
  final String? errorMessage;
  final String? saveLabel;
  final VoidCallback? onSave;

  const _Card({
    required this.title,
    this.description,
    required this.children,
    this.saving = false,
    this.message,
    this.errorMessage,
    this.saveLabel,
    this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(border: Border.all(color: colors.border), borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: rkHeadingStyle(fontSize: 18, color: colors.text)),
          if (description != null) ...[
            const SizedBox(height: 2),
            Text(description!, style: TextStyle(fontSize: 12.5, color: colors.textMuted)),
          ],
          const SizedBox(height: 14),
          ...children,
          if (onSave != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                ElevatedButton(
                  onPressed: saving ? null : onSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors.text,
                    foregroundColor: colors.bg,
                    shape: const StadiumBorder(),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    elevation: 0,
                  ),
                  child: Text(saving ? 'Saving…' : (saveLabel ?? 'Save')),
                ),
                const SizedBox(width: 10),
                if (message != null) Expanded(child: Text(message!, style: TextStyle(fontSize: 12.5, color: colors.textMuted))),
                if (errorMessage != null) Expanded(child: Text(errorMessage!, style: TextStyle(fontSize: 12.5, color: colors.accentRed))),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  final String label;
  final TextEditingController? controller;
  final String? initialValue;
  final bool enabled;
  final bool obscureText;
  final TextInputType? keyboardType;

  const _LabeledField({
    required this.label,
    this.controller,
    this.initialValue,
    this.enabled = true,
    this.obscureText = false,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: colors.textMuted)),
          const SizedBox(height: 4),
          TextField(
            controller: controller,
            enabled: enabled,
            obscureText: obscureText,
            keyboardType: keyboardType,
            style: TextStyle(color: enabled ? colors.text : colors.textMuted),
            decoration: InputDecoration(
              isDense: true,
              hintText: initialValue,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: colors.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: colors.border)),
              disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: colors.border)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;

  const _Stat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: rkHeadingStyle(fontSize: 24, color: colors.text)),
        Text(label, style: TextStyle(fontSize: 12, color: colors.textMuted)),
      ],
    );
  }
}

class _ThemeCard extends StatelessWidget {
  const _ThemeCard();

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final controller = context.watch<ThemeController>();

    Widget option(String label, ThemePreference pref) {
      final active = controller.preference == pref;
      return InkWell(
        onTap: () => context.read<ThemeController>().setPreference(pref),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          child: Row(
            children: [
              Expanded(
                child: Text(label, style: TextStyle(color: colors.text, fontWeight: active ? FontWeight.w700 : FontWeight.w500)),
              ),
              if (active) Icon(Icons.check, color: colors.accentRed, size: 18),
            ],
          ),
        ),
      );
    }

    return _Card(
      title: 'Theme',
      description: 'Choose light, dark, or switch automatically with the time of day.',
      children: [
        option('Default (Auto day/night)', ThemePreference.systemDefault),
        option('Light', ThemePreference.light),
        option('Dark', ThemePreference.dark),
      ],
    );
  }
}
