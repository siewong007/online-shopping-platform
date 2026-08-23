import socket, urllib.request, urllib.error, concurrent.futures as cf
socket.setdefaulttimeout(12)
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

def probe(d):
    try:
        r=urllib.request.urlopen(urllib.request.Request(d,headers=UA),timeout=12)
        b=r.read(2000)
        return f"OK {r.status} {d} len={len(b)} :: {b[:150]!r}"
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code} {d}"
    except Exception as e:
        return f"ERR {d} {repr(e)[:80]}"

doms=[
 "http://www.kprix.co.kr/robots.txt","http://kprix.com/robots.txt","https://kprix.co.kr/robots.txt",
 "https://eupro.com.my/robots.txt","http://eupro.com.my/robots.txt","https://www.eupro.com.my/",
 "https://www.truflo.com.my/robots.txt",
 "https://paintmaster.com.my/robots.txt","http://paintmaster.com.my/robots.txt",
 "https://www.ecogreen.com.my/robots.txt","https://ecogreen.com.sg/robots.txt","http://ecogreen.com.sg/robots.txt",
]
with cf.ThreadPoolExecutor(max_workers=12) as ex:
    for res in ex.map(probe,doms):
        print(res,flush=True)
