import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

// Customer-facing mirror of web's DeliveryStepper.tsx / deliveryStages.ts —
// keep stage keys and order in sync with supabase/018_online_order_delivery_stage.sql.
const _stages = [
  ('preparing', 'Order Received'),
  ('packed', 'Packed & Ready'),
  ('picked_up', 'Out For Delivery'),
  ('received', 'Delivered'),
];

class DeliveryStepper extends StatelessWidget {
  final String stage;
  final DateTime? packedAt;
  final DateTime? pickedUpAt;
  final DateTime? receivedAt;

  const DeliveryStepper({super.key, required this.stage, this.packedAt, this.pickedUpAt, this.receivedAt});

  int get _currentIndex {
    final i = _stages.indexWhere((s) => s.$1 == stage);
    return i == -1 ? 0 : i;
  }

  DateTime? _timestampFor(String key) {
    switch (key) {
      case 'packed':
        return packedAt;
      case 'picked_up':
        return pickedUpAt;
      case 'received':
        return receivedAt;
      default:
        return null;
    }
  }

  String? _formatTime(DateTime? value) {
    if (value == null) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour12 = value.hour % 12 == 0 ? 12 : value.hour % 12;
    final minute = value.minute.toString().padLeft(2, '0');
    final ampm = value.hour >= 12 ? 'PM' : 'AM';
    return '${months[value.month - 1]} ${value.day}, $hour12:$minute $ampm';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.rkColors;
    final currentIndex = _currentIndex;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < _stages.length; i++)
          Expanded(
            child: Column(
              children: [
                Row(
                  children: [
                    if (i > 0)
                      Expanded(
                        child: Container(height: 2, color: i <= currentIndex ? colors.accentRed : colors.border),
                      ),
                    _StageNode(
                      done: i < currentIndex || (i == currentIndex && stage == 'received'),
                      current: i == currentIndex && stage != 'received',
                      index: i,
                      colors: colors,
                    ),
                    if (i < _stages.length - 1)
                      Expanded(
                        child: Container(height: 2, color: i < currentIndex ? colors.accentRed : colors.border),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _stages[i].$2,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: i <= currentIndex ? colors.text : colors.textMuted,
                  ),
                ),
                if (_formatTime(_timestampFor(_stages[i].$1)) != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      _formatTime(_timestampFor(_stages[i].$1))!,
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 9, color: colors.textMuted),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _StageNode extends StatelessWidget {
  final bool done;
  final bool current;
  final int index;
  final AppColors colors;

  const _StageNode({required this.done, required this.current, required this.index, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: done ? colors.accentRed : colors.bg,
        border: Border.all(color: current || done ? colors.accentRed : colors.border, width: 2),
      ),
      child: Center(
        child: done
            ? const Icon(Icons.check, size: 12, color: Colors.white)
            : Text('${index + 1}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: current ? colors.accentRed : colors.textMuted)),
      ),
    );
  }
}
