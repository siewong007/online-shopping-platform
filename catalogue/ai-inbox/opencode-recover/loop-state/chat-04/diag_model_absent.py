import csv
import glob
import os
import re

BASE = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue'
CHAT = BASE + r'\ai-inbox\opencode-recover\loop-state\chat-04'
PC = BASE + r'\ai-inbox\pagecache'
GRPC = CHAT + r'\gate-run\pagecache'


def norm(s):
    return re.sub(r'[^0-9A-Za-z]+', '', s or '').upper()


def variants(dm, ic):
    out = []
    if dm:
        n = norm(dm)
        if len(n) >= 3:
            out.append(n)
            toks = [norm(t) for t in re.split(r'[^0-9A-Za-z]+', dm) if norm(t)]
            lt = [t for t in toks if len(t) >= 4]
            if lt:
                out.append('TOKENS:' + '|'.join(lt))
    parts = ic.split('-')
    if len(parts) > 1:
        tail = ''.join(parts[1:])
        n = norm(tail)
        if len(n) >= 4:
            out.append(n)
        segs = [norm(s) for s in parts[1:] if norm(s)]
        for i in range(len(segs)):
            acc = ''
            for j in range(i, len(segs)):
                acc += segs[j]
                if len(acc) >= 5 and any(c.isdigit() for c in acc):
                    out.append(acc)
    seen, u = set(), []
    for v in out:
        if v not in seen:
            seen.add(v); u.append(v)
    return u


led = {r['source_position']: r for r in csv.DictReader(open(CHAT + r'\gate-run\loop-ledger.csv', encoding='utf-8'))}
cands = [p for p, r in led.items() if r['state'] == 'candidate']
print('candidates:', cands)
for p in sorted(cands, key=int):
    r = led[p]
    vs = variants(r['detected_model'], r['item_code'])
    src = PC + '\\' + p + '.txt'
    txt = open(src, encoding='utf-8', errors='ignore').read() if os.path.exists(src) else ''
    nt = norm(txt)
    hit = None
    for v in vs:
        if v.startswith('TOKENS:'):
            toks = [t for t in v.split(':', 1)[1].split('|') if t]
            if toks and all(t in nt for t in toks):
                hit = 'TOKENS ' + v
                break
        elif len(v) >= 4 and v in nt:
            hit = v
            break
    print(p, r['item_code'], 'dm=', repr(r['detected_model']), 'variants=', vs[:5], 'pc_exists=', os.path.exists(src), 'len=', len(txt), 'HIT=', hit)

# batch-12 brand scan
kw = re.compile(r'orbit|mikasa|somax|swallow|sandex|kangaroo|selleys|koya|mr\.? ?mark|hitachi|boral|energizer|philips|schneider|sharpie|mungyo|faster|czs|rolinson|king ?top|grow|techplas|uniflux|pye|cleanguard|oyama|kovea|prescott|eclipse|bosun|asuma|sensui|bossman|arrow\b|worker|leon|adamark|r.key|paint master|ace\b|pol\b|ums\b|lwd\b|plk\b|nne\b|sjp\b|sino\b|chnt\b|yunco|hafele|isona|butterfly|singer|evr\b|dolphin|toplus|bintang|oci\b|faris|sanwa|vip\b|lion\b|ita\b|cnn\b|umc\b|marksman|middy|karyon|prima|mlh\b|mrtx|belian|cangkul|gajah|cock brand|fiesto|kangaroo|aitachi|mita? ?bishi|makita|bosch|dca|dongcheng|stanley|sika|khind|joven|midea|nippon|panasonic|kdk|rubine|sorento|cabana|saniware|leeden|yale|abus|stella|hitam|sumo|winmax|ratchet|total\b|ingco|deko', re.I)
rows = list(csv.DictReader(open(CHAT + r'\shard-r1-batch-12.csv', encoding='utf-8')))
hits = [(r['source_position'], r['item_code'], r['display_name'][:50]) for r in rows if kw.search(r['display_name'] + ' ' + r['detected_brand'])]
print('batch-12 branded-looking:', hits)
