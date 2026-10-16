const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('local OCR preserves editorial text, checkpoints, source identity and review boundaries', () => {
  const result = spawnSync(process.env.TRANSCRIPTION_PYTHON || 'python',
    [path.join(__dirname, 'local_ocr_checks.py')], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr + (result.error?.message || ''));
});
