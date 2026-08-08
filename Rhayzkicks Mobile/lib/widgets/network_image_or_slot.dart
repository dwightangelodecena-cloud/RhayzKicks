import 'package:flutter/material.dart';
import 'img_slot.dart';

// Real product/marketing photo when a URL exists, falling back to the
// ImgSlot placeholder when it's missing or fails to load.
class NetworkImageOrSlot extends StatelessWidget {
  final String? imageUrl;
  final String label;
  final String size;
  final BoxFit fit;

  const NetworkImageOrSlot({super.key, required this.imageUrl, required this.label, this.size = '', this.fit = BoxFit.cover});

  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    if (url == null || url.isEmpty) return ImgSlot(label: label, size: size);
    return Image.network(
      url,
      fit: fit,
      errorBuilder: (context, error, stackTrace) => ImgSlot(label: label, size: size),
    );
  }
}
