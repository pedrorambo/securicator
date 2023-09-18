import socket
import threading
import time
from PairRequest import PairRequest

BUFFER_SIZE = 1024
DEFAULT_PORT = 4900


def udpServer():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.bind(('', DEFAULT_PORT))
    except socket.error as e:
        s.bind(('', DEFAULT_PORT + 1))

    while True:
        data, client = s.recvfrom(BUFFER_SIZE)
        if data:
            message = data.decode()
            print(data)
            print("Message received. Raw content: " + message)
            if (message.startswith("REQUEST")):
                from_username = message.split(" ")[1]
                to_username = message.split(" ")[2]
                request = None
                if (len(message.split(" ")) > 4):
                    from_port = message.split(" ")[3]
                    to_port = message.split(" ")[4]
                    request = PairRequest.register_with_ports(
                        from_username, to_username, client[0], from_port, to_port)
                else:
                    request = PairRequest.register(
                        from_username, to_username, client[0])
                s.sendto((str(request.from_port) + " " +
                         str(request.to_port)).encode(), client)
                print("Registered pair request from " +
                      from_username + " to " + to_username)
            if (message.startswith("MY_REQUESTS")):
                username = message.split(" ")[1]
                requests = PairRequest.get_requests_to_username(username)
                print("User has " + str(len(requests)) + " pair requests")
                out = ""
                for request in requests:
                    out += request.from_username + " " + request.from_ip + " " + str(request.from_port) + " " + str(
                        request.to_port) + "\n"
                s.sendto(out.encode(), client)
                print("User requested to be registered")


def expire_pair_requests():
    while True:
        time.sleep(30)
        PairRequest.expire_pair_requests()


udp_server_thread = threading.Thread(target=udpServer)
udp_server_thread.start()

expire_thread = threading.Thread(target=expire_pair_requests)
expire_thread.start()
