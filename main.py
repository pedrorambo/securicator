import socket
import threading

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
            print(message)
  s.close()

def send_message(message, port):
   client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
   client_socket.sendto(("MESG " + message).encode(), ("127.0.0.1" ,port))

thread = threading.Thread(target=udpServer)
thread.start()
print ("running...")

while True:
    raw_content = input()
    destination_id = raw_content.split(" ")[0]
    message = raw_content
    send_message(message, int(destination_id))