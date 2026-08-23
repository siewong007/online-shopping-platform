import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

r = urllib.request.urlopen(urllib.request.Request(
    "https://my.stanleytools.global/search?q=cushion+grip", headers=UA), timeout=25)
h = r.read(900000).decode("utf-8", errors="ignore")
open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\stanley_search_shell.html", "w", encoding="utf-8").write(h)
for pat in [r'"[^"]*api[^"]*"', r'jsonapi[^"\']*', r'views/ajax[^"\']*', r'drupal-settings-json[^>]*>', r'/search[^"\']{0,60}']:
    ms = sorted(set(re.findall(pat, h)))[:20]
    print("==", pat)
    for m in ms:
        print("   ", m[:160])
