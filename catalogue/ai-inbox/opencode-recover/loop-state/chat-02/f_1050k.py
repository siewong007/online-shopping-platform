import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

st_raw = F._open("https://hager.com/au/search?q=EH711").read(900000).decode("utf-8", "ignore")
print("NEXT_DATA present:", '__NEXT_DATA__' in st_raw, "| len:", len(st_raw))
ukeys = re.findall(r'"url_key"\s*:\s*"([^"]*eh711[^"]*)"', st_raw)
imgs = re.findall(r'"image_url"\s*:\s*"([^"]*(?:EH711|eh711)[^"]*)"', st_raw)
names = re.findall(r'"name"\s*:\s*"(EH711)"[^}]*?"short_description"\s*:\s*"([^"]*)"', st_raw)
descs = re.findall(r'"short_description"\s*:\s*"([^"]{0,80})"[^}]*?"commercialRef"\s*:\s*"EH711"', st_raw)
print("url_keys:", set(ukeys))
print("imgs:", set(imgs))
print("names+desc:", names[:4], "| descs:", descs[:4])
