import urllib.request, os
from PIL import Image

outdir = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Referer": "https://www.google.com/"}

jobs = [
    ("5116", "https://sonichardware.com.my/images/com_hikashop/upload/02_1548695577.jpg"),
    ("5158", "https://cdn1.npcdn.net/image/163230874531ddf97cb5e0aa10484005dcb2e573b5.jpg?md5id=8c9ce62eb00bfc39549c0b3cbe197ceb&new_width=1000&new_height=1000&w=-62170009200"),
    ("5468", "https://api.innovestengineering.com/storage/v1/object/public/media/Swallow/2026-06-20T08-37-21-012Z-Swallow-Abrasive-Sand-Paper-xtf800"),
    ("5501", "https://hengweihardware.com/image/hengweimarketing/image/data/all_product_images/product-165/sandpaper-s1.jpg"),
]

for pos, url in jobs:
    try:
        req = urllib.request.Request(url, headers=UA)
        data = urllib.request.urlopen(req, timeout=90).read()
        if data[:8] == b'\x89PNG\r\n\x1a\n':
            ext = 'png'
        elif data[:2] == b'\xff\xd8':
            ext = 'jpg'
        elif data[:4] == b'RIFF':
            ext = 'webp'
        elif data[:6] in (b'GIF87a', b'GIF89a'):
            ext = 'gif'
        else:
            ext = 'bin'
        path = os.path.join(outdir, "%s.%s" % (pos, ext))
        with open(path, 'wb') as f:
            f.write(data)
        im = Image.open(path)
        print("%s|%d|%dx%d|%s" % (pos, len(data), im.size[0], im.size[1], ext))
    except Exception as e:
        print("%s|ERROR|%r" % (pos, e))
