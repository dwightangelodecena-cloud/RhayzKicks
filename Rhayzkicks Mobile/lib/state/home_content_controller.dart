import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/store_repository.dart';
import '../models/database_models.dart';

// Mirrors web's getHeroSlides()/getCollections()/getAnnouncements()/
// getNavCategories() in web/src/lib/storeData.ts — reads the exact same rows
// the web admin's CMS tabs manage, so mobile and web always show identical
// content. There is no mobile-specific admin UI; content is only ever
// edited on the web. Loaded once at app start and shared everywhere via
// Provider (nav drawer, home screen, category screen all read from this).
class HomeContentController extends ChangeNotifier {
  List<HeroSlide> _heroSlides = [];
  List<Collection> _collections = [];
  List<Announcement> _announcements = [];
  List<NavCategory> _navCategories = [];
  PromoBannerContent? _promoBanner;
  bool _isLoading = true;

  List<HeroSlide> get heroSlides => _heroSlides;
  List<Collection> get collections => _collections;
  List<Announcement> get announcements => _announcements;
  List<NavCategory> get navCategories => _navCategories;
  PromoBannerContent? get promoBanner => _promoBanner;
  bool get isLoading => _isLoading;

  Future<void> load() async {
    final client = Supabase.instance.client;
    await Future.wait<void>([
      client
          .from('hero_slides')
          .select()
          .eq('is_active', true)
          .order('sort_order')
          .then((rows) {
            _heroSlides = (rows as List).map((r) => HeroSlide.fromMap(r as Map<String, dynamic>)).toList();
          })
          .catchError((_) {
            _heroSlides = <HeroSlide>[];
          }),
      getCollections(homeOnly: true)
          .then((rows) {
            _collections = rows;
          })
          .catchError((_) {
            _collections = <Collection>[];
          }),
      client
          .from('announcements')
          .select('id, message')
          .eq('is_active', true)
          .order('sort_order')
          .then((rows) {
            _announcements = (rows as List).map((r) => Announcement.fromMap(r as Map<String, dynamic>)).toList();
          })
          .catchError((_) {
            _announcements = <Announcement>[];
          }),
      getNavCategories()
          .then((rows) {
            _navCategories = rows;
          })
          .catchError((_) {
            _navCategories = <NavCategory>[];
          }),
      client
          .from('promo_banner_settings')
          .select()
          .eq('id', true)
          .maybeSingle()
          .then((row) {
            _promoBanner = (row != null && row['is_active'] == true) ? PromoBannerContent.fromMap(row) : null;
          })
          .catchError((_) {
            _promoBanner = null;
          }),
    ]);
    _isLoading = false;
    notifyListeners();
  }
}
