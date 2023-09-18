# TODO

- [x] Handshake encryption
- [x] Message exchange
- [x] Handshake (Friend) persistance
- [x] Confirm message delivery
- [x] Confirm message read
- [x] Message persistance
- [x] Rendez-vous server (Not in use, replaced by Relay)
- [x] Relay server
- [ ] Synchronize messages between users
- [ ] Group chat
- [ ] File upload
- [ ] Prompt user when receiving the handshake request to confirm the friend invitation
- [ ] Change the RSA library. Probably [PyCryptodome](https://pycryptodome.readthedocs.io/en/latest/src/public_key/rsa.html)

# Topics to detail later in this README

- NAT hole punching (and NAT STUN) and why we don't use it. Server defining the ports, reusing ports, NAT issue.
- NAT and port translation
- UDP statless and ports
- UDP connected vs unconnected packets
- Symmetrical NAT vs Asymmetrical NAT
- Relay and NAT TURN

# UDP hole punching and NAT issue 

Conducting some tests, I noticed that the UDP hole punching is not effective with the router I have. 

## Issue with my home router

If I (A) start listening and send a packet to B, it works.

If B starts listening and send a packet to me (A), when I open the socket to listen on the port, the NAT translates the source address, making the connection not work.

It looks like my router creates a NAT registry for the packet, even if it's not expecting a new connection. Actually, as I'm writing this I remembered I configured a DMZ with an IP address other the the client I was testing. Probably that caused the issue, making the router accept any UDP or TCP connection and forward it to the DMZ IP. Later I'll do some testing and confirm this. Knowing that, probably this software won't work with routers that have DMZ enabled.

Other things worth trying:
- Send both the packets at the same time (less than 1 second deviation)

Either way, the relay server is the most compatible solution, the bad thing is that it adds a server resource cost.

UPDATE: I just validated, and it was the DMZ that was causing the issue. To test it, I used my LTE connection, which uses asymmetric NAT. In that case, it worked when A started, and when B started, but always only the A (The router at my house with symmetric NAT) received message from the B (LTE with CG-NAT and asymmetric NAT). Probably, there's a way to make it work with asymmetric NAT.

People say that the client's source port seen by the rendezvous server can be used as the destination port to requests made from another client. Probably NAT entries considers the source IP address when translating, and doesn't allow a different source IP address to use the same port to respond to the same client.

# How do the big players handle messaging?

Aparently Skype use or used P2P connections to transmit call data and files.

[According to this post on Quora](https://www.quora.com/Is-whatsapp-peer-to-peer-like-skype-If-yes-How-am-i-able-to-send-offline-message-to-other-people-If-not-wont-it-be-better-to-make-it-peer-to-peer-since-it-will-remove-server-connection-overhead), WhatsApp appears to use a version of XMPP, which forwards the messages to central servers, so they can forward the messages to other clients. That also happens for file transfer.

# When using relay severs, the connection can still be distributed

Since the server is responsible only to relay messages from one client to the other, all users can use the same server, or there can be hundreds or thousands of servers. There can be routing between the servers, and the client could connect to multiple "top level" servers, not relying in only one server or group. Further, one can implement it's own local or remote server, to handle communication in the same organization, or between peple working remotely.

In fact, from the start of the project, the connection between clients were considered not important, because it could be implemented in different ways without affecting significantly the working and security of the messaging. With the handshake, encryption and synchronization architecture, the connection implementation could be P2P, TCP, UDP, Relay or other methods.
