import sys, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

ev = F.fetch_image(974, "https://www.assets.signify.com/is/image/Signify/MESON_WH_SQ_recessed-SPP?$jpglarge$", 2)
print(ev)
