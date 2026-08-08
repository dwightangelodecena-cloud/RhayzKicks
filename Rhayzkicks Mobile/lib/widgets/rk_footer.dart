import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'rk_logo_badge.dart';

const _footerColumns = {
  'Resources': ['Become a Member', 'Shoe Size Guide', 'Student Discounts', 'Site Feedback'],
  'Help': ['Order Status', 'Delivery Info', 'Returns & Exchanges', 'Order History', 'Contact Us'],
  'Company': ['About Rhayz Kicks', 'News & Press', 'Careers', 'Investors', 'Sustainability'],
};

const _legalLinks = ['Terms of Sale', 'Terms of Use', 'Privacy Policy', 'Cookie Settings'];

class RkFooter extends StatelessWidget {
  const RkFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.darkSurface,
      padding: EdgeInsets.fromLTRB(16, 32, 16, 16 + MediaQuery.of(context).padding.bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const RkLogoBadge(size: 44),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('RHAYZ.', style: rkHeadingStyle(fontSize: 18, color: AppColors.darkSurfaceText)),
                  const Text(
                    'FOOTWEAR & APPAREL — PHILIPPINES',
                    style: TextStyle(color: AppColors.darkSurfaceMuted, fontSize: 9, letterSpacing: 0.6),
                  ),
                ],
              ),
            ],
          ),
          const Divider(color: AppColors.darkSurfaceBorder, height: 32),
          ..._footerColumns.entries.map((entry) => _FooterAccordion(title: entry.key, links: entry.value)),
          const Divider(color: AppColors.darkSurfaceBorder, height: 32),
          const Text('Philippines', style: TextStyle(color: AppColors.darkSurfaceMuted, fontSize: 12)),
          const SizedBox(height: 6),
          const Text(
            '© 2025 Rhayz Kicks, Inc. All Rights Reserved',
            style: TextStyle(color: AppColors.darkSurfaceMuted, fontSize: 12),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: _legalLinks
                .map((link) => Text(link, style: const TextStyle(color: AppColors.darkSurfaceMuted, fontSize: 11)))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _FooterAccordion extends StatelessWidget {
  final String title;
  final List<String> links;

  const _FooterAccordion({required this.title, required this.links});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(bottom: 12),
        title: Text(
          title.toUpperCase(),
          style: const TextStyle(color: AppColors.darkSurfaceText, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1),
        ),
        iconColor: AppColors.darkSurfaceText,
        collapsedIconColor: AppColors.darkSurfaceMuted,
        children: links
            .map(
              (link) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(link, style: const TextStyle(color: AppColors.darkSurfaceMuted, fontSize: 13)),
              ),
            )
            .toList(),
      ),
    );
  }
}
