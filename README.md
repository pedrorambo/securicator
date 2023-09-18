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