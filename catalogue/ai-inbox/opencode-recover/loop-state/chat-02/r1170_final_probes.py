import re, sys, socket, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

# save rss log (utf-8 safe)
txt = """1170 q:'"HP-107" fishing spool' -> HP Inc computers junk
1171 q:'Zheng Tu "ZT2093" hook' -> cover-letter templates junk
1172 q:'Sawman "A68" drill bit' -> Gmail junk
1173 q:'"i-fixh" wire rig 50LB' -> Instagram/Wikipedia junk
1174 q:'Ecogreen "EG4011" adaptor' -> Taiwanese blog junk
1175 q:'female speaker clip gold terminal' -> Windows-help junk
1177 q:'Glotool polyester grip cotton glove grey' -> Dcard forum junk
1178 q:'wire mesh galvanised "X18G"' -> Wire messenger junk
1179 q:'white nylon fishing line "NO.30"' -> Wikipedia white junk
1180 q:'"J3030" floor 30x30cm' -> JP catering junk
1181 q:'Hytac hook "12146BN"' -> Microsoft campus junk
1182 q:'Ecogreen "EG4012" tap adaptor' -> YouTube junk
1183 q:'stainless steel cable tie "M4.6X100MM" SUS304' -> generic stainless-steel wiki
1184 q:'"HP-106" fishing spool' -> HP Inc computers junk
1185 q:'"YG252" brass connector 10mm' -> Meralco junk
1186 q:'Scin powder filla filler 464gm' -> Naver finance junk
1187 q:'stainless hose clip 2-1/2 40-63mm' -> generic stainless wiki
1188 q:'"HP-105" fishing spool' -> HP Inc computers junk
1189 q:'"FF125" plastic fishing float' -> fleetguard filter/Fostex junk (no fishing float OEM)
1190 q:'round external cap 19mm chain' -> dictionary/wiki junk
1192 q:'round shape sinker no 6 fishing' -> dictionary/wiki junk
1193 q:'Glotool "P.J." anchor 3/8 x 3' -> Facebook login junk
1194 q:'plastic net needle no 5 white fishing' -> Zhihu junk
1195 q:'Glotool "P.J." anchor 5/16 x 2-5/8' -> YouTube junk
1196 q:'"CA215" stainless steel sink waste' -> Microsoft junk
1198 q:'Mitsubishi magnetic contactor SC-N2S' -> Facebook login junk
1199 q:'Premio wall bib tap "TB-2016Q"' -> Google translate/images junk"""
open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_rss_log.txt", "w", encoding="utf-8").write(txt)
print("rss log saved")

print("=== Nippon Wayback retry ===")
try:
    r = F.fetch_page("1176x", "http://web.archive.org/web/20250423023102id_/https://www.nipponpaint.com.my/product/steel-wired-paint-brush/")
    print("retry:", r)
    if r.get("page_status") == 200:
        t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\1176x.txt", encoding="utf-8", errors="ignore").read()
        nt = F.norm_text(t)
        print("N10:", "N10" in nt, "| TR880:", "TR880" in nt, "| STEELWIRED:", "STEELWIRED" in nt)
        i = t.upper().find("STEEL WIRED")
        print(t[max(0, i - 120):i + 500].replace("\n", " ")[:600])
except Exception as e:
    print("retry err", repr(e)[:140])

print("=== hashes for my candidates ===")
for ln in open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\hashes.csv", encoding="utf-8"):
    if ln.startswith(("1191,", "1197,")):
        print(ln.strip()[:200])
