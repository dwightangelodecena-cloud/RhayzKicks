import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/home_screen.dart';
import 'state/auth_controller.dart';
import 'state/home_content_controller.dart';
import 'state/shop_controller.dart';
import 'supabase_config.dart';
import 'theme/app_theme.dart';
import 'theme/theme_controller.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: SupabaseConfig.url, publishableKey: SupabaseConfig.publishableKey);
  runApp(const RhayzKicksApp());
}

class RhayzKicksApp extends StatelessWidget {
  const RhayzKicksApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeController()),
        ChangeNotifierProvider(create: (_) => AuthController()),
        ChangeNotifierProxyProvider<AuthController, ShopController>(
          create: (_) => ShopController(),
          update: (_, auth, shop) => shop!..setCustomerId(auth.customer?.id),
        ),
        ChangeNotifierProvider(create: (_) => HomeContentController()..load()),
      ],
      child: Consumer<ThemeController>(
        builder: (context, controller, _) {
          return MaterialApp(
            title: 'Rhayz Kicks',
            debugShowCheckedModeBanner: false,
            theme: buildTheme(controller.effectiveBrightness),
            home: const HomeScreen(),
          );
        },
      ),
    );
  }
}
