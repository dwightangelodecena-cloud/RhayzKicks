import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../theme/app_theme.dart';

// Mirrors web's VideoAdPopup (Part 1) and Part2Ad (Part 2). The clips stream
// from the live website so the app stays small and an ad swapped on the web
// (web/public/videos/) updates here too.
const String kAdBaseUrl = 'https://rhayz-kicks.vercel.app/videos';
const String kPart1AdUrl = '$kAdBaseUrl/rhayz-ad.mp4';
const String kPart2AdUrl = '$kAdBaseUrl/rhayz-ad-part2.mp4';

/// A looping video that fills its box. Starts muted (autoplay with sound is
/// blocked on the web build and rude on phones); [muted] toggles it.
class AdVideo extends StatefulWidget {
  final String url;
  final bool muted;
  final bool autoplay;
  final bool loop;
  final BoxFit fit;

  const AdVideo({super.key, required this.url, this.muted = true, this.autoplay = true, this.loop = true, this.fit = BoxFit.cover});

  @override
  State<AdVideo> createState() => _AdVideoState();
}

class _AdVideoState extends State<AdVideo> {
  late final VideoPlayerController _controller;
  bool _ready = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    _controller.initialize().then((_) {
      if (!mounted) return;
      _controller
        ..setLooping(widget.loop)
        ..setVolume(widget.muted ? 0 : 1);
      if (widget.autoplay) _controller.play();
      setState(() => _ready = true);
    }).catchError((_) {
      if (mounted) setState(() => _failed = true);
    });
  }

  @override
  void didUpdateWidget(AdVideo old) {
    super.didUpdateWidget(old);
    if (old.muted != widget.muted && _ready) _controller.setVolume(widget.muted ? 0 : 1);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void togglePlay() {
    if (!_ready) return;
    setState(() => _controller.value.isPlaying ? _controller.pause() : _controller.play());
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return const ColoredBox(
        color: Colors.black,
        child: Center(child: Text("Couldn't load the video", style: TextStyle(color: Colors.white70, fontSize: 12))),
      );
    }
    if (!_ready) {
      return const ColoredBox(
        color: Colors.black,
        child: Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white54))),
      );
    }
    final size = _controller.value.size;
    return ColoredBox(
      color: Colors.black,
      child: ClipRect(
        child: FittedBox(
          fit: widget.fit,
          child: SizedBox(width: size.width, height: size.height, child: VideoPlayer(_controller)),
        ),
      ),
    );
  }
}

