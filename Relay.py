import socket
import threading
import time

server_ip = ""
server_port = 1


class Relay:
    @staticmethod
    def set_server(server, port):
        Relay.server_ip = server
        Relay.server_port = port

    @staticmethod
    def setup(username, handle_message):
        sd = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sd.sendto(("REGISTER " + username).encode(),
                  (Relay.server_ip, Relay.server_port))

        def receive():
            while True:
                data, _ = sd.recvfrom(2048)
                if data:
                    handle_message(data.decode())

        def send_keepalive():
            while True:
                time.sleep(5)
                sd.sendto(("KEEPALIVE " + username).encode(),
                          (Relay.server_ip, Relay.server_port))

        receive_thread = threading.Thread(target=receive)
        receive_thread.start()

        keepalive_thread = threading.Thread(target=send_keepalive)
        keepalive_thread.start()

    @staticmethod
    def send(username, content):
        sd = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sd.sendto(("SEND " + username + " " + content).encode(),
                  (Relay.server_ip, Relay.server_port))
