import socket
import threading
import time
from Registration import Registration

BUFFER_SIZE = 2048
DEFAULT_PORT = 5000


def udpServer():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(('0.0.0.0', DEFAULT_PORT))
    print("Server listening on UDP port " + str(DEFAULT_PORT))

    while True:
        data, client = s.recvfrom(BUFFER_SIZE)
        if data:
            message = data.decode()
            if (message.startswith("KEEPALIVE")):
                message = message.replace("\n", "")
                username = message.split(" ")[1]
                Registration.update_last_response(
                    username, client[0], client[1])
                print("[KEEPALIVE] " + username)
            if (message.startswith("REGISTER")):
                message = message.replace("\n", "")
                username = message.split(" ")[1]
                Registration.add(username, client[0], client[1], s)
                print("[REGISTER] " + username)
            if (message.startswith("SEND")):
                message = message.replace("\n", "")
                username = message.split(" ")[1]
                content = " ".join(message.split(" ")[2:])
                Registration.send_message(username, content)
                print("[SEND] " + username)


def send_keepalives():
    while True:
        time.sleep(5)
        Registration.send_keepalives()


t = threading.Thread(target=send_keepalives)
t.start()
udpServer()
