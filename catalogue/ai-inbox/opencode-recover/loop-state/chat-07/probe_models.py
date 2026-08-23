import re, sys
from pathlib import Path

def norm(s):
    return re.sub(r'[^0-9A-Za-z]+', '', s or '').upper()

PC = Path('../../pagecache')
tests = {
    '7386': ['Armor All Protectant', 'Protectant 300ML', 'PROTECTANT', 'Gloss Protectant'],
    '7154': ['Anchor Standard Silver', 'Standard Silver', '803 Silver', 'SILVER', '803'],
    '4793': ['Toko Yellow Air Hose', 'Yellow Air Hose', 'Air Hose 100Mtr', 'TOKO'],
}
for pos, cands in tests.items():
    t = (PC / f'{pos}.txt').read_text(encoding='utf-8', errors='ignore') if (PC / f'{pos}.txt').exists() else ''
    nt = norm(t)
    print(f'--- {pos} textlen={len(t)} normlen={len(nt)}')
    for c in cands:
        n = norm(c)
        print('   ', c, '->', 'HIT' if n in nt else 'miss')
