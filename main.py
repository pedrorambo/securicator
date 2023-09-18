import socket
import threading
from Message import Message 

messages = []

HOST = '0.0.0.0' 
BUFFER_SIZE = 1024

print("Client ID:")
client_id = input()
port = int(client_id)

def udpServer():
  s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  s.bind((HOST, port))
  while True:
    data = s.recvfrom(BUFFER_SIZE)
    if data:
        message = data[0].decode()
        if(message.startswith("PING")):
            print("Ping received, and sent.")
            s.sendto("PONG".encode(), data[1])
        if(message.startswith("MESG")):
            content = " ".join(message.split(" ")[2:])
            message_entity = Message(message.split(" ")[1], content)
            messages.append(message_entity)
            print(content)
        if(message.startswith("SYNC")):
            print("Sync requested")
            for msg in messages:
                s.sendto(("MESG " + msg.sender_id + " " + msg.content).encode(), ("127.0.0.1", int(message.split(" ")[1])))

  s.close()

def send_message(message, port):
    message_entity = Message(client_id, message)
    messages.append(message_entity)
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.sendto(("MESG " + client_id + " " + message).encode(), ("127.0.0.1" ,port))

def send_sync(port):
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.sendto(("SYNC " + client_id).encode(), ("127.0.0.1" ,port))

thread = threading.Thread(target=udpServer)
thread.start()
print ("running...")

send_sync(12000)
send_sync(12001)


while True:
    raw_content = input()
    if raw_content:
        destination_id = raw_content.split(" ")[0]
        message = " ".join(raw_content.split(" ")[1:])
        send_message(message, int(destination_id))
    else:
        print("Stored messages:")
        for message in messages:
            print(message.sender_id + ": " + message.content)