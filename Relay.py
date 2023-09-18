import socket
import threading
import time

RELAY_SERVER_IP = "127.0.0.1"
RELAY_SERVER_PORT = 5000


class Relay:
    @staticmethod
    def setup(username, handle_message):
        sd = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sd.sendto(("REGISTER " + username).encode(),
                  (RELAY_SERVER_IP, RELAY_SERVER_PORT))

        def receive():
            while True:
                data, _ = sd.recvfrom(2048)
                if data:
                    handle_message(data.decode())

        def send_keepalive():
            while True:
                time.sleep(5)
                sd.sendto(("KEEPALIVE " + username).encode(),
                          (RELAY_SERVER_IP, RELAY_SERVER_PORT))

        receive_thread = threading.Thread(target=receive)
        receive_thread.start()

        keepalive_thread = threading.Thread(target=send_keepalive)
        keepalive_thread.start()

    @staticmethod
    def send(username, content):
        sd = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sd.sendto(("SEND " + username + " " + content).encode(),
                  (RELAY_SERVER_IP, RELAY_SERVER_PORT))
