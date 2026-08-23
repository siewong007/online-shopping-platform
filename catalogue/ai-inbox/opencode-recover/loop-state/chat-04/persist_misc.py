import csv

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
HDR = ['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'px', 'bytes', 'justification']
misc = [
    ('3401', 'pass', 'yes', 'yes', '600x600', '21851B', 'Hafele PDP lists Cat.No 489.93.125 Function=Entrance SUS304 knobset; og:image is this exact file'),
    ('6796', 'pass', 'yes', 'yes', '3000x3000', '1026202B', 'Spear-and-Jackson Eclipse Junior Saw Blades PDP embeds product-images_11; photo shows Eclipse 71-132R 6in blades'),
    ('4552', 'fail', 'yes', 'no', '1600x1600', '41462B', 'Signify asset LPPR1_TLD_STD_G13 is TL-D Standard family hero, not Lifemax'),
]
with open(CHAT + r'\verify-r1-misc.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(HDR)
    w.writerows(misc)
print('verify-r1-misc.csv written')
