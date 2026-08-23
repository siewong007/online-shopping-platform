import re, sys, socket, time, json, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

QUERIES = {
    "1171": 'Zheng Tu "ZT2093" hook',
    "1172": 'Sawman "A68" drill bit',
    "1173": '"i-fixh" wire rig 50LB',
    "1174": 'Ecogreen "EG4011" adaptor',
    "1175": 'female speaker clip gold terminal',
    "1177": 'Glotool polyester grip cotton glove grey',
    "1178": 'wire mesh galvanised "X18G"',
    "1179": 'white nylon fishing line "NO.30"',
    "1180": '"J3030" floor 30x30cm',
    "1181": 'Hytac hook "12146BN"',
    "1182": 'Ecogreen "EG4012" tap adaptor',
    "1183": 'stainless steel cable tie "M4.6X100MM" SUS304',
    "1184": '"HP-106" fishing spool',
    "1185": '"YG252" brass connector 10mm',
    "1186": 'Scin powder filla filler 464gm',
    "1187": 'stainless hose clip 2-1/2 40-63mm',
    "1188": '"HP-105" fishing spool',
    "1189": '"FF125" plastic fishing float',
    "1190": 'round external cap 19mm chain',
    "1192": 'round shape sinker no 6 fishing',
    "1193": 'Glotool "P.J." anchor 3/8 x 3',
    "1194": 'plastic net needle no 5 white fishing',
    "1195": 'Glotool "P.J." anchor 5/16 x 2-5/8',
    "1196": '"CA215" stainless steel sink waste',
    "1199": 'Premio wall bib tap "TB-2016Q"',
    "1198": 'Mitsubishi magnetic contactor SC-N2S',
}

out = {"1170": {"q": '"HP-107" fishing spool', "n_items": 10,
                "titles": ["Laptop Computers Desktops Printers Ink Toner | HP Malaysia // Official HP Drivers", "(junk: HP Inc. computers)"]}}
for pos, q in QUERIES.items():
    u = "https://www.bing.com/search?q=" + urllib.parse.quote(q) + "&format=rss"
    try:
        req = urllib.request.Request(u, headers=F.UA)
        t = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", errors="ignore")
        items = re.findall(r"<item><title>(.*?)</title><link>(.*?)</link>", t)
        titles = [re.sub(r"<!\[CDATA\[|\]\]>|&[a-z]+;", "", i[0])[:70] for i in items[:3]]
        out[pos] = {"q": q, "n_items": len(items), "titles": titles}
        print(pos, q[:45], "->", len(items), "|", " // ".join(titles)[:140])
    except Exception as e:
        out[pos] = {"q": q, "err": repr(e)[:100]}
        print(pos, "ERR", repr(e)[:80])
    time.sleep(1.0)

json.dump(out, open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_rss_results.json", "w"), indent=1, ensure_ascii=False)
print("saved rss results")

print("\n=== Nippon Wayback retry ===")
try:
    r = F.fetch_page("1176x", "http://web.archive.org/web/20250423023102id_/https://www.nipponpaint.com.my/product/steel-wired-paint-brush/")
    print("retry:", r)
    if r.get("page_status") == 200:
        t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\1176x.txt", encoding="utf-8", errors="ignore").read()
        nt = F.norm_text(t)
        print("N10:", "N10" in nt, "| TR880:", "TR880" in nt)
        i = nt.find("STEELWIRED")
        print(nt[max(0,i-50):i+300] if i >= 0 else t[:300])
except Exception as e:
    print("retry err", repr(e)[:120])
