import csv
import datetime
import pathlib

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'

rows = [
    ('5116', 'pass', 'yes', 'yes', '550x473', '188434B', 'Sonic Hardware PDP 1574 lists Sheet 60# variant and HTML references this exact image file'),
    ('5158', 'pass', 'yes', 'yes', '1000x990', '311208B', 'Cheong Seng PDP 3504187 contains identical CDN md5id and text Grade available from #60 #80 #100'),
    ('5468', 'pass', 'yes', 'yes', '500x500', '25758B', 'Innovest PDP main image resolves to the exact given media key; Specifications list grits including 120#'),
    ('5501', 'pass', 'yes', 'yes', '600x598', '166821B', 'Heng Wei PDP main image is exactly product-165/sandpaper-s1.jpg with 100# option listed'),
]
with open(CHAT + r'\verify-r1-batch-01.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'px', 'bytes', 'justification'])
    w.writerows(rows)
print('verify-r1-batch-01.csv written')

cl = pathlib.Path(CHAT).parent / 'chat-assignments' / 'claims'
now = datetime.datetime.utcnow().isoformat()
for sid in ['S%04d' % i for i in range(52, 69)]:
    p = cl / (sid + '.claim')
    if p.exists():
        try:
            p.write_text('chat=04,utc=%s,status=working' % now)
        except OSError as e:
            print('claim write fail', sid, e)
print('heartbeats refreshed')
