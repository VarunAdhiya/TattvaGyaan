const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Local OCR only: no API keys, provider requests or automatic import.
const environment = path.resolve(__dirname, '../.venv-ocr', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = process.env.TRANSCRIPTION_PYTHON || (fs.existsSync(environment) ? environment : 'python');
const result = spawnSync(python, [path.join(__dirname, 'ocr-library.py'), ...process.argv.slice(2)], {
  stdio: 'inherit', windowsHide: true,
});
if (result.error) console.error(`Unable to start local Python OCR: ${result.error.message}`);
process.exitCode = result.status ?? 1;
