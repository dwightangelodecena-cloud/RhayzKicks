import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum ThemePreference { systemDefault, light, dark }

const _prefsKey = 'rk_theme_preference';
const _dayStartHour = 6; // 6:00 AM
const _dayEndHour = 18; // 6:00 PM

Brightness _computeTimeBasedTheme() {
  final hour = DateTime.now().hour;
  return hour >= _dayStartHour && hour < _dayEndHour ? Brightness.light : Brightness.dark;
}

Brightness _resolveEffective(ThemePreference pref) {
  switch (pref) {
    case ThemePreference.light:
      return Brightness.light;
    case ThemePreference.dark:
      return Brightness.dark;
    case ThemePreference.systemDefault:
      return _computeTimeBasedTheme();
  }
}

class ThemeController extends ChangeNotifier {
  ThemePreference _preference = ThemePreference.systemDefault;
  Brightness _effective = _resolveEffective(ThemePreference.systemDefault);
  Timer? _timer;

  ThemePreference get preference => _preference;
  Brightness get effectiveBrightness => _effective;

  ThemeController() {
    _load();
    _restartTimerIfNeeded();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_prefsKey);
    final restored = switch (stored) {
      'light' => ThemePreference.light,
      'dark' => ThemePreference.dark,
      _ => ThemePreference.systemDefault,
    };
    _preference = restored;
    _effective = _resolveEffective(restored);
    _restartTimerIfNeeded();
    notifyListeners();
  }

  Future<void> setPreference(ThemePreference next) async {
    _preference = next;
    _effective = _resolveEffective(next);
    _restartTimerIfNeeded();
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, switch (next) {
      ThemePreference.light => 'light',
      ThemePreference.dark => 'dark',
      ThemePreference.systemDefault => 'default',
    });
  }

  // Re-checks every minute so "Default" flips automatically at the day/night
  // boundary while the app stays open, without needing a restart.
  void _restartTimerIfNeeded() {
    _timer?.cancel();
    if (_preference != ThemePreference.systemDefault) return;
    _timer = Timer.periodic(const Duration(seconds: 60), (_) {
      final next = _resolveEffective(ThemePreference.systemDefault);
      if (next != _effective) {
        _effective = next;
        notifyListeners();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
