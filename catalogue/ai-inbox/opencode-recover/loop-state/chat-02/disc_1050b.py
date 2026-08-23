import sys, socket, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,*/*;q=0.5", "Accept-Language": "en-MY,en;q=0.9"}

def get(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25)
        return r.status, r.read(300000).decode("utf-8", "ignore"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, "", url
    except Exception as e:
        return -1, repr(e)[:80], url

# 1) cabana homepage: find search form / product link patterns
st, txt, fu = get("https://www.cabana.com.my/")
print("CABANA", st, fu)
forms = re.findall(r'(?is)<form[^>]*action="([^"]+)"', txt)
print("  forms:", forms[:5])
links = re.findall(r'href="([^"]*(?:search|product|virtuemart)[^"]*)"', txt, re.I)
seen = []
for l in links:
    if l not in seen: seen.append(l)
print("  links:", seen[:12])

# 2) DNS/domain variants
for d in ["https://www.mrmark.com.my/", "https://mrmark.com.my/", "https://www.uni-trend.com.cn/",
          "https://www.uni-trend.com/", "https://morriesworldwide.com/", "https://www.morries.com.my/"]:
    st, txt, fu = get(d)
    t = re.search(r"<title[^>]*>(.*?)</title>", txt, re.S | re.I)
    print(d[:60], "->", st, "| title:", (t.group(1)[:70].strip() if t else "-"))
