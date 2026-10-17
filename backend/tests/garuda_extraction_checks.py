"""Content-integrity checks; no database writes or OCR model download."""
from pathlib import Path
import importlib.util
import json
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/export-garuda-purana.py'
spec = importlib.util.spec_from_file_location('garuda_export', SCRIPT)
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class GarudaChecks(unittest.TestCase):
    def setUp(self):
        self.manual = json.loads(exporter.MANUAL.read_text(encoding='utf8'))

    def test_blank_pages_do_not_become_invented_passages(self):
        for number in [3, 636]:
            lines, audit = exporter.load_page(number, self.manual)
            self.assertEqual(lines, [])
            self.assertEqual(audit['method'], 'visually-checked-blank')
        pages = set(map(int, self.manual['pages']))
        self.assertEqual(len(pages), 16)
        self.assertEqual(pages | {3, 636}, exporter.ocr.MANUAL_PAGES)

    def test_reader_grouping_preserves_every_source_line(self):
        lines = ['पहला पाठ।', 'दूसरा पाठ।'] * 49 + ['समाप्त॥']
        result = exporter.blocks(lines, maximum_lines=8, maximum_characters=60)
        self.assertEqual('\n'.join(result), '\n'.join(lines))
        self.assertTrue(all(len(block) <= 60 for block in result))

    def test_incomplete_extraction_cannot_export_a_page(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(exporter.ocr, 'checkpoint_path', return_value=Path(directory) / 'missing.json'):
                with self.assertRaisesRegex(ValueError, 'Missing OCR page 20'):
                    exporter.load_page(20, self.manual)

    def test_wrong_source_and_changed_text_are_rejected(self):
        text = 'परीक्षण पाठ।'
        base = {
            'identity': exporter.ocr.checkpoint_identity(20),
            'reviewStatus': 'unreviewed-draft',
            'regions': [{'kind': 'full-width', 'top': 12, 'bottom': 30, 'inkPixels': 1000,
                         'text': text, 'lines': [text]}],
            'textSha256': exporter.digest(text),
        }
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / 'page.json'
            with patch.object(exporter.ocr, 'checkpoint_path', return_value=file):
                file.write_text(json.dumps(base), encoding='utf8')
                self.assertEqual(exporter.load_page(20, self.manual)[0], [text])
                base['regions'][0]['text'] = 'Changed content'
                file.write_text(json.dumps(base), encoding='utf8')
                with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                    exporter.load_page(20, self.manual)
                base['identity']['sourceSha256'] = '0' * 64
                file.write_text(json.dumps(base), encoding='utf8')
                with self.assertRaisesRegex(ValueError, 'identity mismatch'):
                    exporter.load_page(20, self.manual)

    def test_navigation_covers_the_whole_supplied_book_without_overlap(self):
        pages = [n for start, end, *_ in exporter.DIVISIONS for n in range(start, end + 1)]
        self.assertEqual(pages, list(range(1, 639)))
        self.assertEqual([d[0] for d in exporter.DIVISIONS[2:5]], [14, 456, 614])

    def test_picture_masks_are_part_of_checkpoint_identity(self):
        self.assertNotIn('illustrationMasks', exporter.ocr.checkpoint_identity(20))
        self.assertEqual(exporter.ocr.checkpoint_identity(14)['illustrationMasks'], [[296,432,538,731]])
        self.assertNotEqual(exporter.ocr.checkpoint_path(14).parent, exporter.ocr.checkpoint_path(20).parent)


if __name__ == '__main__':
    unittest.main()
