import re, sys
p = r"C:\Users\DELL\.local\share\opencode\tool-output\tool_02c113546001dEWHwjMNP9AEzd"
t = open(p, encoding="utf-8", errors="ignore").read()
links = re.findall(r'(/showproducts/productid/\d+/[^"\']*)', t)
seen = []
for u in links:
    if u not in seen:
        seen.append(u)
for u in seen[:40]:
    print(u[:110])
print("---M-tokens---")
print(sorted(set(re.findall(r"M0[0-9]{2}[A-Z]*", t))))
