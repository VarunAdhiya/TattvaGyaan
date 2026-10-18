"""Source-based spacing recovery must never correct letters by inference."""
from pathlib import Path
import importlib.util
import unittest
import unicodedata

spec = importlib.util.spec_from_file_location('spacing', Path(__file__).resolve().parents[1] / 'scripts/recover-garuda-spacing.py')
spacing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(spacing)


class SpacingChecks(unittest.TestCase):
    def test_recovers_matched_word_boundaries(self):
        before = 'जिनमें सम्पूर्णजगत्कावासहै। प्रविष्टहोजाताहै'
        recognized = 'जिनमें सम्पूर्ण जगत्\u200cका वास है। प्रविष्ट हो जाता है'
        offsets, _ = spacing.recover(before, recognized)
        self.assertEqual(spacing.insert(before, offsets), 'जिनमें सम्पूर्ण जगत्का वास है। प्रविष्ट हो जाता है')

    def test_keeps_letters_punctuation_and_line_breaks(self):
        before = 'पहला\nपाठसमाप्त।'
        offsets, _ = spacing.recover(before, 'पहला पाठ समाप्त।')
        self.assertEqual(spacing.insert(before, offsets), 'पहला\nपाठ समाप्त।')
        offsets, _ = spacing.recover('अन्यशब्द', 'गलत पाठ')
        self.assertEqual(offsets, [])

    def test_never_inserts_before_a_combining_mark(self):
        original = 'श्रीविष्णु'
        offsets, _ = spacing.recover(original, 'श्री व िष्ण ु')
        self.assertTrue(all(not unicodedata.category(original[i]).startswith('M') for i in offsets))


if __name__ == '__main__':
    unittest.main()
