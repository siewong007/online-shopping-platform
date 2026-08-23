from PIL import Image
im = Image.open(r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\5642.jpeg')
w, h = im.size
# right pack bottom-right area (item no) - crop right third lower band
crop = im.crop((int(w*0.60), int(h*0.55), w, int(h*0.85)))
crop = crop.resize((crop.width*3, crop.height*3), Image.LANCZOS)
crop.save(r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\5642_item.png')
print('saved', crop.size)
