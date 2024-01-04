package main

import (
	"encoding/binary"
	"fmt"
	"math/rand"
	"net"
	"strings"
	"time"
)

var total int = 0

const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func RandStringBytes(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
	}
	return string(b)
}

var payload = []byte(strings.Repeat(" ", 3000))
var usernamePadding = []byte(strings.Repeat(" ", 499))
var sizeContent = make([]byte, 4)

func connect() {
	conn, err := net.Dial("tcp", "127.0.0.1:5000")
	if err != nil {
		fmt.Println("Error: ", err)
		return
	}
	total++

	username := RandStringBytes(20)
	_, err = conn.Write([]byte(username))
	if err != nil {
		total--
		return
	}
	_, err = conn.Write([]byte(strings.Repeat(" ", 480)))
	if err != nil {
		total--
		return
	}
	for {
		_, err = conn.Write([]byte{0x00, 0x00, 0x00, 0x00})
		if err != nil {
			total--
			return
		}
		_, err = conn.Write([]byte{0x00, 0x00, 0x00, 0x01})
		if err != nil {
			total--
			return
		}
		_, err = conn.Write(sizeContent)
		if err != nil {
			total--
			return
		}
		_, err = conn.Write([]byte("a"))
		if err != nil {
			total--
			return
		}
		_, err = conn.Write(usernamePadding)
		if err != nil {
			total--
			return
		}
		_, err = conn.Write(payload)
		if err != nil {
			total--
			return
		}
		time.Sleep(time.Millisecond * 100)
	}
	defer conn.Close()
}

func main() {
	binary.BigEndian.PutUint32(sizeContent, uint32(3500))
	for {
		go connect()
		time.Sleep(time.Millisecond * 1)
		fmt.Println("Total: ", total)
	}
}
