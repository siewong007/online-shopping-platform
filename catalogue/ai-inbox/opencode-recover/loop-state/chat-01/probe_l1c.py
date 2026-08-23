#!/usr/bin/env python3
import json, re, ssl, urllib.request, gzip, io

BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state"
UA = {"User-Agent": "Mozilla/5.0", "Accept-Encoding": "gzip"}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    r = urllib.request.urlopen(req, timeout=timeout, context=CTX)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip":
        raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
    return raw

d = json.load(open(BASE + r"\chat-01\serp-L1\probes2.json", encoding="utf-8"))
print("3630 scene7:", d["3630"].get("scene7"))
print("2602 scene7:", d["2602"].get("scene7"))

html = get("https://deka.my/x-one-46/").decode("utf-8", "ignore")
imgs = []
for m in re.finditer(r'https://deka\.my/wp-content/uploads/[^\s"\')]+?\.(?:png|jpe?g|webp)', html):
    u = m.group(0)
    if u not in imgs:
        imgs.append(u)
for i in imgs[:20]:
    print(i)
