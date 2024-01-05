package main

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"
)

const MAX_CONNECTIONS_PER_IP = 200000
const MAX_BYTES_PER_SECOND = 1000000000

const TCP_READ_CHUNK_SIZE_IN_BYTES = 1024
const MAX_PACKET_SIZE_IN_BYTES = 101000

type Client struct {
	Username   string
	Connection net.Conn
	Address    string
}

type ThroughputMetrics struct {
	throughput map[string]uint32
	mu         sync.Mutex
}

func (t *ThroughputMetrics) Increment(ip string, amount uint32) {
	t.mu.Lock()
	t.throughput[ip] = t.throughput[ip] + amount
	defer t.mu.Unlock()
}

func (t *ThroughputMetrics) Set(ip string, amount uint32) {
	t.mu.Lock()
	t.throughput[ip] = amount
	defer t.mu.Unlock()
}

func (t *ThroughputMetrics) All() map[string]uint32 {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.throughput
}

func (t *ThroughputMetrics) Get(ip string) uint32 {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.throughput[ip]
}

func ReadFullBuffer(buffer []byte, conn net.Conn) error {
	totalReadSize := 0
	requiredSize := len(buffer)
	for totalReadSize < requiredSize {
		maxSizeToRead := requiredSize - totalReadSize
		tempBuffer := make([]byte, maxSizeToRead)
		readAmount, err := conn.Read(tempBuffer)
		if err != nil {
			return err
		}
		if readAmount == 0 {
			return errors.New("read no bytes")
		}
		copy(buffer[totalReadSize:], tempBuffer[0:readAmount])
		totalReadSize += readAmount
	}
	return nil
}

func ReadUsername(conn net.Conn) (string, error) {
	usernameBuffer := make([]byte, 500)
	err := ReadFullBuffer(usernameBuffer, conn)
	if err != nil {
		return "", err
	}
	username := strings.TrimSpace(string(usernameBuffer))
	if len(username) < 1 {
		return "", errors.New("invalid username")
	}
	return username, nil
}

func ReadSize(conn net.Conn) (uint32, error) {
	sizeBuffer := make([]byte, 4)
	err := ReadFullBuffer(sizeBuffer, conn)
	if err != nil {
		return 0, err
	}
	size := binary.BigEndian.Uint32(sizeBuffer)
	return size, nil
}

func ReadMagicNumber(conn net.Conn) (string, error) {
	magicNumberBuffer := make([]byte, 4)
	err := ReadFullBuffer(magicNumberBuffer, conn)
	if err != nil {
		return "", err
	}
	for {
		if bytes.Equal(magicNumberBuffer, []byte{0x00, 0x00, 0x00, 0x00}) {
			return "keepalive", nil
		}
		if bytes.Equal(magicNumberBuffer, []byte{0x00, 0x00, 0x00, 0x01}) {
			return "content", nil
		}
		extraBuffer := make([]byte, 1)
		err := ReadFullBuffer(extraBuffer, conn)
		if err != nil {
			return "", err
		}
		copy(magicNumberBuffer, magicNumberBuffer[1:])
		copy(magicNumberBuffer[3:], extraBuffer)
	}
}

func ForwardReceivedPacket(content []byte, size uint32) {
	recipientUsername := strings.TrimSpace(string(content[:400]))
	to_send := []byte{0x00, 0x00, 0x00, 0x01}
	var to_send_size = make([]byte, 4)
	binary.BigEndian.PutUint32(to_send_size, uint32(size))
	to_send = append(to_send, to_send_size...)
	to_send = append(to_send, content...)

	for _, client := range clients {
		if client.Username == recipientUsername {
			// TODO: Use a queue
			client.Connection.SetWriteDeadline(time.Now().Add(time.Second * 1))
			_, err := client.Connection.Write(to_send)
			if err != nil {
				fmt.Println("4 Error forwarding packet:", err)
				client.Connection.Close()
				fmt.Println("Forcing close client connection")
			}
		}
	}
}

var clients []Client
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
		fmt.Println(ip)

		_, found := activeConnections[ip]
		if found {
			if activeConnections[ip] >= MAX_CONNECTIONS_PER_IP {
				conn.Close()
				continue
			} else {
				activeConnections[ip] += 1
			}
		} else {
			activeConnections[ip] = 1
			throughputMetrics.Set(ip, 0)
			speed[ip] = 0
		}

		// Handle client connection in a goroutine
		go handleClient(conn, ip, throughputMetrics)
	}
}

func metrics(throughputMetrics ThroughputMetrics) {
	for {
		time.Sleep(time.Second * 1)
		fmt.Println("------------------------------------")

		fmt.Println("Connections:")
		for ip, count := range activeConnections {
			fmt.Printf("%15.15s %5d\n", ip, count)
		}

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
	defer func() {
		activeConnections[ip] = activeConnections[ip] - 1
	}()

	conn.SetReadDeadline(time.Now().Add(time.Second * 1))
	username, err := ReadUsername(conn)
	if err != nil {
		fmt.Println("Error reading username")
		return
	}
	fmt.Println("Username:", username)
	client := Client{
		Username:   username,
		Connection: conn,
		Address:    conn.RemoteAddr().String(),
	}
	// TODO: Make thread safe
	clients = append(clients, client)

	defer func() {
		for i, client := range clients {
			if client.Address == conn.RemoteAddr().String() {
				clients = append(clients[:i], clients[i+1:]...)
				break
			}
		}
	}()

	conn.SetReadDeadline(time.Now().Add(time.Second * 60))

	for {

		magicType, err := ReadMagicNumber(conn)
		if err != nil {
			fmt.Println("Error reading magic number", err)
			return
		}
		if magicType == "keepalive" {
			continue
		}
		if magicType == "content" {
			size, err := ReadSize(conn)
			if err != nil {
				fmt.Println("Error reading magic number", err)
				return
			}
			if size <= 0 {
				fmt.Println("Invalid content size")
				return
			}
			if size > MAX_PACKET_SIZE_IN_BYTES {
				fmt.Println("Invalid content size")
				return
			}
			contentBuffer := make([]byte, size)
			err = ReadFullBuffer(contentBuffer, conn)
			if err != nil {
				fmt.Println("Error reading content", err)
				return
			}
			ForwardReceivedPacket(contentBuffer, size)
		}
	}

	// for (throughputMetrics.Get(ip) > MAX_BYTES_PER_SECOND) || speed[ip] > MAX_BYTES_PER_SECOND {
	// 	time.Sleep(time.Second * 1)
	// 	fmt.Println("Throttling", ip)
	// }
}
