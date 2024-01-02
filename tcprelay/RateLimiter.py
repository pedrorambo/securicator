import threading
import time

MAX_SOCKETS_PER_IP = 10
MAX_SPEED_IN_BYTES_PER_SECOND = 1000000

def format_bytes(size):
    # 2**10 = 1024
    power = 2**10
    n = 0
    power_labels = {0 : '', 1: 'K', 2: 'M', 3: 'G', 4: 'T'}
    while size > power:
        size /= power
        n += 1
    return int(size), power_labels[n]+'B'

class RateLimiter:
    @staticmethod
    def new_socket(ip):
        amount = RateLimiter.connections.get(ip)
        if amount != None and amount >= MAX_SOCKETS_PER_IP:
            raise Exception("Max sockets per IP exceeded")
        if amount == None:
            RateLimiter.connections[ip] = 1
        else:
            RateLimiter.connections[ip] = amount + 1
            
    def can_connect(ip):
        amount = RateLimiter.connections.get(ip)
        return amount == None or amount < MAX_SOCKETS_PER_IP
    
    def socket_closed(ip):
        amount = RateLimiter.connections.get(ip)
        if amount != None:
            RateLimiter.connections[ip] = RateLimiter.connections[ip] - 1

    def ensure_ip(ip):
        found_throughput = RateLimiter.throughput.get(ip)
        if not found_throughput:
            RateLimiter.throughput[ip] = 0
        found_speed = RateLimiter.speed.get(ip)
        if not found_speed:
            RateLimiter.speed[ip] = 0
            
    def increment_throughput(ip, throughput):
        RateLimiter.throughput[ip] = RateLimiter.throughput[ip] + throughput
        
    def is_exceeding(ip):
        return (RateLimiter.speed.get(ip) != None and RateLimiter.speed.get(ip) >= MAX_SPEED_IN_BYTES_PER_SECOND) or RateLimiter.throughput[ip] >= MAX_SPEED_IN_BYTES_PER_SECOND
            
    def calculate_speed():
        while True:
            time.sleep(1)
            for key, value in RateLimiter.throughput.items():
                previous_speed = RateLimiter.speed.get(key)
                if previous_speed != None:
                    RateLimiter.speed[key] = (value + previous_speed) / 2
                else:
                    RateLimiter.speed[key] = value
                RateLimiter.throughput[key] = 0
    
    def print_statistics():
        for key, value in RateLimiter.speed.items():
            v, unit = format_bytes(value)
            active_connections = RateLimiter.connections.get(key)
            print(key + ": " + str(v) + "" +  unit + "/s" + " - " + str(active_connections))
        
RateLimiter.connections = {}
RateLimiter.throughput = {}
RateLimiter.speed = {}
speed_thread = threading.Thread(target=RateLimiter.calculate_speed)
speed_thread.start()

