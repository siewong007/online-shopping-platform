import re
p = r'C:\Users\DELL\.local\share\opencode\tool-output\tool_02be850b0001FUAXHoDz42sOC3'
txt = open(p, 'rb').read().decode('utf-8', 'replace')
# find b_algo blocks and extract hrefs/cites/titles
blocks = re.split(r'<li class="b_algo', txt)[1:]
print('results:', len(blocks))
for b in blocks[:10]:
    href = re.search(r'<a[^>]+href="(http[^"]+)"', b)
    cite = re.search(r'<cite>(.*?)</cite>', b, re.S)
    title = re.search(r'<h2>.*?>(.*?)</a></h2>', b, re.S)
    print('HREF:', (href.group(1)[:200] if href else None))
    if title:
        t = re.sub(r'<[^>]+>', '', title.group(1))
        print('TITLE:', t[:150])
    if cite:
        c = re.sub(r'<[^>]+>', '', cite.group(1))
        print('CITE:', c[:150])
    print('---')
