import urllib.request, ssl, hashlib, struct, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

def get(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    try:
        r = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        return r.status, r.geturl(), r.headers.get('Content-Type', ''), r.read(15000000)
    except Exception as e:
        return -1, url, repr(e)[:80], b''

def dims(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        w, h = struct.unpack('>II', b[16:24]); return w, h
    if b[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(b):
            if b[i] != 0xFF:
                i += 1; continue
            m = b[i+1]
            if m in (0xC0, 0xC1, 0xC2, 0xC3):
                h, w = struct.unpack('>HH', b[i+5:i+9]); return w, h
            i += 2 + max(struct.unpack('>H', b[i+2:i+4])[0], 2)
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
        fmt = b[12:16]
        try:
            if fmt == b'VP8X':
                return int.from_bytes(b[24:27], 'little') + 1, int.from_bytes(b[27:30], 'little') + 1
            if fmt == b'VP8 ':
                return struct.unpack('<H', b[26:28])[0] & 0x3FFF, struct.unpack('<H', b[28:30])[0] & 0x3FFF
        except Exception:
            pass
    return 0, 0

rows = {
    '223': ('http://web.archive.org/web/20260511115005/https://www.panasonic.com/my/consumer/kitchen-appliance/water/cartridge/tk-cs200c-ex.html',
            'http://web.archive.org/web/20250423223154im_/https://www.panasonic.com/content/dam/pim/my/en/TK/TK-CS2/TK-CS200C/ast-1885802.png',
            ['TK-CS200C', 'EX']),
    '23': ('https://khind.com.my/products/3-6l-commercial-rice-cooker',
           'https://khind.com.my/cdn/shop/files/ssmy.zone-1717059514-RC365_WH_Cover.jpg?v=1751809047',
           ['RC3636', 'RC365', 'grey', 'grey']),
    '999': ('https://www.cimawholesale.com/led-downlight/cielo-gen-iii-199y-f-12w-18w-round-square-led-downlight-2-year-warranty',
            'https://cimawholesale.com/image/cimawholesale/image/data/all_product_images/product-2214/DL-L-199-CIE%20(1).jpg',
            ['199Y', '18W', 'round', '840']),
}
for pos, (page, img, probes) in rows.items():
    st, fin, ct, body = get(page)
    txt = body.decode('utf-8', errors='ignore') if st == 200 else ''
    nt = re.sub(r'[^0-9A-Za-z]+', '', txt).upper()
    print(f'== pos {pos} page {st} {ct[:40]} len={len(body)} final={fin[:100]}')
    for p in probes:
        print('   probe', p, '->', 'HIT' if re.sub(r'[^0-9A-Za-z]+', '', p).upper() in nt else 'miss')
    st2, fin2, ct2, img_b = get(img)
    w, h = dims(img_b) if img_b else (0, 0)
    print(f'   img {st2} ct={ct2[:40]} len={len(img_b)} dims={w}x{h} sha={hashlib.sha256(img_b).hexdigest()[:20] if img_b else "-"}')
