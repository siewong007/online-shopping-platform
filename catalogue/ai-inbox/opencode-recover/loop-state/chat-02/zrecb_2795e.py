import sys, socket, os
socket.setdefaulttimeout(25)
CH = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02"
sys.path.insert(0, CH)
import fetchlib as F
POS='2795'
print('CACHED TEXT:', open(os.path.join(F.PAGECACHE, POS+'.txt'), encoding='utf-8').read())
ev = F.fetch_image(POS, 'https://gw-assets.assaabloy.com/is/image/assaabloy/SGAC-DV3776%20-%2001', 3)
print('IMG:', ev)
