import socket
import threading
import time
from Client import Client
from RateLimiter import RateLimiter

MAX_SEGMENT_SIZE_IN_BYTES = 500000

def current_time_in_milliseconds():
    return round(time.time() * 1000)

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("0.0.0.0", 5000))
s.listen()

def metrics():
    while True:
        time.sleep(5)
        print("Threads: ", threading.active_count())
        print("Clients: ", len(Client.clients))
        RateLimiter.print_statistics()
            
        
thread = threading.Thread(target=metrics)
thread.start()

while True:
    try:
        (connection, addr) = s.accept()
        connection.settimeout(5)
        ip, _ = addr
        can_connect = RateLimiter.can_connect(ip)
        if not can_connect:
            print("Max sockets per IP exceeded")
            connection.close()
            continue
        
        received = connection.recv(500)
        username = received.decode("utf-8").strip()
        
        client = Client(username, connection, ip)
        
        thread = threading.Thread(target=client.listen)
        thread.start()
        
        queue_sender_thread = threading.Thread(target=client.sender)
        queue_sender_thread.start()

        keep_socket_thread = threading.Thread(target=client.keep_socket)
        keep_socket_thread.start()
        
        Client.clients.append(client)
    except Exception as e:
        print("2", str(e))
        pass