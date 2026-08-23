import sys, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

# 1197 Cabana PDP (pattern from verified siblings cb474/cb476)
r = F.fetch_page("1197", "https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb781-bl-detail")
print("1197 page:", r)
print("precheck CB781-BL:", F.precheck_model_in_page("1197", "CB781-BL", "SHE-CAB-CB781-BL"))
