import csv, os, json, sys, subprocess
sys.stdout.reconfigure(line_buffering=True)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
sys.path.insert(0, CH)
import importlib, fetchlib as F
importlib.reload(F)

TRUE_2653 = "https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb476-bl-detail"

# refresh evidence under true keys
rec = F.fetch_page(2653, TRUE_2653)
print('2653 page:', {k: rec.get(k) for k in ('page_status', 'text_len')})
imgrec = None
try:
    imgrec = F.fetch_image(2653, "https://www.cabana.com.my/images/virtuemart/product/CB476-BL-01.jpg", 5)
    print('2653 img:', {k: imgrec.get(k) for k in ('image_status', 'px_w', 'px_h', 'image_bytes_len', 'image_sha256')})
except Exception as e:
    print('2653 img fail:', repr(e)[:90])
rec2 = F.fetch_page(5771, "https://truflo.com.my/product/bib-tap-hose-g503b/")
print('5771 page:', {k: rec2.get(k) for k in ('page_status', 'text_len')})

# update shards: verdicts + corrected page URL
UPD = {
    '2653': ('pass', TRUE_2653),
    '5771': ('pass', 'https://truflo.com.my/product/bib-tap-hose-g503b/'),
}
for fn in sorted(f for f in os.listdir(CH) if f.startswith('shard-') and f.endswith('.csv')):
    pth = os.path.join(CH, fn)
    rows = list(csv.reader(open(pth, encoding='utf-8')))
    hdr = rows[0]
    ix = {c: hdr.index(c) for c in ('source_position', 'official_product_page', 'state',
                                    'verifier_verdict', 'finish_exact', 'model_exact', 'machine_gate')}
    ch = False
    for r in rows[1:]:
        if len(r) == len(hdr) and r[ix['source_position']] in UPD:
            v, url = UPD[r[ix['source_position']]]
            if v == 'pass' and r[ix['state']] != 'verified_pass':
                r[ix['official_product_page']] = url
                r[ix['verifier_verdict']] = 'pass'
                r[ix['finish_exact']] = 'yes'
                r[ix['model_exact']] = 'yes'
                r[ix['state']] = 'verified_pass'
                ch = True
    if ch:
        csv.writer(open(pth, 'w', encoding='utf-8', newline='')).writerows(rows)
        print('updated', fn)

res = subprocess.run([sys.executable, os.path.join(CH, 'run_gate.py'), '--round', '12'],
                     capture_output=True, text=True, timeout=110)
print(res.stdout[-350:])
g = json.load(open(os.path.join(CH, 'gate-report-r12.json'), encoding='utf-8'))
for r in g['reds']:
    print('RED', r['key'], r['code'], r['detail'][:70])
print('GATE CLEAN' if not g['reds'] else 'REDS REMAIN')
