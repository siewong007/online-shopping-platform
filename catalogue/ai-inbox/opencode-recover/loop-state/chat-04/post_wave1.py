import csv
CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
order = ['6243', '6358', '6488', '4922', '5925', '6489', '6008']
verdicts = {
    '6243': ('pass', 'yes', 'yes', '1000x1000', '162378B', 'Card clearly shows CR2032 lithium coin cell, 2032 and 1 PACK - exact model and pack count'),
    '6358': ('pass', 'yes', 'yes', '1000x1000', '192010B', 'Card clearly shows CR2016, 2016 and 1 BATT/PILE - exact model and pack count'),
    '6488': ('pass', 'yes', 'yes', '1000x1000', '186151B', 'Card clearly shows CR2025, 2025 and 1 BATT/PILE - exact model and pack count'),
    '4922': ('pass', 'yes', 'yes', '521x600', '122463B', 'Blister marked AAA2 with two MAX AAA cells - correct model and 2PC pack'),
    '5925': ('pass', 'yes', 'yes', '521x600', '118689B', 'Blister marked AA8 with eight MAX AA cells - correct model and 8PC pack'),
    '6489': ('pass', 'yes', 'yes', '517x600', '107017B', 'Blister marked 9V1 with a single MAX 9V battery - correct model and 1PC pack'),
    '6008': ('pass', 'yes', 'yes', '525x600', '116384B', 'Blister marked AAA8 with eight MAX AAA cells - correct model and 8PC pack')}
with open(CHAT + r'\verify-r1-batch-02.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'px', 'bytes', 'justification'])
    for p in order:
        v = verdicts[p]
        w.writerow([p, v[0], v[1], v[2], v[3], v[4], v[5]])
print('verify-r1-batch-02.csv written')

# scope branded-looking exhausts that deserve tier-2/3 escalation later
import re
kw = re.compile(r'orbit|mikasa|somax|swallow|sandex|kangaroo|selleys|koya|mr\.? ?mark|hitachi|boral|energizer|philips|schneider|sharpie|mungyo|faster|czs|rolinson|king ?top|grow|techplas|uniflux|pye|cleanguard|oyama|kovea|prescott|eclipse|bosun|asuma|sensui|bossman|arrow|worker|leon|adamark|r.key|paint master|3m|ace|pol|ums|lwd|plk|nne|sjp|sino|chnt|yunco|hafele|isona|butterfly|singer|evr|dolphin|toplus|bintang|oci|faris|sanwa|vip|lion|ita|cnn|umc|tech|marksman|middy|chnt|karyon|prima|mlh|mrtx|belian|cangkul|gajah|cock brand|fiesto', re.I)
n = 0
for b in ['01', '02', '05', '06', '08']:
    try:
        rows = list(csv.DictReader(open(CHAT + r'\shard-r1-batch-' + b + '.csv', encoding='utf-8')))
    except FileNotFoundError:
        continue
    hits = [r['source_position'] + ':' + r['item_code'] for r in rows if r['state'] == 'exhausted' and kw.search(r['display_name'] + ' ' + r['detected_brand'])]
    n += len(hits)
    print('batch', b, 'branded-exhaust candidates for escalation:', hits)
print('total flagged:', n)
