import socket
import threading
import time

SOURCE_PORT = 50000
DESTINATION_IP = "100.100.100.100"
DESTINATION_PORT = 50001

sd = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sd.bind(("0.0.0.0", SOURCE_PORT))
sd.sendto(("HELLO").encode(),
            (DESTINATION_IP, DESTINATION_PORT))

def receive():
    while True:
        data, _ = sd.recvfrom(2048)
        if data:
            print(data.decode())

def send_keepalive():
    while True:
        time.sleep(5)
        sd.sendto(("HELLO").encode(),
                    (DESTINATION_IP, DESTINATION_PORT))

receive_thread = threading.Thread(target=receive)
receive_thread.start()

keepalive_thread = threading.Thread(target=send_keepalive)
keepalive_thread.start()

