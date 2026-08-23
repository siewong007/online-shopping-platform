#!/usr/bin/env python3
import struct
import urllib.request


def jpeg_size(b):
    i = 2
    while i < len(b):
        if b[i] != 0xFF:
            i += 1
            continue
        marker = b[i + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3):
            h, w = struct.unpack(">HH", b[i + 5:i + 9])
            return w, h
        if marker in (0xD8, 0xD9):
            i += 2
            continue
        seg = struct.unpack(">H", b[i + 2:i + 4])[0]
        i += 2 + seg
    return None


for name, u in [
    ("ceram1600", "https://sika.scene7.com/is/image/sikacs/my-SikaCeram-88-25kg-01536099:1-1?wid=1600&hei=1600&fit=constrain"),
    ("grout1600", "https://sika.scene7.com/is/image/sikacs/my-02-en-MY-Sikagard-703-GroutSeal-1x1-00557701:1-1?wid=1600&hei=1600&fit=constrain"),
]:
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    r = urllib.request.urlopen(req, timeout=30, context=__import__("ssl")._create_unverified_context())
    b = r.read()
    print(name, len(b), "bytes", jpeg_size(b))
