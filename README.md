This is a PoC project of a distributed end-to-end encrypted messaging app. Since this app was used to learn more about encryption, messaging, and connection, I tried my best to document the architecture and issues I had while developing it. This system is not meant to be used in production without a broad security research, and software improvement, but it's a fun project to play with and extend.

## What distributed and end-to-end enctypted means in the context of the project

Most messaging apps requires the user to be registered to some central authority. This way, even tho the messages are exchanged between contacts (and are virtually only readable by the contacts itself), if the central authority goes down, is blocked by the ISP or bans your user account, the messaging doesn't work anymore for you. That centralization isn't all bad: imagine you messaging someone without knowing if that person is actually who you want to chat with.

The architecture of this project doesn't rely on the user being registered to some central authority. Rather, the trust between each pair of users is all it's needed to exchange messages. There is no concept of a global user, or globally unique usernames. Each pair of users know and trust each others username and keys. When adding a new contact, a pre-shared key (password exchanged between the two contacts previously) is used to stablish only that first "handshake". After that, the two users trust each others, and that initial pre-shared key is never used again.

This way we don't need a central authority to manage user authentication, but so far we can only communicate with users that have a public IP with an application listening on an open port, which won't be conveninent, and not event possible for most people. In LAN networks, it's easier for this to work if we can manage the OS's firewall, and the network infrastructure allows communication between the hosts, but the communication would be limited to people in the same network.

To fix this, a way to communicate between multiple clients in different globally distributed networks is necessary. For this, we can use a relay server (actually, multiple relay servers with routing capacity would be better), which basically forward messages from usernames to usernames. One can argue that if there is a central server to relay messages, the system is not distributed, but the relay server serves only to forward the messages. If implemented correctly, the server would never filter or block users from connecting. Moreover, the server doesn't need to be controlled by a central authority, and it would be better for each client to have dozens of "root relay servers" from different authorities, and select the most efficient for connecting to the destination username. If necessary, the user can host it's own server, or if using in an organization, there can be one secure relay server exclusive for communication between users in that same organization.

Two drawbacks I would like mentioning about that distributed relaying architecture is that anyone can say they are you (by using your username) and receiving messages directed to you, and there is a need to have a prior commuication with the contact you want to add, to exchange the pre-shared key. Virtually, there is no problem relaying a message to unwanted users, since the system uses a strong encryption, but also it isn't ideal. To fix this, the relay server can require the user pair to stablish a handshake between them, fixing the relay issue, but again the server would be allowed to intercept all those requests. As said before, the handshare requires that a pre-shared key is known between both users. Even the pre-shared key being used only once to stablish the encrypted handshake, if the packet is intercepted and the key is known by the interceptor, the whole secure communication process is compromised. For this, it's necessary that the users have a prior communication channel. They can physically exchange that information, use other encrypted and secure playform or send parts of the pre-shared key in multiple different communication platforms, or build a trust network between trust contacts, or require a personal information that only the person knows, to include in the key.

# List of functionalities and characteristics

- Securely handshaking (adding) new contacts
- Sending messages between contacts
- Receiving deliver and read confirmations
- Persisting the messages and contacts
- Exchanging messages between users globally (via WAN) or locally connected (LAN)

# Architecture

## Names and concepts

## The handshake

## The message exchange and "SecurePacket"

## The relay server

## Extending the project

## UDP hole punching

# TODO

- [x] Handshake encryption
- [x] Message exchange
- [x] Handshake (Friend) persistance
- [x] Confirm message delivery
- [x] Confirm message read
- [x] Message persistance
- [x] Rendez-vous server (Not in use, replaced by Relay)
- [x] Relay server
- [ ] Support offline message queue on the relay server
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
