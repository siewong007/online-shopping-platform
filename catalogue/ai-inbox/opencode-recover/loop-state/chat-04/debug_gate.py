import csv
import sys

sys.path.insert(0, r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\gate-run')
import gate  # import only - never modify

print('PAGECACHE =', gate.PAGECACHE)
rows = {r['source_position']: r for r in csv.DictReader(open(gate.STATE_DIR.parent / 'gate-run' / 'loop-ledger.csv', encoding='utf-8'))}
for p in ['3401', '6796', '4552', '5116', '6243']:
    r = rows[p]
    tf = gate.PAGECACHE / (p + '.txt')
    txt = tf.read_text(encoding='utf-8', errors='ignore') if tf.exists() else ''
    vs = gate.model_variants(r)
    nt = gate.norm_text(txt)
    mp = gate.model_present(r, txt)
    print(p, 'file=', tf.exists(), 'len=', len(txt), 'mp=', mp)
    print('   variants=', vs[:6])
    print('   head=', repr(txt[:200]))
    for v in vs[:6]:
        if v.startswith('TOKENS:'):
            toks = [t for t in v.split(':', 1)[1].split('|') if t]
            print('   tok', toks, [t in nt for t in toks])
        else:
            print('   var', v[:20], v in nt)
