#!/usr/bin/env python3
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / 'enhancements.js'
text = PATH.read_text()

broken = "payload.siteNotes = scopeInstruction + (payload.siteNotes ? '\n\n' + payload.siteNotes : '');"
# The string above contains real newlines when parsed by Python. Replace that generated
# form with JavaScript escape sequences before syntax checking or committing source.
fixed = "payload.siteNotes = scopeInstruction + (payload.siteNotes ? '\\n\\n' + payload.siteNotes : '');"

if broken in text:
    text = text.replace(broken, fixed, 1)
elif fixed not in text:
    raise SystemExit('generated siteNotes escape anchor not found')

PATH.write_text(text)
print('Normalized generated JavaScript newline escapes.')
