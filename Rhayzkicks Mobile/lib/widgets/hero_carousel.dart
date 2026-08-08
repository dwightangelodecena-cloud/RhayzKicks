import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/home_content_controller.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'img_slot.dart';
import 'rk_button.dart';

class HeroCarousel extends StatefulWidget {
  const HeroCarousel({super.key});

  @override
  State<HeroCarousel> createState() => _HeroCarouselState();
}

class _HeroCarouselState extends State<HeroCarousel> {
  final _controller = PageController();
  int _index = 0;
  Timer? _timer;
  int? _autoplaySlideCount;

  void _ensureAutoplay(int slideCount) {
    if (_autoplaySlideCount == slideCount) return;
    _autoplaySlideCount = slideCount;
    _timer?.cancel();
    if (slideCount < 2) return;
    _timer = Timer.periodic(const Duration(seconds: 6), (_) => _goTo((_index + 1) % slideCount));
  }

  void _goTo(int i) {
    if (!_controller.hasClients) return;
    _controller.animateToPage(i, duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final content = context.watch<HomeContentController>();
    final heroSlides = content.heroSlides;

    if (content.isLoading) {
      return Container(height: 520, color: colors.bg);
    }
    if (heroSlides.isEmpty) {
      return SizedBox(
        height: 520,
        child: ImgSlot(label: 'Hero Image', size: 'Recommended: 1440 x 820 px'),
      );
    }
    _ensureAutoplay(heroSlides.length);

    return Container(
      height: 520,
      color: colors.bg,
      child: Stack(
        children: [
          PageView.builder(
            controller: _controller,
            itemCount: heroSlides.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (context, i) {
              final slide = heroSlides[i];
              final hasImage = slide.imageUrl.isNotEmpty;
              return Stack(
                fit: StackFit.expand,
                children: [
                  if (hasImage) ...[
                    Image.network(
                      slide.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          ImgSlot(label: 'Hero Image ${i + 1} of ${heroSlides.length}', size: 'Recommended: 1440 x 820 px'),
                    ),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [Color(0xB3000000), Colors.transparent],
                        ),
                      ),
                    ),
                  ] else
                    ImgSlot(label: 'Hero Image ${i + 1} of ${heroSlides.length}', size: 'Recommended: 1440 x 820 px'),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                    child: Align(
                      alignment: Alignment.bottomLeft,
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final narrow = constraints.maxWidth < 340;
                          final headlineSize = narrow ? 32.0 : 42.0;
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (slide.eyebrow.isNotEmpty)
                                Text(
                                  slide.eyebrow,
                                  style: TextStyle(
                                    color: hasImage ? AppColors.darkSurfaceMuted : colors.textMuted,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.5,
                                  ),
                                ),
                              const SizedBox(height: 6),
                              Text(
                                slide.headline,
                                style: rkHeadingStyle(fontSize: headlineSize, color: hasImage ? AppColors.darkSurfaceText : colors.text),
                              ),
                              if (slide.subtext.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                ConstrainedBox(
                                  constraints: BoxConstraints(maxWidth: constraints.maxWidth),
                                  child: Text(
                                    slide.subtext,
                                    style: TextStyle(color: hasImage ? AppColors.darkSurfaceText : colors.text, fontSize: 13),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 14),
                              Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                children: [
                                  if (slide.primaryCtaLabel.isNotEmpty) RkButton(label: slide.primaryCtaLabel, onDark: hasImage),
                                  if (slide.secondaryCtaLabel != null && slide.secondaryCtaLabel!.isNotEmpty)
                                    RkButton(label: slide.secondaryCtaLabel!, style: RkButtonStyle.outline, onDark: hasImage),
                                ],
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          Positioned(
            left: 8,
            top: 0,
            bottom: 0,
            child: Center(child: _HeroArrow(icon: Icons.chevron_left, onTap: () => _goTo((_index - 1 + heroSlides.length) % heroSlides.length))),
          ),
          Positioned(
            right: 8,
            top: 0,
            bottom: 0,
            child: Center(child: _HeroArrow(icon: Icons.chevron_right, onTap: () => _goTo((_index + 1) % heroSlides.length))),
          ),
          Positioned(
            bottom: 16,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(heroSlides.length, (i) {
                final active = i == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 20 : 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: active ? colors.text : colors.placeholderBorder,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroArrow extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _HeroArrow({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    return InkWell(
      onTap: onTap,
      customBorder: const CircleBorder(),
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(color: colors.text, shape: BoxShape.circle),
        child: Icon(icon, color: colors.bg, size: 22),
      ),
    );
  }
}
