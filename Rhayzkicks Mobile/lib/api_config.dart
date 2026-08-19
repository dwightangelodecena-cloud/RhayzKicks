import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

// Points at the Laravel API (laravel-api/ at the repo root), which is the
// only thing that talks to Supabase now for product data — see
// lib/data/store_repository.dart. Run `php artisan serve` in laravel-api/
// before using the app.
class ApiConfig {
  static String get baseUrl {
    if (kIsWeb) return 'http://127.0.0.1:8000/api';
    if (Platform.isAndroid) return 'http://10.0.2.2:8000/api'; // Android emulator alias for host localhost
    return 'http://127.0.0.1:8000/api'; // iOS simulator, Windows/macOS/Linux desktop
  }
}