class _SoundButton extends StatelessWidget {
  final bool muted;
  final VoidCallback onTap;
  const _SoundButton({required this.muted, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.55),
      shape: const StadiumBorder(side: BorderSide(color: Colors.white24)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(muted ? Icons.volume_off_rounded : Icons.volume_up_rounded, size: 18, color: Colors.white),
              const SizedBox(width: 6),
              Text(muted ? 'Sound on' : 'Mute', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Part 1

/// Floating "AD" mini player for the home screen (web: VideoAdPopup).
/// Tap to watch full screen; × hides it until the app is restarted.
class Part1AdBubble extends StatefulWidget {
  const Part1AdBubble({super.key});

  // Dismissed for this app session (like web's sessionStorage flag).
  static bool dismissed = false;

  @override
  State<Part1AdBubble> createState() => _Part1AdBubbleState();
}

class _Part1AdBubbleState extends State<Part1AdBubble> {
  bool _muted = true;

  void _openFull() {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black87,
        pageBuilder: (_, _, _) => const _FullScreenAd(url: kPart1AdUrl, tag: 'AD'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (Part1AdBubble.dismissed) return const SizedBox.shrink();
    return Positioned(
      right: 12,
      bottom: 12 + MediaQuery.of(context).padding.bottom,
      child: Material(
        elevation: 10,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        color: Colors.black,
        child: SizedBox(
          width: 150,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // The video surface itself doesn't take taps (on web it's an HTML
              // element), so a transparent layer on top catches them.
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AdVideo(url: kPart1AdUrl, muted: _muted),
                    Positioned.fill(
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: _openFull,
                        child: const Align(
                          alignment: Alignment.topRight,
                          child: Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.open_in_full_rounded, size: 14, color: Colors.white70),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                color: const Color(0xFF111111),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                child: Row(
                  children: [
                    const Text('AD', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1)),
                    const Spacer(),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      iconSize: 16,
                      color: Colors.white,
                      tooltip: _muted ? 'Sound on' : 'Mute',
                      onPressed: () => setState(() => _muted = !_muted),
                      icon: Icon(_muted ? Icons.volume_off_rounded : Icons.volume_up_rounded),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      iconSize: 16,
                      color: Colors.white,
                      tooltip: 'Close ad',
                      onPressed: () => setState(() => Part1AdBubble.dismissed = true),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FullScreenAd extends StatefulWidget {
  final String url;
  final String tag;
  const _FullScreenAd({required this.url, required this.tag});

  @override
  State<_FullScreenAd> createState() => _FullScreenAdState();
}

class _FullScreenAdState extends State<_FullScreenAd> {
  bool _muted = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                children: [
                  AspectRatio(aspectRatio: 16 / 9, child: AdVideo(url: widget.url, muted: _muted, fit: BoxFit.contain)),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: IconButton.filled(
                      style: IconButton.styleFrom(backgroundColor: Colors.black54),
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded, color: Colors.white),
                    ),
                  ),
                  Positioned(bottom: 8, right: 8, child: _SoundButton(muted: _muted, onTap: () => setState(() => _muted = !_muted))),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Part 2

/// Full-screen "you unlocked Part 2" overlay, shown after a purchase
/// (web: Part2AdModal on the order success page).
class Part2AdOverlay extends StatefulWidget {
  final VoidCallback onClose;
  final VoidCallback onViewInAccount;
  const Part2AdOverlay({super.key, required this.onClose, required this.onViewInAccount});

  @override
  State<Part2AdOverlay> createState() => _Part2AdOverlayState();
}

class _Part2AdOverlayState extends State<Part2AdOverlay> {
  bool _muted = true;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.75),
      child: InkWell(
        onTap: widget.onClose,
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: GestureDetector(
                onTap: () {}, // keep taps inside the card from closing it
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 560),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0B0B0B),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [BoxShadow(color: Color(0x80000000), blurRadius: 60, offset: Offset(0, 24))],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Stack(
                        children: [
                          AspectRatio(aspectRatio: 16 / 9, child: AdVideo(url: kPart2AdUrl, muted: _muted)),
                          Positioned(
                            top: 10,
                            left: 10,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(color: const Color(0xFFE4002B), borderRadius: BorderRadius.circular(999)),
                              child: const Text(
                                'PART 2 · UNLOCKED',
                                style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1),
                              ),
                            ),
                          ),
                          Positioned(bottom: 10, right: 10, child: _SoundButton(muted: _muted, onTap: () => setState(() => _muted = !_muted))),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('THANKS FOR COPPING A PAIR!', style: rkHeadingStyle(fontSize: 26, color: Colors.white)),
                            const SizedBox(height: 8),
                            const Text(
                              'You’ve unlocked Part 2 of the Rhayz Kicks ad — a members-only exclusive. Watch it again anytime in Profile → Rewards.',
                              style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.5),
                            ),
                            const SizedBox(height: 18),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: widget.onClose,
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      side: const BorderSide(color: Colors.white38),
                                      shape: const StadiumBorder(),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                    ),
                                    child: const Text('CLOSE', style: TextStyle(fontWeight: FontWeight.w900)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: FilledButton(
                                    onPressed: widget.onViewInAccount,
                                    style: FilledButton.styleFrom(
                                      backgroundColor: Colors.white,
                                      foregroundColor: Colors.black,
                                      shape: const StadiumBorder(),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                    ),
                                    child: const Text('VIEW IN PROFILE', style: TextStyle(fontWeight: FontWeight.w900)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Profile → Rewards card: the Part 2 video once the customer has bought
/// something, a locked teaser before that (web: Part2AdCard).
class Part2AdCard extends StatefulWidget {
  final bool unlocked;
  final VoidCallback? onShop;
  const Part2AdCard({super.key, required this.unlocked, this.onShop});

  @override
  State<Part2AdCard> createState() => _Part2AdCardState();
}

class _Part2AdCardState extends State<Part2AdCard> {
  bool _playing = false;
  bool _muted = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 24),
      decoration: BoxDecoration(color: const Color(0xFF0B0B0B), borderRadius: BorderRadius.circular(14)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('EXCLUSIVE: PART 2', style: rkHeadingStyle(fontSize: 20, color: Colors.white)),
                const SizedBox(height: 4),
                Text(
                  widget.unlocked ? 'The members-only follow-up to our ad — yours to rewatch.' : 'Members who buy a pair unlock the second part of our ad.',
                  style: const TextStyle(color: Colors.white60, fontSize: 13),
                ),
              ],
            ),
          ),
          AspectRatio(
            aspectRatio: 16 / 9,
            child: !widget.unlocked
                ? _LockedTeaser(onShop: widget.onShop)
                : _playing
                    ? Stack(
                        fit: StackFit.expand,
                        children: [
                          AdVideo(url: kPart2AdUrl, muted: _muted, loop: false),
                          Positioned(bottom: 10, right: 10, child: _SoundButton(muted: _muted, onTap: () => setState(() => _muted = !_muted))),
                        ],
                      )
                    : InkWell(
                        onTap: () => setState(() => _playing = true),
                        child: Container(
                          decoration: const BoxDecoration(
                            gradient: RadialGradient(colors: [Color(0x66E4002B), Colors.black], radius: 0.9),
                          ),
                          child: const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.play_circle_fill_rounded, size: 64, color: Colors.white),
                                SizedBox(height: 6),
                                Text('Watch Part 2', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                              ],
                            ),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _LockedTeaser extends StatelessWidget {
  final VoidCallback? onShop;
  const _LockedTeaser({this.onShop});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(colors: [Color(0x59E4002B), Color(0xFF111111)], radius: 0.8),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: const Icon(Icons.lock_rounded, color: Colors.white),
          ),
          const SizedBox(height: 8),
          Text('LOCKED', style: rkHeadingStyle(fontSize: 22, color: Colors.white)),
          const SizedBox(height: 4),
          const Text(
            'Buy your first pair — online or in store — to unlock Part 2.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          if (onShop != null) ...[
            const SizedBox(height: 10),
            FilledButton(
              onPressed: onShop,
              style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, shape: const StadiumBorder()),
              child: const Text('SHOP NOW', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
            ),
          ],
        ],
      ),
    );
  }
}
