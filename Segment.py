import logging
from queue import PriorityQueue
import socket
import threading
import time


def current_time_in_milliseconds():
    return round(time.time() * 1000)

def current_timestamp_bytes():
    return round(time.time() * 1000000).to_bytes(8, byteorder="big")

CONNECTION_EXPIRE_TIMEOUT_IN_MILLISECONDS = 15000
MAX_SEGMENT_SIZE_IN_BYTES = 500000

class Segment:
    def __init__(self, username, callback, server_ip, server_port):
        self.server_ip = server_ip
        self.server_port = server_port
        self.username = username
        self.s = None
        self.connected = False
        self.last_received = None
        self.connection_keeping_thread = threading.Thread(target=self.keep_connection)
        self.connection_keeping_thread.start()
        self.receive_thread = threading.Thread(target=self.receive)
        self.receive_thread.start()
        self.callback = callback
        self.keepalive_thread = threading.Thread(target=self.keepalive)
        self.keepalive_thread.start()
        self.queue = PriorityQueue()
        self.sender_thread = threading.Thread(target=self.sender)
        self.sender_thread.start()
        
        logging.info("Relay server connected")
        
    def keepalive(self):
        while True:
            try:
                while self.connected == False:
                    print("Sleeping not connected")
                    time.sleep(1)
                if self.connected:
                    self.s.sendall(b'\x00\x00\x00\x00')
            except:
                print("Keepalive failed, setting not connected")
                self.connected = False
                print("Error in send keepalive")
                pass
            time.sleep(5)
        
    def connect(self):
        print("Connecting...")
        self.s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.s.settimeout(5)
        self.s.connect((self.server_ip, self.server_port))
        # self.s.settimeout(None)
        self.connected = True
        null_padded = self.username.encode('utf-8') +  (b' ' * (500 - len(self.username.encode("utf-8"))))
        self.s.sendall(null_padded)
        self.last_received = None
        print("Connected")

    def keep_connection(self):
        while True:
            expired = self.last_received != None and current_time_in_milliseconds() - self.last_received >= CONNECTION_EXPIRE_TIMEOUT_IN_MILLISECONDS
            if (not self.connected) or expired:
                try:
                    if self.s != None:
                        self.close()
                    self.connect()
                except Exception as e:
                    print("Segmen keep connection exception:", str(e))
                    pass
            time.sleep(1)
        
    def sender(self):
            while True:
                try:
                    while not self.connected:
                        print("Not connected")
                        time.sleep(1)
                    priority, username, content = self.queue.get()
                    magic = b'\x00\x00\x00\x01'
                    if len(content) > MAX_SEGMENT_SIZE_IN_BYTES:
                        raise Exception("Segment too large")
                    null_padded = username.encode("utf-8") +  (b' ' * (492 - len(username.encode("utf-8"))))
                    inner_content = null_padded + current_timestamp_bytes() + content
                    length = len(inner_content) + 1
                    b  = magic + length.to_bytes(4, byteorder="big") + inner_content + b'\xFF'
                    self.s.sendall(b)
                except Exception as e:
                    self.connected = False
                    print("Error in send packet", str(e))
                    pass
        
    def send(self, username, content):
        priority = 1
        if len(content) > 5000:
            priority = 3
        self.queue.put((priority, username, content))
        
    def get_last_received(self):
        if self.last_received == None:
            return 1
        else:
            return self.last_received
        
    def receive(self):
            length = None
            total = b''
            inner_content = b''
            buffer = b''
            while True:
                try:
                    while not self.connected:
                        print("Waiting for connected socket to listen")
                        time.sleep(1)
                    content = self.s.recv(1024)
                    buffer += content
                    self.last_received = current_time_in_milliseconds()
                    
                    # MAGIC NUMBER - 4 bytes
                    # LENGTH       - 4 bytes
                    # CONTENT 
                    
                    if len(content) == 0:
                        self.connected = False
                        continue
                    
                    is_expecting_a_new_packet = length == None
                    if is_expecting_a_new_packet:
                        if len(buffer) < 4:
                            print("Not enough data in packet")
                            continue
                        should_continue = False
                        while len(buffer) >= 4:
                            magic = buffer[0:4]
                            if magic == b'\x00\x00\x00\x00':
                                buffer = buffer[4:]
                                #print("Received keepalive")
                                continue
                            if magic != b'\x00\x00\x00\x01':
                                buffer = buffer[4:]
                                # print("Incorrect magic number")
                                continue
                            else:
                                should_continue = True
                                break
                        if not should_continue:
                            continue
                        length = int.from_bytes(buffer[4:8], byteorder="big")
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
                        inner_content_with_magic_end = inner_content[500:]
                        last_byte = inner_content_with_magic_end[-1:]
                        if last_byte == b'\xFF':
                            inner_content_without_magic_end = inner_content_with_magic_end[:-1]
                            self.callback(inner_content_without_magic_end)
                        else:
                            print("Corrupted packet received")
                        length = None
                        total = b''
                        inner_content = b''
                except socket.timeout:
                    pass
                except Exception as e:
                    if "reset by peer" in str(e):
                        pass
                    else:
                        raise e
                    # print("Error: ", str(e))
                    # pass
                
    def close(self):
        print("Closing socket")
        try:
            self.s.close()
            self.connected = False
        except Exception as e:
            print("Close socket exception: ", str(e))
            pass