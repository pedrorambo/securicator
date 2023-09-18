import random
import socket
import time
from Friend import Friend
import threading

RENDEZVOUS_SERVER_IP = "100.26.52.25"
RENDEZVOUS_SERVER_PORT = 4900

EXPIRE_TUNNEL_IN_MILLISECONDS = 30000


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


def register_on_rendezvous_server(my_username):
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.sendto(("REGISTER " + my_username).encode(),
                         (RENDEZVOUS_SERVER_IP, RENDEZVOUS_SERVER_PORT))
    client_socket.close()


def send_connection_request_to_rendezvous_server(my_username, its_username):
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.sendto(("REQUEST " + my_username + " " + its_username).encode(),
                         (RENDEZVOUS_SERVER_IP, RENDEZVOUS_SERVER_PORT))
    data = client_socket.recvfrom(1024)
    client_socket.close()
    message = data[0].decode()
    source_port = message.split(" ")[0]
    destination_port = message.split(" ")[1]
    return (source_port, destination_port)


def send_connection_request_to_rendezvous_server_with_ports(my_username, its_username, source_port, destination_port):
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.sendto(("REQUEST " + my_username + " " + its_username + " " + source_port + " " + destination_port).encode(),
                         (RENDEZVOUS_SERVER_IP, RENDEZVOUS_SERVER_PORT))
    client_socket.close()


def get_connection_requests_from_rendezvous_server(my_username):
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.sendto(("MY_REQUESTS " + my_username).encode(),
                         (RENDEZVOUS_SERVER_IP, RENDEZVOUS_SERVER_PORT))
    data = client_socket.recvfrom(2048)
    client_socket.close()
    message = data[0].decode()
    requests = []
    lines = message.split("\n")
    for line in lines:
        if line != "":
            requests.append(line)
    return requests


class Tunnel:
    def __init__(self):
        pass

    @ staticmethod
    def get_tunnel_for_username(username):
        for tunnel in Tunnel.tunnels:
            if tunnel.username == username:
                return tunnel
        return None

    def get_tunnels_for_username(username):
        to_return = []
        for tunnel in Tunnel.tunnels:
            if tunnel.username == username:
                to_return.append(tunnel)
        return to_return

    @ staticmethod
    def force_tunnel(my_username, its_username):
        send_connection_request_to_rendezvous_server(
            my_username, its_username)

    @ staticmethod
    def create_new_tunnels(my_username):
        for friend in Friend.friends:
            existing_tunnel = Tunnel.get_tunnel_for_username(friend.username)
            if existing_tunnel == None:
                send_connection_request_to_rendezvous_server(
                    my_username, friend.username)

    @ staticmethod
    def receive_tunnel_requests(my_username):
        requests = get_connection_requests_from_rendezvous_server(my_username)

        for request in requests:
            from_username = request.split(" ")[0]
            ip = request.split(" ")[1]
            destination_port = request.split(" ")[2]
            source_port = request.split(" ")[3]

            tunnel_exists = False
            for tunnel in Tunnel.tunnels:
                if tunnel.username == from_username and tunnel.source_port == source_port and tunnel.destination_port == destination_port:
                    tunnel_exists = True
                    break

            if tunnel_exists:
                continue

            tunnel = Tunnel()
            tunnel.last_received_keepalive = None
            tunnel.last_sent_keepalive = None
            tunnel.created_at = current_time_in_milliseconds()
            tunnel.username = from_username
            tunnel.source_port = source_port
            tunnel.destination_port = destination_port
            tunnel.ip = ip

            client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            # client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            print("Listen on 0.0.0.0 " + str(int(source_port)))
            client_socket.bind(("0.0.0.0", int(source_port)))

            print("Listening on " + source_port)

            def receiver():
                while (True):
                    time.sleep(2)
                    (data, addr) = client_socket.recvfrom(2048)
                    print(addr)
                    print("RECEIVED DATA!!!!")
                    message = data.decode()
                    print(message)

            def send_keepalive():
                while True:
                    time.sleep(1)
                    print("Sending ping to " + ip + ":" + destination_port)
                    client_socket.sendto("PING".encode(),
                                         (ip, int(destination_port)))
                    print("Keepalive sent to port ", destination_port)

            t = threading.Thread(
                target=send_keepalive)
            t.start()

            r = threading.Thread(
                target=receiver)
            r.start()

            # def tunnel_receiver():
            #     s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            #     s.bind(("0.0.0.0", int(tunnel.source_port)))
            #     s.sendto(("PING").encode(),
            #              (tunnel.ip, int(tunnel.destination_port)))

            #     while True:
            #         data = s.recvfrom(2048)
            #         if data:
            #             message = data[0].decode()
            #             tunnel.last_received_keepalive = current_time_in_milliseconds()
            #             if message == "PING":
            #                 print("Received ping")
            #             else:
            #                 from Receiver import Receiver
            #                 Receiver.parse_received_packet(message)

            # tunnel.receive_thread = threading.Thread(
            #     target=tunnel_receiver)
            # tunnel.receive_thread.start()

            send_connection_request_to_rendezvous_server_with_ports(
                my_username, from_username, tunnel.source_port, tunnel.destination_port)

            Tunnel.tunnels.append(tunnel)

    @ staticmethod
    def expire_tunnels():
        for tunnel in Tunnel.tunnels:
            if tunnel.last_received_keepalive != None:
                if int(current_time_in_milliseconds()) - int(tunnel.last_received_keepalive) > EXPIRE_TUNNEL_IN_MILLISECONDS:
                    Tunnel.tunnels.remove(tunnel)
            else:
                if int(current_time_in_milliseconds()) - int(tunnel.created_at) > EXPIRE_TUNNEL_IN_MILLISECONDS:
                    Tunnel.tunnels.remove(tunnel)

    @ staticmethod
    def maintain_tunnels(my_username):
        register_on_rendezvous_server(my_username)
        Tunnel.receive_tunnel_requests(my_username)
        Tunnel.create_new_tunnels(my_username)
        Tunnel.expire_tunnels()

    @ staticmethod
    def send_tunnel_keepalives():
        for tunnel in Tunnel.tunnels:
            if tunnel.ip != None:
                # send_keepalive(tunnel.ip, tunnel.source_port,
                #                tunnel.destination_port)
                pass

    @ staticmethod
    def send_to_username(username, content):
        tunnels = Tunnel.get_tunnels_for_username(username)
        for tunnel in tunnels:
            if tunnel.ip:
                client_socket = socket.socket(
                    socket.AF_INET, socket.SOCK_DGRAM)
                client_socket.sendto(content.encode(),
                                     (tunnel.ip, int(tunnel.destination_port)))
                client_socket.close()


Tunnel.tunnels = []
