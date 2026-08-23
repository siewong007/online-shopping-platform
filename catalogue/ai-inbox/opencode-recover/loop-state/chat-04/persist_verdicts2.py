import csv

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
HDR = ['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'px', 'bytes', 'justification']
b24 = [
    ('6331', 'pass', 'yes', 'yes', '1667x1667', '369547B', 'Asset confirmed on official Sui U Machinery & Tools PDP cdn1.npcdn.net acct 24700; image self-labels BOSSMAN BBU4 4in/100mm matching PDP name SKU tags'),
    ('6451', 'pass', 'yes', 'yes', '4167x4168', '649208B', 'Confirmed singer.com.my PDP All-Purpose Oil OL0080 80ml MYR3.55; downloaded file is its exact og:image catalog photo'),
]
with open(CHAT + r'\verify-r1-batch-24.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    w.writerows(b24)
print('verify-r1-batch-24.csv written')
