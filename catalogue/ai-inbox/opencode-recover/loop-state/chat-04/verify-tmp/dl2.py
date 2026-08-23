import urllib.request, ssl, os
from PIL import Image

outdir = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp"
ctx = ssl._create_unverified_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}

url = "https://sonichardware.com.my/images/com_hikashop/upload/02_1548695577.jpg"
req = urllib.request.Request(url, headers=UA)
data = urllib.request.urlopen(req, timeout=90, context=ctx).read()
path = os.path.join(outdir, "5116.jpg")
with open(path, 'wb') as f:
    f.write(data)
im = Image.open(path)
print("5116|%d|%dx%d|%s" % (len(data), im.size[0], im.size[1], path[-4:]))
