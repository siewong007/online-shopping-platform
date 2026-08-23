#!/usr/bin/env python3
"""ESC-2 fast DNS check with per-host timeout."""
import socket
from concurrent.futures import ThreadPoolExecutor

HOSTS = [
    "ums.com.my", "www.ums.com.my", "nne.com.my", "www.nne.com.my",
    "kingsway.com.my", "www.kingsway.com.my", "kingswayelectric.com.my",
    "samurai.com.my", "acebrand.com.my", "maxwellcable.com.my",
    "kancil.com.my", "glotool.com", "glotool.com.my",
    "sonichardware.com.my", "www.sonichardware.com.my",
    "ewd.com.my", "vago.com.my", "hunter.com.my",
    "isafe.com.my", "cielo.com.my", "cimalighting.com.my",
]

def chk(h):
    socket.setdefaulttimeout(6)
    try:
        return f"{h} -> {socket.gethostbyname(h)}"
    except Exception:
        return f"{h} -> NXDOMAIN"

with ThreadPoolExecutor(max_workers=22) as ex:
    for r in ex.map(chk, HOSTS):
        print(r)
