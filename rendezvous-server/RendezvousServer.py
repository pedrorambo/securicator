import socket
import threading
import time

from Registration import Registration
from PairRequest import PairRequest

BUFFER_SIZE = 1024
DEFAULT_PORT = 4900


def udpServer():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(('0.0.0.0', DEFAULT_PORT))

    while True:
        data, client = s.recvfrom(BUFFER_SIZE)
        if data:
            message = data.decode()
            if (message.startswith("REGISTER")):
                message = message.replace("\n", "")
                username = message.split(" ")[1]
                Registration.add(username, client[0], client[1])
                print("[REGIS] " + username + " " +
                      client[0] + " " + str(client[1]))
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
                registration = Registration.get_ip_from_username(to_username)
                if registration != None:
                    s.sendto((str(registration.ip) + " " + str(request.from_port) + " " +
                              str(request.to_port)).encode(), client)
                    print("[REQUE] " + from_username + " " + to_username)
            if (message.startswith("MY_REQUESTS")):
                username = message.split(" ")[1]
                requests = PairRequest.get_requests_to_username(username)
                out = ""
                for request in requests:
                    out += request.from_username + " " + request.from_ip + " " + str(request.from_port) + " " + str(
                        request.to_port) + "\n"
                s.sendto(out.encode(), client)
                print("[MYREQ] " + username + " " +
                      str(len(requests)) + " requests")


def expire_pair_requests():
    while True:
        time.sleep(30)
        PairRequest.expire_pair_requests()


def expire_registration():
    while True:
        time.sleep(30)
        Registration.expire()


udp_server_thread = threading.Thread(target=udpServer)
udp_server_thread.start()

expire_thread = threading.Thread(target=expire_pair_requests)
expire_thread.start()

expire_registration_thread = threading.Thread(target=expire_registration)
expire_registration_thread.start()
