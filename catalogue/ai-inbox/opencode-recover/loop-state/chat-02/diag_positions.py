import csv, os, sys
sys.stdout.reconfigure(line_buffering=True)
brief = list(csv.DictReader(open(r'catalogue/ai-inbox/opencode-recover/loop-state/chat-assignments/chat-02.csv', encoding='utf-8-sig')))
idx = {}
for r in brief:
    idx[r['item_code']] = r
tests = ['CUT-KNI-CK-X11R16','CUT-SCI-JM-317','GAR-RAK-PVC-20T','SHE-CAB-CB476-BLK',
         'ELE-D/L-PHL-59467-SQ-6500K','SWI-SOC-MK-G2977','CUT-DEW-DW4724','KOYA-GRE-P611-1/2KG',
         'DOR-VIE-SGD-DV3776SN','SPRA-BOSNY-B136-400CC','BIB-G503B','SHE-CAB-CB474-BLK',
         'TOO-HSA-BAH-NP19','ELE-TIM-HAG-EH711','MEA-TAJ-LB39H','SHE-CAB-CB781-BL']
for ic in tests:
    b = idx.get(ic)
    print(ic, '-> ordinal', b['ordinal'] if b else '?', 'pos', b['source_position'] if b else '?')
print()
CH = r'catalogue/ai-inbox/opencode-recover/loop-state/chat-02'
for fn in ['shard-960-989.csv', 'shard-1110-1139.csv', 'shard-1170-1199.csv', 'shard-900-929.csv']:
    p = os.path.join(CH, fn)
    rows = list(csv.DictReader(open(p, encoding='utf-8')))
    print(fn, 'sample positions:', [r['source_position'] for r in rows[:8]])
