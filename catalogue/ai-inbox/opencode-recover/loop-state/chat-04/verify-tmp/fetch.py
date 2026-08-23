import socket, ssl, re, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def get(ip, host, path):
    s = socket.create_connection((ip, 443), timeout=20)
    ss = ctx.wrap_socket(s, server_hostname=host)
    req = ("GET %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
           "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36\r\n"
           "Accept: text/html,*/*\r\nConnection: close\r\n\r\n" % (path, host))
    ss.sendall(req.encode())
    data = b""
    while True:
        b = ss.recv(65536)
        if not b:
            break
        data += b
        if len(data) > 8_000_000:
            break
    ss.close()
    hdr, body = data.split(b"\r\n\r\n", 1)
    status = hdr.split(b"\r\n")[0].decode(errors="replace")
    if b"transfer-encoding: chunked" in hdr.lower():
        out = b""
        while True:
            i = body.find(b"\r\n")
            if i < 0:
                break
            try:
                n = int(body[:i].split(b";")[0], 16)
            except ValueError:
                break
            if n == 0:
                break
            out += body[i + 2:i + 2 + n]
            body = body[i + 2 + n + 2:]
        body = out
    return status, body


def text_of(html):
    html = re.sub(rb"<script.*?</script>|<style.*?</style>", b"", html, flags=re.S | re.I)
    t = re.sub(rb"<[^>]+>", b" ", html)
    t = re.sub(rb"\s+", b" ", t)
    return t.decode(errors="replace")


if __name__ == "__main__":
    ip, host, path = sys.argv[1], sys.argv[2], sys.argv[3]
    st, body = get(ip, host, path)
    print("STATUS:", st, "LEN:", len(body))
    print(text_of(body)[:4000])
