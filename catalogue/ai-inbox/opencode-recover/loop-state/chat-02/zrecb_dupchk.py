import csv, os
base = os.path.dirname(os.path.abspath(__file__))
pairs = [('3622','983'),('4306','974'),('4330','980'),('4669','984'),('2582','1197'),('6437','1191')]
want = set()
for a,b in pairs: want.update([a,b])
with open(os.path.join(base,'chat-02-ledger.csv'), encoding='utf-8-sig', newline='') as fh:
    for r in csv.DictReader(fh):
        if r['source_position'] in want:
            print(r['source_position'], '|', r['item_code'], '|', r['uom'], '|', r['display_name'][:50], '| state=', r['state'], 'dec=', r['researcher_decision'])
