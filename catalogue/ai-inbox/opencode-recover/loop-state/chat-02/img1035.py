import sys, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

ev = F.fetch_image(1035, "https://truflo.com.my/wp-content/uploads/2019/10/TF-Bib-tap-hose-1.jpg", 1)
print(ev, flush=True)
