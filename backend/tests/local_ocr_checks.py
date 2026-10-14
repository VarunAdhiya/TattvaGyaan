"""Synthetic fixtures only. Tests need Python's standard library, no OCR dependency."""
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('local_ocr', Path(__file__).resolve().parents[1] / 'scripts/ocr-library.py')
ocr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)


class FakePage:
    def __init__(self, text, fail=False):
        self.text = text
        self.fail = fail
        self.calls = 0

    def get_text(self, **kwargs):
        return self.text if 'textpage' in kwargs else 'Corrupt embedded text'

    def get_textpage_ocr(self, **kwargs):
        self.calls += 1
        assert kwargs['full'] is True
        if self.fail:
            raise RuntimeError('Synthetic OCR failure')
        return object()


class FakePdf(list):
    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class LocalOcrTests(unittest.TestCase):
    def test_unreviewed_output_and_edited_text_protection(self):
        page = {'number': 1, 'text': None, 'kind': None, 'review': None}
        self.assertTrue(ocr.stage_result(page, {'text': 'Synthetic OCR text'}))
        self.assertIsNone(page['review'])
        page['text'] = 'Editorial correction'
        self.assertFalse(ocr.stage_result(page, {'text': 'Replacement'}))
        self.assertEqual(page['text'], 'Editorial correction')
        blank = {'number': 2, 'text': None, 'kind': None, 'review': None}
        ocr.stage_result(blank, {'text': ''})
        self.assertIsNone(blank['kind'], 'OCR silence must not attest that a page is blank')

    def test_resume_failures_and_exact_source_checks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            document = {'source': '/library/test.pdf', 'sha256': 'a' * 64, 'pageCount': 3}
            pdf = FakePdf([FakePage('First fixture'), FakePage('Second fixture', fail=True), FakePage('')])
            engine = SimpleNamespace(open=lambda _: pdf, VersionBind='test')
            options = SimpleNamespace(start_page=1, dpi=300, languages='hin+san+eng', tessdata=root)
            self.assertEqual(ocr.process_book(root, 'test', document, root / 'unused.pdf', options, engine, {}, 3), (3, 1))
            filename = root / 'backend/data/transcription-drafts/test.json'
            draft = ocr.read_json(filename)
            self.assertEqual(draft['pages'][0]['text'], 'First fixture')
            self.assertIsNone(draft['pages'][1]['text'])
            self.assertIsNone(draft['pages'][2]['kind'])
            self.assertTrue(all(page['review'] is None for page in draft['pages']))
            draft['pages'][0]['text'] = 'User correction'
            ocr.save_json(filename, draft)
            pdf[1].fail = False
            self.assertEqual(ocr.process_book(root, 'test', document, root / 'unused.pdf', options, engine, {}, 3), (1, 0))
            self.assertEqual([page.calls for page in pdf], [1, 2, 1])
            self.assertEqual(ocr.read_json(filename)['pages'][0]['text'], 'User correction')
            draft['sourceSha256'] = 'b' * 64
            ocr.save_json(filename, draft)
            with self.assertRaisesRegex(ValueError, 'Draft source'):
                ocr.process_book(root, 'test', document, root / 'unused.pdf', options, engine, {}, 3)

    def test_checkpoint_recovers_after_interrupted_draft_write(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            document = {'source': '/library/test.pdf', 'sha256': 'a' * 64, 'pageCount': 1}
            pdf = FakePdf([FakePage('Checkpoint text')])
            engine = SimpleNamespace(open=lambda _: pdf, VersionBind='test')
            options = SimpleNamespace(start_page=1, dpi=300, languages='hin', tessdata=root)
            # Simulate interruption after the OCR receipt is saved but before the draft is updated.
            with patch.object(ocr, 'stage_result', side_effect=KeyboardInterrupt):
                with self.assertRaises(KeyboardInterrupt):
                    ocr.process_book(root, 'test', document, root / 'unused.pdf', options, engine, {}, 1)
            ocr.process_book(root, 'test', document, root / 'unused.pdf', options, engine, {}, 1)
            self.assertEqual(pdf[0].calls, 1, 'resume must reuse the saved OCR receipt')

    def test_cache_integrity_and_source_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            filename = root / 'receipt.json'
            ocr.save_json(filename, {'identity': {'page': 1}, 'text': 'abc', 'textSha256': ocr.digest(b'abc')})
            self.assertEqual(ocr.cached_result(filename, {'page': 1})['text'], 'abc')
            with self.assertRaisesRegex(ValueError, 'settings differ'):
                ocr.cached_result(filename, {'page': 2})
            value = ocr.read_json(filename)
            value['text'] = 'tampered'
            ocr.save_json(filename, value)
            with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
                ocr.cached_result(filename, {'page': 1})
            manifest = root / 'library/documents/test.json'
            ocr.save_json(manifest, {'source': '/library/../../private.pdf'})
            with self.assertRaisesRegex(ValueError, 'Invalid source'):
                ocr.documents(root, [])

    def test_lock_rejects_simultaneous_writers_and_releases_after_error(self):
        with tempfile.TemporaryDirectory() as directory:
            filename = Path(directory) / 'run.lock'
            with self.assertRaisesRegex(ValueError, 'interruption'):
                with ocr.run_lock(filename):
                    with self.assertRaisesRegex(RuntimeError, 'Another local OCR'):
                        with ocr.run_lock(filename):
                            pass
                    raise ValueError('interruption')
            with ocr.run_lock(filename):
                pass


if __name__ == '__main__':
    unittest.main()
