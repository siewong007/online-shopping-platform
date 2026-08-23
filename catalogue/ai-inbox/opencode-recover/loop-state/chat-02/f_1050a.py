import sys, socket, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

UA = F.UA
def get(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25)
        return r.status, r.read(500000).decode("utf-8", "ignore"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, "", url
    except Exception as e:
        return -1, repr(e)[:80], url

# --- Bosny B136 (pos 3508) ---
print("== bosny", F.fetch_page(3508, "https://www.bosny.com/product/bosny-zinc-bright-galvanize-3in1-b136/"))
print("   precheck:", F.precheck_model_in_page(3508, "B136-40CC", "SPRA-BOSNY-B136-400CC"))
st, txt, fu = get("https://www.bosny.com/product/bosny-zinc-bright-galvanize-3in1-b136/")
imgs = re.findall(r'(?is)<meta[^>]+property="og:image"[^>]+content="([^"]+)"', txt)
imgs += re.findall(r'<img[^>]+src="([^"]+(?:wp-content/uploads)[^"]+)"', txt)
print("   imgs:", list(dict.fromkeys(imgs))[:8])

# --- Cabana cb474 detail (pos 2751) ---
p = "https://www.cabana.com.my/index.php/sorento/bathroom/bathroom-accessories/shelf/cb474-detail"
print("== cabana", F.fetch_page(2751, p))
print("   precheck:", F.precheck_model_in_page(2751, "L350", "SHE-CAB-CB474-BLK"))
st, txt, fu = get(p)
imgs = re.findall(r'<img[^>]+src="([^"]+virtuemart[^"]+)"', txt)
print("   imgs:", list(dict.fromkeys(imgs))[:10])
print("   BLK mention:", re.findall(r"(BLK|BLACK|CB474[\w/-]*)", txt.upper())[:20])
