import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:rhayzkicks_mobile/screens/home_screen.dart';
import 'package:rhayzkicks_mobile/state/auth_controller.dart';
import 'package:rhayzkicks_mobile/state/home_content_controller.dart';
import 'package:rhayzkicks_mobile/state/shop_controller.dart';
import 'package:rhayzkicks_mobile/supabase_config.dart';
import 'package:rhayzkicks_mobile/theme/app_theme.dart';
import 'package:rhayzkicks_mobile/theme/theme_controller.dart';

void main() {
  testWidgets('Home screen renders the Rhayz Kicks wordmark', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: SupabaseConfig.url,
      publishableKey: SupabaseConfig.publishableKey,
      authOptions: const FlutterAuthClientOptions(autoRefreshToken: false),
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ThemeController()),
          ChangeNotifierProvider(create: (_) => ShopController()),
          ChangeNotifierProvider(create: (_) => AuthController()),
          ChangeNotifierProvider(create: (_) => HomeContentController()..load()),
        ],
        child: Consumer<ThemeController>(
          builder: (context, controller, _) => MaterialApp(
            theme: buildTheme(controller.effectiveBrightness),
            home: const HomeScreen(),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('RHAYZ.'), findsWidgets);
  });
}
