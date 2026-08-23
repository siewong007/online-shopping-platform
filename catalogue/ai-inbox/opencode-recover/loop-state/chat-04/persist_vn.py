import csv
import datetime
import pathlib

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
BASE = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover'
HDR = ['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'px', 'bytes', 'justification']
rows = [
    ('3185', 'fail', 'no', 'no', '600x600', '22631B', 'sonichardware asset is a MIKASA braided PVC water hose packshot, not VIP SS304 double grating 6x6; no grating PDP found'),
    ('4633', 'pass', 'yes', 'yes', '1000x1006', '114774B', 'rayaco.com.my official PDP productid 2989433 hosts this exact CDN image; packshot labeled RAYACO V8120-2 48L multipurpose bin with handle cover sold as 12-gallon pail'),
]
with open(CHAT + r'\verify-r1-batch-20.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    w.writerows(rows)
print('verify-r1-batch-20.csv written')

cl = pathlib.Path(BASE) / 'loop-state' / 'chat-assignments' / 'claims'
now = datetime.datetime.utcnow().isoformat()
n = 0
for sid in ['S%04d' % i for i in range(52, 69)]:
    p = cl / (sid + '.claim')
    if p.exists():
        try:
            p.write_text('chat=04,utc=%s,status=working' % now); n += 1
        except OSError:
            pass
print('heartbeats:', n)
