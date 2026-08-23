import urllib.request, ssl, hashlib, struct, re

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

def get(url, timeout=50):
    req = urllib.request.Request(url, headers=UA)
    try:
        r = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        return r.status, r.geturl(), r.headers.get('Content-Type', ''), r.read(15000000)
    except Exception as e:
        return -1, url, repr(e)[:70], b''

def dims(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', b[16:24])
    if b[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(b):
            if b[i] != 0xFF:
                i += 1; continue
            if b[i+1] in (0xC0, 0xC1, 0xC2, 0xC3):
                h, w = struct.unpack('>HH', b[i+5:i+9]); return w, h
            i += 2 + max(struct.unpack('>H', b[i+2:i+4])[0], 2)
    return 0, 0

print('==== 999 cimawholesale image inventory')
st, fin, ct, body = get('https://www.cimawholesale.com/led-downlight/cielo-gen-iii-199y-f-12w-18w-round-square-led-downlight-2-year-warranty')
html = body.decode('utf-8', errors='ignore') if st == 200 else ''
imgs = re.findall(r'<img[^>]+>', html)
for tag in imgs:
    m = re.search(r'src="([^"]+)"', tag)
    a = re.search(r'alt="([^"]*)"', tag)
    if m and 'product' in m.group(1).lower():
        print('   IMG:', m.group(1)[-80:], '| alt=', (a.group(1) if a else '')[:60])
st2, fin2, ct2, ib = get('https://cimawholesale.com/image/cimawholesale/image/data/all_product_images/product-2214/DL-L-199-CIE%20(1).jpg')
w, h = dims(ib) if ib else (0, 0)
print('   target img:', st2, ct2[:30], len(ib), f'{w}x{h}', hashlib.sha256(ib).hexdigest()[:16] if ib else '-')

print('==== Buteline rows')
brows = {
    '721': ('https://www.buteline.com/my/buteline-pe/buteline-pe-fittings/equal-elbows',
            'https://www.buteline.com/asset/10907/w1200-h1200-q90.jpeg', ['20 x 20', '20mm x 20mm', 'ELB-2020']),
    '742': ('https://www.buteline.com/my/buteline-pe/buteline-pe-fittings/equal-tees',
            'https://www.buteline.com/asset/10909/w1200-h1200-q90.jpeg', ['25 x 25 x 25', '25mm']),
    '490': ('https://www.buteline.com/my/buteline-pe/buteline-pe-fittings/female-swivel-elbows',
            'https://www.buteline.com/asset/10914/w1200-h1200-q90.jpeg', ['25 x 1/2', '25mm x 1/2']),
    '799': ('https://www.buteline.com/my/buteline-pe/buteline-pe-fittings/reducing-tees',
            'https://www.buteline.com/asset/10917/w1200_q95.jpeg', ['25 x 25 x 20', '25 x 20']),
    '869': ('https://www.buteline.com/my/buteline-pe/buteline-pe-fittings/straight-inline-couplings',
            'https://www.buteline.com/asset/10922/w1200_q95.jpeg', ['25 x 20', 'reducing coupling']),
    '582': ('https://www.buteline.com/my/buteline-pe/buteline-pe-fittings/straight-female-swivels',
            'https://www.buteline.com/asset/10920/w1200_q95.jpeg', ['25 x 1/2', 'straight female swivel']),
}
for pos, (page, img, probes) in brows.items():
    st, fin, ct, body = get(page)
    txt = body.decode('utf-8', errors='ignore') if st == 200 else ''
    low = txt.lower().replace(' ', '')
    print(f'== pos {pos} page {st} len={len(body)}')
    hits = [p for p in probes if p.replace(' ', '').lower() in low]
    print('   probes:', hits, '| misses:', [p for p in probes if p not in hits])
    st3, fin3, ct3, ib = get(img)
    w, h = dims(ib) if ib else (0, 0)
    print('   img:', st3, ct3[:30], len(ib), f'{w}x{h}', hashlib.sha256(ib).hexdigest()[:16] if ib else '-')
