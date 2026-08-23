import re
from pathlib import Path

def norm(s):
    return re.sub(r'[^0-9A-Za-z]+', '', s or '').upper()

PC = Path('../../pagecache')
for pos, probes in {
    '20': ['SHR263KA', 'Stanley', 'rotary hammer'],
    '170': ['SCR121S2K', 'Stanley', 'reciprocating'],
    '223': ['TK-CS200C', 'Panasonic', 'cartridge'],
    '23': ['RC3636', 'RC365', 'rice cooker', 'Khind'],
}.items():
    f = PC / f'{pos}.txt'
    t = f.read_text(encoding='utf-8', errors='ignore') if f.exists() else ''
    nt = norm(t)
    print(f'--- {pos} len={len(t)}')
    for p in probes:
        n = norm(p)
        i = nt.find(n)
        print('   ', p, '->', ('HIT@%d' % i) if i >= 0 else 'miss')
    print('   head:', t[:200].replace('\n', ' '))
