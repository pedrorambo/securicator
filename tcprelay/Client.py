from queue import PriorityQueue
import socket
import time
from RateLimiter import RateLimiter

MAX_SEGMENT_SIZE_IN_BYTES = 500000
MAX_SEND_QUEUE_LENGTH = 20

def current_time_in_milliseconds():
    return round(time.time() * 1000)

class Client:
    def __init__(self, username, connection, ip):
        self.ip = ip
        self.username = username
        self.connection = connection
        self.last_keepalive = current_time_in_milliseconds()
        self.send_queue = PriorityQueue(MAX_SEND_QUEUE_LENGTH)
        self.end = False
        RateLimiter.new_socket(ip)
        RateLimiter.ensure_ip(ip)
        
    @staticmethod
    def get_by_username(username):
        clients = []
        for client in Client.clients:
            if client.username == username:
                clients.append(client)
        return clients
    
    def send(self, data):
        try:
            if not self.send_queue.full():
                self.send_queue.put((len(data), data))
        except Exception as e:
            print("3: ", str(e))
            
    def sender(self):
        try:
            while not self.end:
                _, data = self.send_queue.get()
                if data == None:
                    break
                self.connection.sendall(data)
        except:
            print("Failed to send to client")
            self.close()
            pass
        
    def keep_socket(self):
        while not self.end:
            if current_time_in_milliseconds() - self.last_keepalive >= 15000:
                self.close()
            time.sleep(5)
                
    def listen(self):
        print("New client:", self.username)
            
        length = None
        total = b''
        inner_content = b''
        buffer = b''

        try:
            while not self.end:
                try:
                    while RateLimiter.is_exceeding(self.ip):
                        print("Throttling connection")
                        time.sleep(1)
                    content = self.connection.recv(1024)
                    RateLimiter.increment_throughput(self.ip, len(content))
                    buffer += content
                    
                    # MAGIC NUMBER - 4 bytes
                    # LENGTH       - 4 bytes
                    # CONTENT 

                    if len(content) == 0:
                        self.close()
                        break

                    
                    is_expecting_a_new_packet = length == None
                    if is_expecting_a_new_packet:
                        if len(buffer) < 4:
                            print("Not enough data in packet")
                            continue
                        should_continue = False
                        while len(buffer) >= 8:
                            magic = buffer[0:4]
                            if magic == b'\x00\x00\x00\x00':
                                buffer = buffer[4:]
                                self.last_keepalive = current_time_in_milliseconds()
                                self.connection.sendall(b'\x00\x00\x00\x00')
                                continue
                            if magic != b'\x00\x00\x00\x01':
                                buffer = buffer[4:]
                                print("Incorrect magic number")
                                continue
                            else:
                                should_continue = True
                                break
                        if not should_continue:
                            continue
                        length = int.from_bytes(buffer[4:8], byteorder="big")
                        if length == 0:
                            buffer = buffer[8:]
                            continue
                        if length > MAX_SEGMENT_SIZE_IN_BYTES:
                            print("Received segment too large")
                            buffer = buffer[4:]
                            continue
                        total = buffer[0:8]
                        buffer = buffer[8:]
                        
                    if len(buffer) < length:
                        continue
                    else:
                        inner_content = buffer[0:length]
                        total = total + inner_content
                        buffer = buffer[length:]
                        
                    if length != None and len(inner_content) >= length:
                        username = inner_content[0:500]
                        #print("Message to " + username.decode("utf-8").strip() + " of size " + str(len(total)))
                        clients = Client.get_by_username(username.decode("utf-8").strip())
                        for destination_client in clients:
                            destination_client.send(total)
                        length = None
                        total = b''
                        inner_content = b''
                except socket.timeout:
                    pass
                except Exception as e:
                    if not ("Broken pipe" in str(e)):
                        print("5: ", str(e))
                    self.close()
                    break
        finally:
            self.close()
            print("Listener for " + self.username + " ended")
        
    def close(self):
        RateLimiter.socket_closed(self.ip)
        self.send_queue.put((0, None))
        for c in Client.clients:
            if c == self:
                Client.clients.remove(c)
        self.end = True
        self.connection.close()
        
Client.clients = []