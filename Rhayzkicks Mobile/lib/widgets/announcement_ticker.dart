import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/home_content_controller.dart';
import '../theme/app_theme.dart';

class AnnouncementTicker extends StatefulWidget {
  const AnnouncementTicker({super.key});

  @override
  State<AnnouncementTicker> createState() => _AnnouncementTickerState();
}

class _AnnouncementTickerState extends State<AnnouncementTicker> {
  int _index = 0;
  Timer? _timer;
  int? _autoplayCount;

  void _ensureAutoplay(int count) {
    if (_autoplayCount == count) return;
    _autoplayCount = count;
    _timer?.cancel();
    if (count < 2) return;
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      setState(() => _index = (_index + 1) % count);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final announcements = context.watch<HomeContentController>().announcements;
    if (announcements.isEmpty) return const SizedBox.shrink();
    _ensureAutoplay(announcements.length);

    final colors = context.rkColors;
    return Container(
      width: double.infinity,
      color: colors.bgSecondary,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: Text(
          announcements[_index % announcements.length].message,
          key: ValueKey(_index),
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: colors.text),
        ),
      ),
    );
  }
}
