import socket
doms=["multico.com.my","www.multico.com.my","gold-elephant.net","gelephant.com",
"hunterfasteners.com","hunterfasteners.com.sg","jaguarrivet.com","jaguar-rivet.com",
"ewd.com.sg","ewdsanding.com","sandpaper.com.my","hermanns.de"]
for d in doms:
    try:
        ip=socket.getaddrinfo(d,443)[0][4][0]; print(d,"=>",ip)
    except Exception as e:
        print(d,"=> FAIL")
