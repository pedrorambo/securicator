import socket
import threading
import time
from Client import Client

def format_bytes(size):
    # 2**10 = 1024
    power = 2**10
    n = 0
    power_labels = {0 : '', 1: 'K', 2: 'M', 3: 'G', 4: 'T'}
    while size > power:
        size /= power
        n += 1
    return int(size), power_labels[n]+'B'

MAX_SPEED_IN_BYTES_PER_SECOND = 1000000
MAX_SOCKETS_PER_IP = 10
MAX_SEGMENT_SIZE_IN_BYTES = 500000

connection_count = {}
throughput = {}
speed = {}

def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("0.0.0.0", 5000))
s.listen()

def listen(connection, addr):
    ip, port = addr
    if connection_count.get(ip) == None:
        connection_count[ip] = 1
        throughput[ip] = 0
    else:
        connection_count[ip] = connection_count[ip] + 1
    try:
        received = connection.recv(500)
        username = received.decode("utf-8")
        client = Client(username.strip(), connection)
        Client.clients.append(client)
        print("New client: ", client.username)

        length = None
        total = b''
        inner_content = b''
        buffer = b''
        while True:
            while (speed.get(ip) != None and speed.get(ip) >= MAX_SPEED_IN_BYTES_PER_SECOND) or throughput[ip] >= MAX_SPEED_IN_BYTES_PER_SECOND:
                print("Throttling connection")
                time.sleep(1)
            content = connection.recv(1024)
            throughput[ip] = throughput[ip] + len(content)
            buffer += content
            
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
                    client.last_keepalive = current_time_in_milliseconds()
                    connection.sendall(b'\x00\x00\x00\x00')
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
                username = inner_content[0:500]
                #print("Message to " + username.decode("utf-8").strip() + " of size " + str(len(total)))
                clients = Client.get_by_username(username.decode("utf-8").strip())
                for destination_client in clients:
                    try:
                        destination_client.connection.sendall(total)
                    except:
                        print("Failed to send to client")
                        destination_client.connection.close()
                        Client.clients.remove(destination_client)
                        pass
                # TODO: Should not send synchronously
                length = None
                total = b''
                inner_content = b''
    finally:
        try:
            client.connection.close()
        except Exception as e:
            print(str(e))
            pass
        try:
            Client.clients.remove(client)
        except Exception as e:
            print(str(e))
            pass
        connection_count[ip] = connection_count[ip] - 1
        
def metrics():
    while True:
        time.sleep(1)
        print("Threads: ", threading.active_count())
        print("Clients: ", len(Client.clients))
        for key, value in speed.items():
            v, unit = format_bytes(value)
            print(key + ": " + str(v) + "" +  unit + "/s")
            
        
thread = threading.Thread(target=metrics)
thread.start()

def calculate_speed():
    while True:
        time.sleep(1)
        
        for key, value in throughput.items():
            previous_speed = speed.get(key)
            if previous_speed != None:
                speed[key] = (value + previous_speed) / 2
            else:
                speed[key] = value
            throughput[key] = 0

speed_thread = threading.Thread(target=calculate_speed)
speed_thread.start()

while True:
    try:
        (connection, addr) = s.accept()
        ip, port = addr
        amount = connection_count.get(ip)
        if amount != None and amount >= MAX_SOCKETS_PER_IP:
            print("Connection rejected")
            connection.close()
            continue
            
        print("Received connection")
        thread = threading.Thread(target=listen, args=(connection,addr))
        thread.start()
    except Exception as e:
        print(str(e))
        pass