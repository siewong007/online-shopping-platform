import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
for r in d:
    print(f"{r['key']} | {r['code']} | {r['detail'][:140]}")
