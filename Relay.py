import socket
import threading
import time

def current_time_in_milliseconds():
    return str(round(time.time() * 1000))

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
                Relay.connected = True
                Relay.last_received = current_time_in_milliseconds()
                if data:
                    handle_message(data.decode())

        def send_keepalive():
            while True:
                time.sleep(5)
                if Relay.last_received is not None and int(current_time_in_milliseconds()) - int(Relay.last_received) > 15000:
                    print("Realy server timed out, registering again...")
                    Relay.connected = False
                    sd.sendto(("REGISTER " + username).encode(),
                        (Relay.server_ip, Relay.server_port))
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

Relay.last_received = None
Relay.connected = False