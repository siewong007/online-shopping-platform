import socket, ssl, sys, gzip, io

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

def fetch(host, path, tls=True, timeout=15):
    ctx = ssl.create_default_context() if tls else None
    port = 443 if tls else 80
    s = socket.create_connection((host, port), timeout=timeout)
    ss = ctx.wrap_socket(s, server_hostname=host) if tls else s
    req = ('GET %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: %s\r\n'
           'Accept: text/html,application/xhtml+xml,image/*,*/*;q=0.8\r\n'
           'Accept-Encoding: gzip\r\nConnection: close\r\n\r\n') % (path, host, UA)
    ss.sendall(req.encode())
    chunks = []
    while True:
        c = ss.recv(65536)
        if not c:
            break
        chunks.append(c)
    data = b''.join(chunks)
    i = data.find(b'\r\n\r\n')
    hdrs = data[:i].decode('utf-8', 'replace')
    body = data[i+4:]
    hl = hdrs.lower()
    if 'chunked' in hl:
        out = b''
        rest = body
        while True:
            j = rest.find(b'\r\n')
            if j < 0:
                break
            try:
                sz = int(rest[:j].split(b';')[0], 16)
            except Exception:
                break
            if sz == 0:
                break
            out += rest[j+2:j+2+sz]
            rest = rest[j+2+sz+2:]
        body = out
    if 'gzip' in hl or 'deflate' in hl:
        try:
            body = gzip.GzipFile(fileobj=io.BytesIO(body)).read()
        except Exception:
            try:
                import zlib
                body = zlib.decompress(body, -zlib.MAX_WBITS)
            except Exception:
                pass
    return hdrs, body

if __name__ == '__main__':
    host = sys.argv[1]
    path = sys.argv[2]
    tls = len(sys.argv) < 4 or sys.argv[3] != 'http'
    h, b = fetch(host, path, tls)
    print('STATUS:', h.split('\r\n')[0])
    print('LEN:', len(b))
    for line in h.split('\r\n'):
        ll = line.lower()
        if ll.startswith('location:') or ll.startswith('content-type:'):
            print(line)
    sys.stdout.buffer.write(b[:300000])
