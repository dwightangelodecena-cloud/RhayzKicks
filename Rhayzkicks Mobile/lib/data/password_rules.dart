// Mirrors web/src/lib/passwordRules.ts — keep both in sync.

class PasswordRequirement {
  final String label;
  final bool Function(String) test;

  const PasswordRequirement({required this.label, required this.test});
}

final RegExp _symbolPattern = RegExp(r'''[!@#$%^&*(),.?":{}|<>~`\-_=+\[\]\\/;']''');

final List<PasswordRequirement> passwordRequirements = [
  PasswordRequirement(label: 'At least 8 characters', test: (p) => p.length >= 8),
  PasswordRequirement(label: 'At least one number', test: (p) => RegExp(r'[0-9]').hasMatch(p)),
  PasswordRequirement(label: 'At least one symbol (!@#\$%...)', test: (p) => _symbolPattern.hasMatch(p)),
];

bool passwordMeetsRequirements(String password) {
  return passwordRequirements.every((r) => r.test(password));
}
