package main

import (
	"encoding/binary"
	"strings"
	"bytes"
	"fmt"
	"net"
	"time"
	"sync"
)

const MAX_CONNECTIONS_PER_IP = 20
const MAX_BYTES_PER_SECOND = 1000000000

const TCP_READ_CHUNK_SIZE_IN_BYTES = 1024
const PACKET_BUFFER_SIZE_IN_BYTES = 101000

type Client struct{
	Username string
	Connection net.Conn
	Address string
}

type ThroughputMetrics struct{
	throughput map[string]uint32 
	mu sync.Mutex
}

func (t *ThroughputMetrics) Increment(ip string, amount uint32){
	t.mu.Lock()
	t.throughput[ip] = t.throughput[ip] + amount
	defer t.mu.Unlock()
}

func (t *ThroughputMetrics) Set(ip string, amount uint32){
	t.mu.Lock()
	t.throughput[ip] = amount
	defer t.mu.Unlock()
}

func (t *ThroughputMetrics) All() map[string]uint32{
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.throughput
}

func (t *ThroughputMetrics) Get(ip string) uint32{
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.throughput[ip]
}

var clients []Client
var count int = 0
var activeConnections map[string]uint = make(map[string]uint)
var speed map[string]uint32 = make(map[string]uint32)

func main() {
	throughputMetrics := ThroughputMetrics{
		throughput: make(map[string]uint32),
	}

	go metrics(throughputMetrics)


	// Listen for incoming connections
	listener, err := net.Listen("tcp", "0.0.0.0:5000")
	if err != nil {
		fmt.Println("2 Error:", err)
		return
	}
	defer listener.Close()

	fmt.Println("Server is listening on port 8080")

	for {
		// Accept incoming connections
		conn, err := listener.Accept()
		if err != nil {
			fmt.Println("1 Error:", err)
			continue
		}

		ip := strings.Split(conn.RemoteAddr().String(), ":")[0]
		amount, exists := activeConnections[ip]

		if exists{
			if amount >= MAX_CONNECTIONS_PER_IP{
				conn.Close()
				continue
			}else{
				activeConnections[ip] = amount + 1
			}
		}else{
			activeConnections[ip] = 1
			throughputMetrics.Set(ip, 0)
			speed[ip] = 0
		}

		// Handle client connection in a goroutine
		go handleClient(conn, ip, throughputMetrics)
	}
}

func metrics(throughputMetrics ThroughputMetrics){
	for{
		time.Sleep(time.Second * 1)
		fmt.Println("------------------------------------")
		fmt.Println("Connections:", count)

		// for ip, value := range throughputMetrics.All(){
		// 	speed[ip] = (speed[ip] + value) / 2
		// 	throughputMetrics.Set(ip, 0)
		// }

		// for ip, value := range speed{
		// 	active := activeConnections[ip]
		// 	fmt.Println(ip, active, value)
		// }
	}
}

func handleClient(conn net.Conn, ip string, throughputMetrics ThroughputMetrics) {
	defer conn.Close()
	defer func (){
		count--
		activeConnections[ip] = activeConnections[ip] - 1
	}()
	// count++
	completeBuffer := make([]byte, PACKET_BUFFER_SIZE_IN_BYTES + TCP_READ_CHUNK_SIZE_IN_BYTES)
	var bufferLength int = 0
	var readingSize uint32 = 0
	var username string  = ""
	tempRead := make([]byte, TCP_READ_CHUNK_SIZE_IN_BYTES)

	defer func(){
		if username != ""{
			for i, client := range clients{
				if client.Address == conn.RemoteAddr().String() {
					clients = append(clients[:i], clients[i+1:]...)
					break
				}
			}
		}
	}()

	for{
		// Create a buffer to read data into
		// for (throughputMetrics.Get(ip) > MAX_BYTES_PER_SECOND) || speed[ip] > MAX_BYTES_PER_SECOND {
		// 	time.Sleep(time.Second * 1)
		// 	fmt.Println("Throttling", ip)
		// }
		readAmount, err := conn.Read(tempRead)
		throughputMetrics.Increment(ip, uint32(readAmount))
		if err != nil{
			fmt.Println("3 Error reading:", err)
			return
		}
		if readAmount == 0{
			return
		}
		// print("Buffer length:", bufferLength)
		// print("Read amount:", readAmount)
		copy(completeBuffer[bufferLength:], tempRead[0:readAmount])
		bufferLength += readAmount

		if username == ""{
			if(bufferLength < 500){
				continue
			}
			username = strings.TrimSpace(string(completeBuffer[:500]))
			// fmt.Println("Username: ", username)
			copy(completeBuffer[0:], completeBuffer[500:])
			bufferLength -= 500

			if len(username) < 1{
				fmt.Println("Username not informed")
				return
			}

			client := Client{
				Username: username,
				Connection: conn,
				Address: conn.RemoteAddr().String(),
			}
			// TODO: Make thread safe
			clients = append(clients, client)
		}

		fmt.Println(bufferLength, readingSize, uint32(bufferLength))
		fmt.Println(completeBuffer[:10])

		isExpectingMagicNumber := bufferLength >= 4 && readingSize == 0
		if isExpectingMagicNumber{
			for bufferLength >= 4{
				magic := completeBuffer[0:4]
				if bytes.Equal(magic, []byte{0x00, 0x00, 0x00, 0x00}) {
					copy(completeBuffer[0:], completeBuffer[4:])
					bufferLength -= 4
					// fmt.Println("Keepalive received")
				}
				if bytes.Equal(magic, []byte{0x00, 0x00, 0x00, 0x01}) {
					if bufferLength < 8{
						break
					}
					size := binary.BigEndian.Uint32(completeBuffer[4:8])
					readingSize = size
					copy(completeBuffer[0:], completeBuffer[8:])
					bufferLength -= 8
					break
				}
				if bufferLength >= 4{
					copy(completeBuffer[0:], completeBuffer[1:])
					bufferLength -= 1
				}
			}
		}else{
			if uint32(bufferLength) >= readingSize{
				recipientUsername := strings.TrimSpace(string(completeBuffer[:400]))
				// timestampA :=  binary.BigEndian.Uint64(completeBuffer[492:500])
				// if timestampA != 0{
				// 	now := uint64(time.Now().UnixMicro())
				// 	fmt.Println(now - timestampA, "us")
				// }
				to_send := []byte{0x00, 0x00, 0x00, 0x01}
				var to_send_size = make([]byte, 4)
				binary.BigEndian.PutUint32(to_send_size, uint32(readingSize))
				to_send = append(to_send, to_send_size...)
				to_send = append(to_send, completeBuffer[:readingSize]...)

				for _, client := range clients{
					if client.Username == recipientUsername {
						_, err := client.Connection.Write(to_send)
						if err != nil{
							fmt.Println("4 Error forwarding packet:", err)
							client.Connection.Close()
							fmt.Println("Forcing close client connection")
						}
					}
				}
				copy(completeBuffer[0:], completeBuffer[readingSize:])
				bufferLength -= int(readingSize)
				readingSize = 0
			}
		}
	}
}
