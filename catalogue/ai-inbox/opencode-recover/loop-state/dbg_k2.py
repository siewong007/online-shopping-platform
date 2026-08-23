import sys, types
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
src = open(r"catalogue\ai-inbox\opencode-recover\loop-state\serp_k2.py", encoding="utf-8").read()
head = src.split("# pos, brand, model")[0]
m = types.ModuleType("k2")
m.__dict__["__file__"] = r"catalogue\ai-inbox\opencode-recover\loop-state\serp_k2.py"
exec(head, m.__dict__)
r = m.run_query('"Ecogreen" "EG4021" site:.com.my')
print(r["kind"], "|", r["note"])
for t, u in r["results"][:3]:
    print("  ", t[:60], "|", u[:100])
