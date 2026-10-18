"""Rebuild the source extraction and compare every recorded character and page."""
import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('extract',ROOT/'backend/scripts/extract-ramayan-study.py')
extract=importlib.util.module_from_spec(spec);spec.loader.exec_module(extract)

class RamayanChecks(unittest.TestCase):
    def test_reproducible_pages(self):
        draft,layout,audit=extract.build()
        for data,path in [(draft,'library/editions/drafts/ramayan-study-hi.json'),(layout,'backend/data/layouts/ramayan-study.json'),(audit,'library/editions/drafts/ramayan-study-hi.audit.json')]:
            self.assertEqual(data,json.loads((ROOT/path).read_text(encoding='utf8')))
        self.assertTrue(all(c['match']>.8 for c in audit['chapters']))

    def test_font_order_and_visible_source_words(self):
        for raw,expected in [('okYehfd jkek;.k','वाल्मीकि रामायण'),('jkedhfrZ','रामकीर्ति'),('larfq’V','संतुष्टि'),('tM+hcfwV;ksa','जड़ीबूटियों'),('cqf+)','बुद्धि'),('dk´~pua','काञ्चनं')]:
            self.assertEqual(extract.font.decode(raw),expected)

if __name__=='__main__':unittest.main()
