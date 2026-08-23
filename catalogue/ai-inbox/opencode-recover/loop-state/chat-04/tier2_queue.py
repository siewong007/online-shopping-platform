import csv
import json
import os
import re

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
OUT = CHAT + r'\batches\tier2'
os.makedirs(OUT, exist_ok=True)

rows = list(csv.DictReader(open(CHAT + r'\gate-run\loop-ledger.csv', encoding='utf-8-sig')))

BRANDS = {
    'swallow': 'Swallow Abrasive', 'sandex': 'Sandex', 'somax': 'Somax', 'mikasa': 'Mikasa',
    'kangaroo': 'Kangaroo Paint', 'selleys': 'Selleys', 'koya': 'Koya', 'mr. mark|mr mark': 'Mr Mark',
    'hitachi': 'Hitachi', 'boral': 'Boral', 'energizer|enr max|en max': 'Energizer',
    'philips|lifemax': 'Philips Lighting', 'schneider': 'Schneider Electric', 'sharpie': 'Sharpie',
    'mungyo': 'Mungyo', 'faster': 'Faster marker', 'czs': 'CZS lock', 'rolinson': 'Rolinson',
    'king top': 'King Top', 'grow': 'Grow MCB', 'techplas': 'Techplas', 'uniflux': 'Uniflux',
    'pye': 'PYE paints', 'cleanguard': 'Cleanguard', 'oyama': 'Oyama', 'kovea': 'Kovea',
    'prescott': 'Prescott', 'eclipse': 'Eclipse hand tools', 'bosun': 'Bosun', 'asuma': 'Asuma',
    'sensui': 'Sensui files', 'bossman': 'Bossman', 'arrow': 'Arrow fastening', 'worker': 'Worker rollers',
    'leon': 'Leon brush', 'adamark': 'Adamark', "r'key|r.key|rkey": "R'key", 'paint master': 'Paint Master',
    'ace ': 'Ace electrical', 'plk': 'PLK switch SIRIM', 'ums': 'UMS SIRIM', 'lwd': 'LWD SIRIM',
    'nne': 'NNE SIRIM', 'sjp': 'SJP connector', 'middy': 'Middy electrical', 'hafele': 'Hafele',
    'isona': 'Isona', 'butterfly': 'Butterfly gas', 'singer': 'Singer', 'evr': 'EVR battery',
    'dolphin': 'Dolphin battery', 'toplus': 'Toplus paint', 'bintang': 'Bintang refinish',
    'oci': 'OCI gum', 'faris': 'Faris tap', 'sanwa': 'Sanwa valve', 'vip': 'VIP plumbing',
    'lion brand': 'Lion brass', 'umc': 'UMC box', 'marksman': 'Marksman bracket', 'karyon': 'Karyon',
    'prima': 'Prima board', 'mlh': 'MLH timber', 'mrtx': 'MRTX list', 'belian': 'Belian wood',
    'cangkul': 'Cangkul hoe', 'gajah': 'Gajah cotter', 'cock brand': 'Cock Brand', 'fiesto': 'Fiesto sickle',
    'aitachi': 'Aitachi', 'orbit': 'Orbit hose clip', 'rayaco': 'Rayaco', 'hardex': 'Hardex adhesive',
    'nippon': 'Nippon Paint', '3m': '3M', 'progruard': 'Progruard', 'star local': 'Star trowel',
    'sui u': 'Sui U', 'gold pyramid': 'Gold Pyramid roller', 'yta60z1|megaman': 'Megaman LED',
    'dkd|kdk': 'KDK fan', 'panasonic': 'Panasonic', 'stanley': 'Stanley', 'bosch': 'Bosch',
    'dongcheng|dca': 'Dongcheng power tools', 'khind': 'Khind', 'joven': 'Joven water heater',
    'midea': 'Midea', 'nippon paint': 'Nippon Paint', 'rubine': 'Rubine sink', 'sorento': 'Sorento hood',
    'cabana': 'Cabana', 'saniware': 'Saniware', 'leeden': 'Leeden distribution',
}

def hint(name, brand_field):
    text = (name + ' ' + brand_field).lower()
    for pat, brand in BRANDS.items():
        if re.search(pat, text):
            return brand
    return ''

targets = []
for r in rows:
    h = hint(r['display_name'], r['detected_brand'])
    if r['state'] == 'open':
        targets.append((r, h))
    elif r['state'] == 'exhausted' and h:
        targets.append((r, h))

withh = [(r, h) for r, h in targets if h]
noh = [(r, h) for r, h in targets if not h]
print('round-2 queue: total open+branded-exhausted =', len(targets), '| with brand hint =', len(withh), '| generic remainder =', len(noh))

from collections import Counter
c = Counter(h for _, h in withh)
print('top hints:', c.most_common(20))

# pack tier2 batches: hinted first (family-grouped), then generic
def fam(ic):
    p = ic.split('-')
    return '-'.join(p[:3]) if len(p) > 3 else ic

withh.sort(key=lambda x: (x[1], fam(x[0]['item_code'])))
queue = [r for r, _ in withh] + [r for r, _ in noh]
n = 0
for i in range(0, len(queue), 25):
    n += 1
    chunk = queue[i:i + 25]
    data = []
    for r in chunk:
        data.append({'source_position': r['source_position'], 'item_code': r['item_code'],
                     'uom': r['uom'], 'display_name': r['display_name'], 'category': r['category'],
                     'detected_brand': r['detected_brand'], 'detected_model': r['detected_model'],
                     'state_now': r['state'], 'tiers_tried': r['tiers_tried'],
                     'prior_page': r['official_product_page'], 'brand_hint': hint(r['display_name'], r['detected_brand']),
                     'action': ''})
    json.dump(data, open(OUT + r'\t2-%02d.json' % ((i // 25) + 1), 'w', encoding='utf-8'), indent=1)
print('tier2 batch files:', n)

# reopen branded-exhausted rows at tier 2 in the working ledger copy
flipped = 0
for r, h in targets:
    if r['state'] == 'exhausted' and h:
        r['state'] = 'open'
        r['tiers_tried'] = '1'
        if 'reopened_tier2_brand_escalation' not in r['reason']:
            r['reason'] += ' | reopened_tier2_brand_escalation:' + h
        flipped += 1
with open(CHAT + r'\gate-run\loop-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(rows)
print('branded-exhausted reopened to open tier2:', flipped)
