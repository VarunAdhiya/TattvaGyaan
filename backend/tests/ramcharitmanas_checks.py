"""Source-backed checks for the exact PDF's decoder; requires PyMuPDF."""
import importlib.util
from pathlib import Path
import unittest
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('ramcharitmanas',ROOT/'backend/scripts/extract-ramcharitmanas.py')
decoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(decoder)


class RamcharitmanasChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pdf = pymupdf.open(ROOT/'frontend/public/library/shri-ramcharitmanas-gita-press.pdf')

    def test_visually_checked_font_samples(self):
        for encoded, expected in [
            ('üÊË⁄UÊ◊øÁ⁄UÃ◊ÊŸ‚','श्रीरामचरितमानस'),
            ('©UûÊ◊','उत्तम'),('„UÌ·Ã','हर्षित'),('¬Ò„U®„U','पैहहिं'),
            ('•ı⁄U','और'),('Á’Áœ','बिधि'),('‚ê◊Èπ','सम्मुख'),
        ]:
            with self.subTest(encoded=encoded):
                self.assertEqual(decoder.decode(encoded),expected)

    def test_contents_columns_are_not_interleaved(self):
        rows = decoder.source_rows(self.pdf[6],7)
        left = [r['text'] for r in rows if r['column']==0]
        right = [r['text'] for r in rows if r['column']==1]
        self.assertTrue(any('१-नवाह्न' in text or '१—नवाह्न' in text for text in left))
        self.assertTrue(any('२२-' in text or '२२—' in text for text in right))
        self.assertLess(max(i for i,r in enumerate(rows) if r['column']==0),
                        min(i for i,r in enumerate(rows) if r['column']==1))

    def test_question_table_preserves_225_cells(self):
        rows = decoder.source_rows(self.pdf[1054],1055)
        cells = [r['text'].split(' | ') for r in rows if 280 <= r['y'] <= 625]
        self.assertEqual(len(cells),15)
        self.assertTrue(all(len(row)==15 for row in cells))
        self.assertEqual(cells[0],['सु','प्र','उ','बि','हो','मु','ग','ब','सु','नु','बि','घ','धि','इ','द'])

    def test_hidden_alignment_text_is_not_scripture(self):
        rows = decoder.source_rows(self.pdf[1056],1057)
        line = next(r['text'] for r in rows if 'कालनेमि' in r['text'])
        self.assertEqual(line,'कालनेमि जिमि रावन राहू॥')

    def test_blank_pages_have_no_extracted_text(self):
        for number in [2,4,1058]:
            self.assertEqual(decoder.source_rows(self.pdf[number-1],number),[])


if __name__ == '__main__':
    unittest.main()
