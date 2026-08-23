import csv

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
HDR = ['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'px', 'bytes', 'justification']

b18 = [
    ('3865', 'pass', 'yes', 'yes', '1122x1125', '119492B', 'Official mybutterfly.com.my PDP SET LPG REGULATOR WITH HOSE 182-CB uses this exact image; packshot shows regulator + 1.5M black hose kit'),
    ('3099', 'pass', 'yes', 'yes', '1320x1320', '113427B', 'Exact wixstatic asset on official kovea.com Gas Torch page ROCKET KT-2008-1; real product photo'),
    ('5232', 'pass', 'yes', 'yes', '800x800', '66220B', 'Packshot reads Selleys Supa Glue Liquid 3mL on Nippon Paint official resourcehub asset hub'),
    ('4660', 'pass', 'yes', 'yes', '800x800', '62913B', 'Packshot reads Selleys Shoe Glue 15mL on Nippon Paint official resourcehub asset hub'),
]
b19 = [
    ('2933', 'pass', 'yes', 'yes', '900x900', '95372B', 'Official Arrow AU JT21CM Light-Duty Staple Gun page SKU ARJT21CM all-chrome uses this exact image; packshot engraved MODEL JT-21M'),
    ('4501', 'pass', 'yes', 'yes', '179x536', '123814B', 'Packshot self-identifies HARDEX Super Instant Adhesive 6495 Special Industry Grade 20g; dims 179x536 verified true long edge 536>=500'),
    ('4767', 'fail', 'no', 'no', '1200x1200', '565348B', 'Sui U marketing composite showing two different Isano models 1363HB + 1364HB with watermarks - family/multi-product shot SKU not identifiable'),
    ('5519', 'pass', 'yes', 'yes', '1000x1000', '263775B', 'Official techplas.com.my FAI-1007 page Side Inlet Ball Valve 9in uses this exact photo; overview confirms 9in arm and 1/2 OD20 fitting'),
]
b23 = [
    ('4562', 'pass', 'yes', 'yes', '800x800', '76190B', 'Official Nippon Paint MY resource-hub packshot Bintang Auto Refinish 1L synthetic enamel White 999'),
]
for name, data in [('verify-r1-batch-18.csv', b18), ('verify-r1-batch-19.csv', b19), ('verify-r1-batch-23.csv', b23)]:
    with open(CHAT + '\\' + name, 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh)
        w.writerow(HDR)
        w.writerows(data)
    print(name, 'written')
