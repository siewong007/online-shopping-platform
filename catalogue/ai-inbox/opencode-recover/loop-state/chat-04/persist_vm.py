import csv

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
HDR = ['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'px', 'bytes', 'justification']
rows = [
    ('4287', 'pass', 'yes', 'yes', '1022x1536', '160138B', 'Official kangaroopaint.com bituminous-compound PDP embeds this exact K-Bituminous-1.5kg image; packshot reads KANGAROO BITUMINOUS COMPOUND 1.5kg nett'),
    ('5642', 'fail', 'no', 'no', '1600x798', '188723B', 'Family shot of THREE ponchos green/blue/yellow reading Light Vinyl Poncho ITEM No R-1020L - not a dedicated GREEN packshot and contradicts 0.10MM Heavy SKU; no PDP hosting asset located'),
]
with open(CHAT + r'\verify-r1-batch-21.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    w.writerows(rows)
print('verify-r1-batch-21.csv written')
