#!/usr/bin/env python3
from pathlib import Path
import re

PATH = Path(__file__).resolve().parents[1] / 'enhancements.js'
text = PATH.read_text()

text = text.replace(
    "    var level = document.body.getAttribute('data-building-level') === MULTIPLE_LEVELS ? 'Multiple levels' : 'One story';\n",
    ''
)
text = text.replace(
    "      'Building height: ' + level,\n",
    "      'Access assessment: Automatic photo analysis',\n"
)
text, count = re.subn(
    r"    lines\.push\(level === 'Multiple levels'\n      \? 'Multi-level exterior washing and selected roof soft washing are included with safe professional access equipment\.'\n      : 'Ground-level and one-story exterior washing are included\. Roof cleaning is not included\.'\);",
    "    lines.push('The Matrix automatically checks for upper-story, roof, ladder, lift, and other elevated-access requirements. Out-of-scope access is flagged for owner review or referral and is not included in the quoted services.');",
    text,
    count=1
)
if count == 0 and "The Matrix automatically checks for upper-story" not in text:
    raise SystemExit('customer PDF access-summary anchor not found')

text = text.replace(
    "      updateEvidenceGuidance(document.body.getAttribute('data-building-level'));",
    "      updateEvidenceGuidance();"
)
text = text.replace(
    "    updateEvidenceGuidance(document.body.getAttribute('data-building-level'));",
    "    updateEvidenceGuidance();"
)

PATH.write_text(text)
print('Reconciled secondary automatic-access references to current production behavior.')
