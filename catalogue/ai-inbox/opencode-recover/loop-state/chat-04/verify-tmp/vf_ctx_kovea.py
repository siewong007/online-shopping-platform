import re
p = r'C:\Users\DELL\.local\share\opencode\tool-output\tool_02bf0fcd200178ZaABBZHOtd65'
txt = open(p, 'rb').read().decode('utf-8', 'replace')
i = txt.find('7861da_1cf21c57c2fc431c9eec10ddd1e6b1ed')
seg = txt[i:i+9000]
t = re.sub(r'<script.*?</script>', ' ', seg, flags=re.S)
t = re.sub(r'<style.*?</style>', ' ', t, flags=re.S)
t = re.sub(r'<[^>]+>', '\n', t)
lines = [l.strip() for l in t.split('\n') if l.strip()]
for l in lines[:60]:
    print(l[:200])
