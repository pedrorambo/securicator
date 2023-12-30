from queue import PriorityQueue, SimpleQueue
import hashlib
import socket
import threading
import time


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))

MAX_SEGMENT_SIZE_IN_BYTES = 500000

class Segment:
    def __init__(self, username, callback, server_ip, server_port):
        self.s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.s.connect((server_ip, server_port))
        null_padded = username.encode('utf-8') +  (b' ' * (500 - len(username.encode("utf-8"))))
        self.s.sendall(null_padded)
        self.last_received = 1
        
        self.receive_thread = threading.Thread(target=self.receive)
        self.receive_thread.start()
        self.callback = callback
        
        self.keepalive_thread = threading.Thread(target=self.keepalive)
        self.keepalive_thread.start()
        
        self.sending = False
        self.queue = PriorityQueue()
        
        self.sender_thread = threading.Thread(target=self.sender)
        self.sender_thread.start()
        
    def keepalive(self):
        try:
            while True:
                time.sleep(5)
                self.s.sendall(b'\x00\x00\x00\x00')
        except:
            print("Error in send keepalive")
            pass
        
    def sender(self):
        try:
            while True:
                priority, username, content = self.queue.get()
                magic = b'\x00\x00\x00\x01'
                if len(content) > MAX_SEGMENT_SIZE_IN_BYTES:
                    raise Exception("Segment too large")
                null_padded = username.encode("utf-8") +  (b' ' * (500 - len(username.encode("utf-8"))))
                inner_content = null_padded + content
                length = len(inner_content)
                b  = magic + length.to_bytes(4, byteorder="big") + inner_content
                self.s.sendall(b)
        except:
            print("Error in send packet")
            pass
        
    def send(self, username, content):
        priority = 1
        if len(content) > 5000:
            priority = 3
        self.queue.put((priority, username, content))
        
    def get_last_received(self):
        return self.last_received
        
    def receive(self):
        try:
            length = None
            total = b''
            inner_content = b''
            buffer = b''
            while True:
                content = self.s.recv(1024)
                buffer += content
                self.last_received = current_time_in_milliseconds()
                
                # MAGIC NUMBER - 4 bytes
                # LENGTH       - 4 bytes
                # CONTENT 
                
                if len(content) == 0:
                    break
                
                is_expecting_a_new_packet = length == None
                if is_expecting_a_new_packet:
                    if len(buffer) < 4:
                        print("Not enough data in packet")
                        continue
                    magic = buffer[0:4]
                    if magic == b'\x00\x00\x00\x00':
                        buffer = buffer[4:]
                        #print("Received keepalive")
                        continue
                    if magic != b'\x00\x00\x00\x01':
                        buffer = buffer[4:]
                        print("Incorrect magic number")
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
                    self.callback(inner_content[500:])
                    length = None
                    total = b''
                    inner_content = b''
        except Exception as e:
            print("Error: ", str(e))
            pass
                
    def close(self):
        print("Closing socket")
        try:
            self.s.close()
        except Exception as e:
            print(str(e))
            pass