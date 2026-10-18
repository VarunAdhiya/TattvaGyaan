"""Decode the supplied study's Kruti Dev font codes; preserve its spelling."""
import json, re, unicodedata
from pathlib import Path
PAIRS=json.loads((Path(__file__).resolve().parents[1]/'data/font-maps/kruti-dev-010.json').read_text(encoding='utf8'))['pairs']
C=r'[क-हक़-य़ऱऩळ]'
CLUSTER=C+'(?:़?्'+C+')*़?'

def decode(raw):
    # Three misplaced legacy i-matra sequences, checked on source pages
    # 149, 178 and 181. These reproduce the visible words, not new wording.
    text=raw.replace('larfq', 'larqf').replace('tM+hcfwV;ksa', 'tM+hcwfV;ksa').replace('cqf+)', 'cqf)')
    text=text.replace('´', 'ञ')
    for a,b in PAIRS:
        text=text.replace(a,b)
    # A typed halant following an already-half glyph is a single visible halant.
    text=text.replace('््','्')
    text=re.sub('([fÇ])('+CLUSTER+')',lambda m:m[2]+('ि' if m[1]=='f' else 'िं'),text)
    text=re.sub('('+CLUSTER+'[ािीुूृेैोौंँॅ़]*)Z',r'र्\1',text)
    text=text.replace('Z','र्')
    text=re.sub('([ंँ])([ािीुूृेैोौ])',r'\2\1',text)
    return unicodedata.normalize('NFC',text)
