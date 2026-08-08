import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/password_rules.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/rk_logo_badge.dart';

enum AuthMode { signIn, join }

const _perks = ['Free Shipping', 'Early Access', 'Member Discounts', 'Exclusive Drops'];

// Mirrors web's AuthPage.tsx (dark hero panel + white form card), wired to
// real Supabase email/password + Google OAuth.
class AuthScreen extends StatefulWidget {
  final AuthMode mode;

  const AuthScreen({super.key, required this.mode});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late AuthMode _mode = widget.mode;
  bool _agreed = false;
  bool _submitting = false;
  String? _error;
  String? _success;

  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    for (final c in [_fullNameController, _emailController, _passwordController, _confirmPasswordController]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool get _isJoin => _mode == AuthMode.join;

  bool get _canSubmit {
    if (_submitting) return false;
    if (_isJoin) {
      return _fullNameController.text.isNotEmpty &&
          _emailController.text.isNotEmpty &&
          passwordMeetsRequirements(_passwordController.text) &&
          _passwordController.text == _confirmPasswordController.text &&
          _agreed;
    }
    return _emailController.text.isNotEmpty && _passwordController.text.isNotEmpty;
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });

    try {
      if (_isJoin) {
        await Supabase.instance.client.auth.signUp(
          email: _emailController.text,
          password: _passwordController.text,
          data: {'full_name': _fullNameController.text},
        );
        setState(() => _success = 'Account created! Check your email to confirm, then sign in.');
      } else {
        await Supabase.instance.client.auth.signInWithPassword(
          email: _emailController.text,
          password: _passwordController.text,
        );
        if (mounted) Navigator.of(context).pop();
      }
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _continueWithGoogle() async {
    setState(() {
      _error = null;
      _success = null;
    });
    try {
      await Supabase.instance.client.auth.signInWithOAuth(OAuthProvider.google);
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isJoin = _isJoin;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        onPressed: () => Navigator.maybePop(context),
                      ),
                    ],
                  ),
                  const RkLogoBadge(size: 72),
                  const SizedBox(height: 16),
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(text: 'RHAYZ', style: rkHeadingStyle(fontSize: 34, color: Colors.white)),
                        TextSpan(text: '.', style: rkHeadingStyle(fontSize: 34, color: AppColors.dark.accentRed)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    isJoin
                        ? 'Join thousands of members enjoying exclusive drops, free shipping, and early access to every new release.'
                        : 'Welcome back. Sign in to access your orders, wishlist, and exclusive member benefits.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white70, fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _Perk(label: _perks[0])),
                          const SizedBox(width: 16),
                          Expanded(child: _Perk(label: _perks[1])),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(child: _Perk(label: _perks[2])),
                          const SizedBox(width: 16),
                          Expanded(child: _Perk(label: _perks[3])),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              width: double.infinity,
              decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 48),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: const Color(0xFFF0F0F0), borderRadius: BorderRadius.circular(999)),
                    child: Row(
                      children: [
                        Expanded(
                          child: _AuthTab(
                            label: 'Sign In',
                            active: !isJoin,
                            onTap: () => setState(() {
                              _mode = AuthMode.signIn;
                              _error = null;
                              _success = null;
                            }),
                          ),
                        ),
                        Expanded(
                          child: _AuthTab(
                            label: 'Join Us',
                            active: isJoin,
                            onTap: () => setState(() {
                              _mode = AuthMode.join;
                              _error = null;
                              _success = null;
                            }),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (isJoin) _AuthField(label: 'Full Name', hint: 'Maria Santos', controller: _fullNameController),
                  _AuthField(
                    label: 'Email Address',
                    hint: 'maria@example.com',
                    keyboardType: TextInputType.emailAddress,
                    controller: _emailController,
                  ),
                  _PasswordField(
                    label: 'Password',
                    hint: isJoin ? 'At least 8 characters' : 'Your password',
                    controller: _passwordController,
                  ),
                  if (isJoin)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: passwordRequirements.map((r) {
                          final met = r.test(_passwordController.text);
                          final color = met ? const Color(0xFF1A9C4A) : const Color(0xFF999999);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              children: [
                                Container(
                                  width: 14,
                                  height: 14,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: met ? color : Colors.transparent,
                                    border: Border.all(color: color, width: 1.5),
                                  ),
                                  child: met ? const Icon(Icons.check, size: 10, color: Colors.white) : null,
                                ),
                                const SizedBox(width: 8),
                                Text(r.label, style: TextStyle(fontSize: 12, color: color)),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  if (isJoin) _PasswordField(label: 'Confirm Password', hint: 'Repeat your password', controller: _confirmPasswordController),
                  if (isJoin && _confirmPasswordController.text.isNotEmpty && _confirmPasswordController.text != _passwordController.text)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: Text('Passwords don\'t match.', style: TextStyle(color: Colors.red, fontSize: 12)),
                    ),
                  if (isJoin)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 22,
                            height: 22,
                            child: Checkbox(
                              value: _agreed,
                              onChanged: (v) => setState(() => _agreed = v ?? false),
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text.rich(
                              TextSpan(
                                text: 'I agree to the ',
                                style: TextStyle(fontSize: 13, color: Colors.black54),
                                children: [
                                  TextSpan(text: 'Terms of Use', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.black)),
                                  TextSpan(text: ' and '),
                                  TextSpan(text: 'Privacy Policy', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.black)),
                                  TextSpan(text: '.'),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                    ),
                  if (_success != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(_success!, style: const TextStyle(color: Color(0xFF1A9C4A), fontSize: 13)),
                    ),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: _canSubmit ? _submit : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.black38,
                      disabledForegroundColor: Colors.white70,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: const StadiumBorder(),
                      elevation: 0,
                    ),
                    child: Text(
                      _submitting ? 'Please Wait…' : (isJoin ? 'Create Account' : 'Sign In'),
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.6),
                    ),
                  ),
                  if (!isJoin)
                    Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: TextButton(
                        onPressed: () {},
                        child: const Text(
                          'Forgot your password?',
                          style: TextStyle(color: Colors.black54, fontSize: 13, decoration: TextDecoration.underline),
                        ),
                      ),
                    ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: _OrDivider(),
                  ),
                  OutlinedButton.icon(
                    onPressed: _continueWithGoogle,
                    icon: const _GoogleBadge(),
                    label: const Text('Continue with Google', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.black)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: const StadiumBorder(),
                      side: const BorderSide(color: Color(0xFFDDDDDD)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Perk extends StatelessWidget {
  final String label;

  const _Perk({required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(color: AppColors.dark.accentRed, shape: BoxShape.circle),
          child: const Icon(Icons.check, size: 12, color: Colors.white),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}

class _AuthTab extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _AuthTab({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: active ? Colors.black : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(color: active ? Colors.white : const Color(0xFF444444), fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
    );
  }
}

class _AuthField extends StatelessWidget {
  final String label;
  final String hint;
  final TextEditingController controller;
  final TextInputType? keyboardType;

  const _AuthField({required this.label, required this.hint, required this.controller, this.keyboardType});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: Color(0xFF666666)),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            style: const TextStyle(fontSize: 15, color: Colors.black),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: Color(0xFFAAAAAA)),
              filled: true,
              fillColor: const Color(0xFFF7F7F7),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.black, width: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PasswordField extends StatefulWidget {
  final String label;
  final String hint;
  final TextEditingController controller;

  const _PasswordField({required this.label, required this.hint, required this.controller});

  @override
  State<_PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<_PasswordField> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.label.toUpperCase(),
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: Color(0xFF666666)),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: widget.controller,
            obscureText: !_visible,
            style: const TextStyle(fontSize: 15, color: Colors.black),
            decoration: InputDecoration(
              hintText: widget.hint,
              hintStyle: const TextStyle(color: Color(0xFFAAAAAA)),
              filled: true,
              fillColor: const Color(0xFFF7F7F7),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              suffixIcon: IconButton(
                icon: Icon(_visible ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: const Color(0xFF888888), size: 20),
                onPressed: () => setState(() => _visible = !_visible),
                tooltip: _visible ? 'Hide password' : 'Show password',
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.black, width: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(child: Divider(color: Color(0xFFE5E5E5))),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: Text('OR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF999999))),
        ),
        Expanded(child: Divider(color: Color(0xFFE5E5E5))),
      ],
    );
  }
}

class _GoogleBadge extends StatelessWidget {
  const _GoogleBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 18,
      height: 18,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFDDDDDD)),
      ),
      child: const Text(
        'G',
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF4285F4), height: 1),
      ),
    );
  }
}
