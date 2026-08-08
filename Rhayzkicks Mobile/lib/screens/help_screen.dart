import 'package:flutter/material.dart';
import '../data/help_faq.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/page_hero.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final tab = faqTabs[_tabIndex];

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(backgroundColor: colors.bg, foregroundColor: colors.text, elevation: 0),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const PageHero(
              eyebrow: 'Support',
              title: 'Help Center',
              subtitle: 'Find answers to frequently asked questions or reach out to our team.',
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(color: colors.border),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.search, size: 18, color: colors.textMuted),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            style: TextStyle(fontSize: 14, color: colors.text),
                            decoration: InputDecoration(
                              hintText: 'Search help articles...',
                              hintStyle: TextStyle(color: colors.textMuted),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 40,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: faqTabs.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 8),
                      itemBuilder: (context, i) {
                        final active = i == _tabIndex;
                        return ChoiceChip(
                          label: Text(faqTabs[i].label),
                          selected: active,
                          onSelected: (_) => setState(() => _tabIndex = i),
                          selectedColor: colors.text,
                          backgroundColor: colors.bg,
                          labelStyle: TextStyle(color: active ? colors.bg : colors.text, fontWeight: FontWeight.w700, fontSize: 12.5),
                          side: BorderSide(color: colors.border),
                          shape: const StadiumBorder(),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: colors.border),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                      child: Column(
                        children: List.generate(tab.items.length, (i) {
                          final item = tab.items[i];
                          return Column(
                            children: [
                              if (i > 0) Divider(height: 1, color: colors.border),
                              ExpansionTile(
                                title: Text(
                                  item.question,
                                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5, color: colors.text),
                                ),
                                iconColor: colors.text,
                                collapsedIconColor: colors.textMuted,
                                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                expandedCrossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.answer, style: TextStyle(color: colors.textMuted, fontSize: 13.5, height: 1.5)),
                                ],
                              ),
                            ],
                          );
                        }),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _ContactPanel(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ContactPanel extends StatelessWidget {
  const _ContactPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.darkSurface, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Still Need Help?', style: rkHeadingStyle(fontSize: 26, color: AppColors.darkSurfaceText)),
          const SizedBox(height: 6),
          const Text(
            'Our support team is available 7 days a week, 9AM–9PM PHT.',
            style: TextStyle(color: AppColors.darkSurfaceMuted, fontSize: 13.5),
          ),
          const SizedBox(height: 20),
          _ContactRow(icon: Icons.chat_bubble_outline, label: 'Live Chat', value: 'Chat with us now'),
          const SizedBox(height: 12),
          _ContactRow(icon: Icons.mail_outline, label: 'Email Us', value: 'support@rhayzkicks.ph'),
          const SizedBox(height: 12),
          _ContactRow(icon: Icons.call_outlined, label: 'Call Us', value: '+63 2 8888 0000'),
        ],
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ContactRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: AppColors.darkSurfaceText),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.darkSurfaceText)),
              Text(value, style: const TextStyle(fontSize: 12.5, color: AppColors.darkSurfaceMuted)),
            ],
          ),
        ],
      ),
    );
  }
}
