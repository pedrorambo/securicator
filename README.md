Securicator is a **distributed end-to-end encrypted** messaging app, including file transfer, deliver and read confirmation, persistence, and securely adding new friends.
This is an experimental project, developed to learn about networking, and encryption. Because of that, I documented the architecture in details, as well as the main challanges I had while devloping it, and its solutions.

If you plan to use this in production (to send confidential messages), keep in mind that a thorough security analysis is requried, and there is a "Security checklist" section to help you start.

![Three terminals: Node A exchanging messages with Node B, the relay server forwarding the messages, and Node B exchanging messages with Node A](assets/hero.gif)

# Overview

Even it looks simple to exchange message sand files between two clients, there's a lot involved in the process. This section presents a summary of the main modules of this project. Later in this document, there are detailed versions of the topics mentioned in this section.

## Handshaking

The process of adding a new friend is called "handshaking", and involves generating, and exchanging criptographic keys. This process is the starting point of a secure communication. Currently, the only way to add a friend is by having a pre-shared key with the user (a password that both users know). This way, we increase the trust that the other client is actually the friend you wanted to add, and decrease the probability of someone intercepting the connection, decryping, and compromising the session.

## Exchanging messages and files

All the communication between users (status, biography, messages, files, metadata, and confirmations) only happens after the handshake. This way, all these messages are end-to-end encrypted, and (theoretically) only the users participating the chat can view, and exchange messages.
Each friendship is cryptographically isolated, meaning there's no single key that represents a user, rather, for each session stablished between two friends, completly new cryptographic keys are generated. This way, imagining a relationship between `User A` and `User B`, only `User A` knows that the other user is `User A`. If intercepting the traffic, other friends, or an attacker will only know that there's two users communicating, but won't know who are they.

## Distributed architecture, and the relay server

To be able to communicate with other users, there must be a relay server, which forwards encrypted messages from one client, to the other. This server is stateless, and doesn't handle authentication, authorization, nor accounting. This application was architected in a way that all the necessary information is persisted in the client, and the relay server has the least possible responsibility in a communication.

## Securicator Client, and Web Interface

This project includes a web interface, which connects via an HTTP API to the Securicator Client. That's the recommended easiest and most complete method of using the application. In limited environments, and for testing, the Securicator Client (which includes a Command Line Interface) can be used alone for basic activities such as adding friends, and sending messages.

# Distributed, and end-to-end enctypted architecture in the context of this project

Most messaging apps requires the user to be registered to some central authority. This way, even tho the messages are exchanged between contacts (and are virtually only readable by the contacts itself), if the central authority goes down, is blocked by the ISP or bans your user account, the app won't work anymore. Even having this limitation, the centralization provides authentication: imagine you messaging someone by the phone number without knowing if that person who responded is actually the owner of that phone number.

The architecture of this project doesn't rely on the user being registered to some central authority. Rather, the trust between each pair of users is all it's needed to exchange messages. There is no concept of a globally unique user, nor usernames. Each pair of users know and trust each others by their criptographic keys. When adding a new contact, a pre-shared key (password previously exchanged between the two contacts) is used to stablish that first "handshake". After that, the two users trust each others, and that initial pre-shared key is never used again.

This way, even not having a central authority to manage user authentication, this process can still be done locally, between each client.

## The Relay Server

By having the decentralization, a way to connect one user to the other (via the internet) is needed. The first (quick & dirty) solution to achieve this is to have open ports in the firewalls, and to use the public IP of the two users willing to communicate. This solution is impractical, as it would require access to the firewall (at home it's possible, but at organizations, cellular, or public places it's impossible most of the times), and a "fixed" public IP (even using a [Dynamic DNS](https://en.wikipedia.org/wiki/Dynamic_DNS), cellular and [Carrier-grade NAT](https://en.wikipedia.org/wiki/Carrier-grade_NAT) networks won't support it).

To stablish the connection between multiple clients in different globally distributed networks, this project includes a relay server, which forwards messages between connected clients. Even having relay servers, the architecture for connecting clients is still distributed, since the servers are used only to forward messages, and **the clients don't rely on that server**.

The relay server architecture was built to depend as little as possible in these servers. This was achieved by the following functionalities:

- In correctly implemented, servers would never filter, or block users from connecting
- Any authority, or person could run a relay server, or a cluster of servers (and organizations could have their private relay server for internal communication)
- The user would have a pool of available servers, and could dynamically choose the one to use

In general, the architectured is prepared to not depend on the relay server, and it's developed to be easily swapped by any other server in any country, provider, or authority.

### Limitations of the architecture

Since the relay server doesn't handle authentication, any user can announce itself with any username, and start receiving messages directed to any user having that username. In that worst case, the user unintended to receive the messages will receive only encrypted data, but that still not ideal. This limitation could be fixed by forcing both users to authenticate between themselves in the relay server, and this is described in more details in the section about suggestions for extending this project.

Another limitation is the requirement of a pre-shared key, which must me known by both users trying to be added as friends. This requires a prior communication channel (in other platform) between the users.

The necessity of a third platform creates a security vulnerability of compromising the handshake process, since that pre-shared key could be known if the platform used is compromised. Possible mitigations to this vulnerability are:

- Use different platforms (including phyisical) to exchange each part of the pre-shared key
- Using personal information that only the other person knows to compose the pre-shared key
- Replacing the pre-shared key with a stronger encryption as soon as possible (this is done automatically)

It should be noted that the pre-shared key is used only once when adding a friend. As soon as the keys are exchanged, a stronger encryption algorithm that don't depend on pre-shared keys is used. After successfully adding a friend, if these exchanged keys are intercepted, and the pre-shared key is revealed afterwards, the secure communication is unaffected.

The limitation of the necessity of a pre-shared key can be reduced by adding friends trusted by other friends, and this suggestion is also detailed in the section about suggestiong for extending this project.

## WhatsApp, Telegram, and Signal

It's important to clarify the difference between this implementation, and the most common chat apps, as all of them uses end-to-end encryption, and appear private and secure.

### Centralization

The primary difference is that the 3 main stream messaging apps all use a centralized server/authority for user authentication, and messaging.
One advantage of these platforms is that just by knowing one's phone number, username, or being in the same group, I can start a new chat with that person, and that's important in today's context. The only problem is that there's a dependency in these servers.
At first, if the servers goes down, there's no communication. That doesn't look like something that can happen very often, but there's other ways of blocking access to the servers, which have the same effect. [It's common for governments to block the access to apps such as Telegram](https://en.wikipedia.org/wiki/Government_censorship_of_Telegram).

Also, if the ISP, cloud provider, or the company that owns the app decies to not work anymore, these messaging apps won't work.

The proposal of this project is to not depend on a central authority, and that is achieved by focusing the authentication on the client, and using the servers just to make channels between two users. If a server goes down, or is blocked, the client application can automatically choose another healthy server, which can be run by any person, or organization.

### Open implementaion

This project describes, and shows the complete implementation of the protocols, allowing people to not need to trust on a company, rather to run, and analyze the source code of the running application. In other words, you can have access to everything related to the process, stored data, and the application you're using for communication.

Everything critical runs locally, and can be analyzed by anyone with expertise to do that, and you don't depend on any company for serving the (closed source) app.

The part that you can't control, analyze, or change is the relay servers, which is not responsible for authentication, nor encryption. Its only job is to forward messages from one client, to the other.

### A note on privacy

Even by using a strong and reliable end-to-end encryption, by using these apps (which don't share publicly the source code) you trust the company running the app, operating system, and app store. That's not a problem, that's just information to keep in mind.

In a hypotetical case where the messaging app, app store, or operating system is forced to reveal your messages, that's easy to be achieved just by launching a software patch.

### Analogy

The best analogy I could find about centralization and decentralization regarding this application is with remote access tools for servers.

This software can be associated with the open source standard Secure Shell (SSH) Protocol, in which the authentication and trust happens between only the destination server, and the client trying to remote access to it. No third party is needed, and it can work locally, in a network which only the two devices are connected.

Other messaging apps such as WhatsApp, and Telegram can be associated with proprietary remote access management tools (such as TeamViewer, and AnyDesk), which even having end-to-end ecryption, the authentication depends on a server managed by the tool, and the access depends on the continuous connectivity with the tool's servers.

# Using the application

TODO: This section doesn't belong here

While testing, I actually used this application to communicate with a friend, but keep in mind that besides it being very experimental, you'll have to run a relay server, and have the necessary applications installed in the mechines tou want to communicate. Also, both nodes must be online for sending, or receiving messages. If you send a message to your offline friend, the message will arrive only when both of you are connected. The good part is that you can leave this application running always in the background, even if not opening the web interface.

# Setup the project

To exchange messages, this project requires 3 applications to be running:

- The relay server (which can be run locally)
- The client (recommended to run locally)
- The web interface (recommended to run locally, but not strictly necessary, since the client has a CLI)

## Relay server (gorelay)

The relay server, written in Golang is located in the folder `gorelay`. The Golang version 1.21.1 was used, but this can easily be upgraded to the version running in your machine.

Inside the `gorelay` foder, run:

```bash
go run .
```

If it ran correctly, no error messages will be shown, and the terminal will be printing periodically the connected user list:

```text
------------------------------------
Connections:
```

This server will be used to connect different users together.

## Securicator Client

You must have Python 3.6, and pip (Python's package manager) installed.

Inside the folder `client`, install the dependencies with `pip3 install -r ./requirements.txt`

After installing it, run `python3 main.py`

After running the command, the application will ask your username, and then initialize, and connect to the relay server.

## Web interface

The securicator can be used just with the Securicator Client CLI, but this project includes a web interface for convenience. To run it, you'll first need NodeJS (tested with 20.10.0 LTS), and yarn (one NodeJS package manager).

Inside the folder `web`, run:

- `yarn install`
- `yarn start`

The project should be running, and accessible on [http://localhost:3000/](http://localhost:3000/). This web interface will connect to a REST API running on the Securicator Client. This imposes a limitation: only the first Securicator Client opened will be used with this web interface. The others will fail to start the API server, but will work correctly with the built-in CLI.

## How to use

After startup, the database files will be created, and there will be no friends, and no messages. To add a friend, in the web interface, click on `Add friend`, and inform its username (for testing, you can run another Securicator Client in the same machine, with a different username, and add it as a friend). If the handshake occurs correctly, the friend will be available in the friends list for chatting.

On the sidebar, you can click on your friend's username to open the chat window, and start sending messages and files.

If the recipient is not receiving the messages, these messages will be stored, and delivered to the destination as soon as the user connects.

It must be noted that the handshake process (that occurs when adding a friend) is synchronous, and need both users to be connected. After the friend is added, all the other operations are asynchronous.

## Using it in the real life to chat with someone outside your LAN

The only difference when running for connecting with acutal users without your LAN is that you, and the other users must use the same relay sever. For this, I recommend using the smallest virtual machine from any cloud provider. At startup, when the Securicator Client asks for the relay server IP, you can inform the public IP of the relay server, and use it normally.

All the necessary information is saved locally, so you can change the server you're using, and the message will be delivered as long as the recipient is using the same server.

# The handshake in-depth

The handshake process is the first and most sensible part of starting a connection with other user. Following, there is a diagram, followed by a detailed explanation of each phase and decision.

![Diagram of the handshake process between two nodes](assets/handshake.png)

## Overview

TODO: Describe the handshake

## Should we use a pre-shared, asymmetric or symmetric encryption?

Since the core of this project is the encryption, I tested each method to decide which one would be the best for the project's purpose. Following, there are a detailed motivation for the reason we chose one, or other encryption method.

### Pre-shared key

The symmetric encryption with a pre-shared key is the easyest to note why it isn't the best option. First, it is the same to both users, so if that key is discovered, the complete process is compromised.
Second, even if generated randomly, being long and created by a trusted password generator, it must be known by both nodes before the handshake, which creates a problem: to securelly and privatelly exchange this key via another communication platform.

Even the pre-shared key not being the best method to encrypt the content, it is conveninent to start the handshake with a new node. It's easier to share a pre-shared key with another user then it is to generate a key pair, and send the long public key to the other user. Also, it's easier to share parts of a pre-shared key in different communication medias the it is to send parts of a public key. Third, if there is a known secret between two nodes, you can derivate this secret.

To exemplify, following there are an example of how a pre-shared key can be securely shared from Node A to Node B:

1. User in Node A sends to User in Node B via a social media: The first part of the key is the text: mf8k49j7d348
2. User in Node A sends to User in Node B via email: The second part of the key is the text 30m8dh30, and at the end, put the text we both know, that we talked about in the call we did an hour ago.

### Asymmetric encryption

Another method is the asymmetric key encryption, which is ideal in that case. In fact, the actual encryption depends directly on the asymmetric key encryption.

With the asymmetric key encryption, we can use two private and public key pair, in which each node will have only the public key of the other node. The key used in this process is long and secure, and if one key is discovered, only half of the connection will be compromised.

As mentioned before, it's not convenient to share the public and private key with the nodes. For this, a pre-shared key is used. Actually, tis pre-shared key is used as little as possible, only to send the first public key. After that, this pre-shared key is not used anymore. This reduces the less secure window to only seconds, in which a user can intercept and bruteforce the encryption.

Moreover, we use a public/private key pair to each directional "link" between two nodes. This means that there is one key pair when Node A wants to communicate with Node B, another pair when Node B wants to communicate with Node A, and a third when Node A wants to communicate with Node C.

If ideal, this process could be used to encrypt all the connection, but there is one big limitation of the RSA asymmetric encryption used in this app: The size of the content to be encrypted can't be large than the public key length, which is relativelly small.

### Asymmetric encryption limitation, and the asymmetric/symmetric mix

One limitation of the RSA asymmetric key encryption is that [is can only be used to encrypted content that is less then a little less then the key length used](https://security.stackexchange.com/questions/33434/rsa-maximum-bytes-to-encrypt-comparison-to-aes-in-terms-of-security). Let's take the use of a key of length 2048 bits for example. In that case, the content of the content to be encrypted can't be greather than 245 bytes, which is 245 characters in ASCII. This limit is too low to be practical, so we need to use a better strategy that allows larger content to be encrypted.

TODO: Detail why the size limit

The solution is to use symmetric encryption, which the limit of the length of the content is virtually unlimited (In the case of the protocol AES used in this application). By using symmetric encryption, we have the same problem mentioned in the pre-shared key section: if the key is intercepted and discovered, the entire encryption is compromised.

The solution we used, which is commonly used in general encryption is to use both the asymmetric and symmetric encryption.

In details, the actual content that needs to be encrypted is first encrypted with a symmetric key randomly generated at the time of the encryption. This symmetric key is not longer then the maximum size allowed by the asymmetric key size. Then, this symmetric key is encrypted using the asymmetric key. After that, both the inner content encrypted with the symmetric key, and the symmetric key encrypted with the asymmetric key are sent to the destionation. The node receiving this content can do the reverse to decrypt the message.

This is the method of encryption actually used in this application. Using this, the content length is virtually unlimited, while the process is still secure.

## How secure is the current encryption architecture

Starting this project, I chose to following algorithms:

- (Asymmetric) RSA 2048
- (Symmetric) AES CBC with 32-byte keys
- (Signature) RSASSA-PKCS1-v1_5

After the first version of this project, I reviewed the encryption methods. For symmetric, the AES used is, in general, a good option. For asymmetric encryption, there's better options.

I would like to reiterate that the encryption methods used by this application can be changed, and it would be good to match the methods used by production applications. Independend of the encryption is the underlying message relaying, and trust system.

### Replacement for the RSA 2048

Currently, a "drop-in" replacement for the asymmetric encryption is the ed25519. The key strength (which should not be the only determining factor), [its breaking difficulty is similar to a RSA with ~3000-bit keys](https://ed25519.cr.yp.to/), the key sizes are smaller (public keys consume 32 bytes), which is important for the routing architecture of the relay servers, and is more performant (in general) [for signing](https://blog.cloudflare.com/nist-post-quantum-surprise#digital-signatures), and for key generation (in a simple test I wrote in python, Ed25519 is 120000 times faster than RSA 2048 for generating new key pairs, although I don't trust this test too much).

You can run the command `openssl speed rsa1024 rsa2048 rsa4096 ecdsap256 ed25519` in your machine to benchmark the signing, and verifying speeds for the mos common algorithms. Running in my machine, I get the following results:

| Algorithm | Sign duration | Verify duration | Signatures per second | Verifications per second |
| --------- | ------------- | --------------- | --------------------- | ------------------------ |
| RSA 2048  | 558μs         | 14μs            | 11125.4               | 247057.9                 |
| Ed25519   | 29μs          | 83μs            | 33363.1               | 11960                    |

## A better architecture

A (probably) better architecture would be the same implemented by the major end-to-end encrypted messaging apps, but that would require rearchitecting this application completly, and create bindings for existing native encryption methods available in the operating system the the encryption library used doens't support yet.

In short, most apps today replace a randomly generated symmetric key with a key derivated from exchanged keys and signatures, uses multiple keys for different purposes (some being temporary), and never exchange the symmetric key. The fact that this application does generate a symmetric key, and exchange it doesn't make it insecure, but it's not as safe as the methods used by current main stream applications. One of the advantages of the modern methods of end-to-end encryption is the [Forward secrecy](https://en.wikipedia.org/wiki/Forward_secrecy), which is the ability to not reveal previously exchanged information if some keys or passwords are compromised.

This section could be a whole article by itself, so I'll leave some really good readings regarding end-to-end encryption:

- [Signal Technical Information](https://www.signal.org/docs/): Includes all the algorithms used for key enchange, signing, and encryption used by Signal, and other apps.
- [WhatsApp Encryption Overview (Technical white paper)](https://www.whatsapp.com/security/WhatsApp-Security-Whitepaper.pdf): Detailed encryption methods (Signal Protocol) used by WhatsApp.
- [Practical-Cryptography-for-Developers-Book](https://github.com/nakov/Practical-Cryptography-for-Developers-Book): The title speaks for itself, and it's the very next book I'm gonna read.
- [What happens in a TLS handshake? | SSL handshake (by CloudFlare)](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake): This one is a little off-topic, but includes the concepts of key exchange, and symmetric key derivation.

# Connecting multiple clients

As mentioned before, this application was architectured to not depend the most on the interconnection method between users. Having a secure encryption, it's not a big security risk if the messages are intercepted.

It must be noted that the problem we're discussing in this topic is solely the delivery of bytes from one node to other node. Any more that that is responsability of the application, and not exclusivelly of the interconnection.

Also, it was a prerequisite for this project to work with NATed home networks, enterprise, and mobile carries networks, not depending on firewall configuration.

In fact, from the start of the project, the connection between clients were considered not important, because it could be implemented in different ways without affecting significantly the working and security of the messaging. With the handshake, encryption and synchronization architecture, the connection implementation could be P2P, TCP, UDP, Relay or other methods.

Initially, I listed some methods to test for exchanging packets Some peer-to-peer connection (most common is UDP hole-punching), open ports in the router, UDP broadcast, and a "central" relay server. Following, i'll detail each available method:

## Peer-to-peer connection

Some kind of peer-to-peer connection would be ideal for the purpose of this application, but that isn't practical for most home and enterprise routers and configurations. For home networks, most routers and ISP blocks peer-to-peer connectinos, and in enterprise networks, it's very common for network engineers to block it also.

### UDP hole-punching

A more precise analysis could be made to detect the probability of routers to allow some kind of peer-to-peer connection, but I tested only once from two home networks between two different places, and it didn't work all the times. Due to the failure in this simple case, I decided to not rely on it, but feel free to contribute to this post and evaluate if you router supports some kind of peer-to-peer connection.

One method of peer-to-peer connection, which to the router doesn't appear to be a peer-to-peer connection is the UDP hole-punching. This method consists of exploring the origin and destination port mapping of firewall/router routing tables, using the UDP protocol. When creating the application, I spent a long time trying the UDP hole punching, and following, I document the working of this method. If you want a more detailed explanation of UDP hole-punching, there is two awesome references in the topic:

- [UDP Hole Punching in TomP2P for NAT Traversal](https://files.ifi.uzh.ch/CSG/staff/bocek/extern/theses/BA-Jonas-Wagner.pdf)
- [Peer-to-Peer Communication Across Network Address Translators](https://bford.info/pub/net/p2pnat/)

#### How does the UDP hole-puncing works

##### Network Address Translation table

Due to the limited amount of IPv4 addresses (around 4 billions, whish is way less than the devices connected to the internet), most IPv4 routers (the one used at your home and at your office included) uses Network Address Translation (NAT) to allow multiple clients in a local network to use one single public IP.

This mappnig works as following:

1. Your computer with the IP 192.168.100.20 makes a DNS UDP request to Google's DNS server with the IP 8.8.8.8.
2. Being DNS, the destination port is 53, and the source port is chosen (most often randomly) by your operating system.
3. Before forwarding the packet to ther internet, your router changes the source address from 192.168.100.20 to the public IP of your home or office, for example 199.191.240.57.
4. To know how to send the response back to your computer, the router saves the information necessary to map the response to your computer. An example of that table is shown below:

| Local IPV4     | Local source port | Translated IPV4 | Translated source port | Remote IPv4 | Remote port |
| -------------- | ----------------- | --------------- | ---------------------- | ----------- | ----------- |
| 192.168.100.20 | 98232             | 199.191.240.57  | 98232                  | 8.8.8.8     | 53          |

5. Now the router knows that when receiving a packet from Google's IP 8.8.8.8 with the source port 53, and the destination port 98232, it should forward the packet to your computer.

![Diagram exemplifying network packets being NATed between a client and a server](assets/nat.png)

That's the basic working of NAT. If we were not using NAT in this case, there could be two cenarios:

1. Your computer would be connected in bridge mode with your router, having the IP 199.191.240.57 and receiving all requests from any origin. That's actually possible to implement. The only advantage is that there could be only your computer connected to your network.

2. Your computer would send the packet to Google, but the response would be delivered to your router, and it wouldn't know what to do with the packet (it wouldn't know if it should forward or to who forward to, or if it should accept to itself), and probably it would be discarded.

In most enterprise routers, it's possible to view the actual connection and NAT table, and identify the translations.

##### Using the NAT table for other purposes

NAT introduces a problem, whose side effect is a great security feature: only hosts with who you started a connection could respond to your computer. In other words, no server can by itself send packets to your computer. Let's return to our NAT table created in the previous section.

| Local IPV4     | Local source port | Translated IPV4 | Translated source port | Remote IPv4 | Remote port |
| -------------- | ----------------- | --------------- | ---------------------- | ----------- | ----------- |
| 192.168.100.20 | 98232             | 199.191.240.57  | 98232                  | 8.8.8.8     | 53          |

Now, imagine that your friend's IP 3.201.165.30 wants to connect to your computer 192.168.100.20 at port 9000. First, your computer has a private IP, and that private IP can't be used as a destination IP to a remote networn. For that, your friend must use your public IP 199.191.240.57. Now, when your friend sends a packet to your public IP with the destination port 9000, the router will look at the NAT table for the translated source port 9000, and will not find any registry. Due to the registry not being found, it will reject the packet. That behaviour (default to most routers) makes harder for any user to communicate with any other user on the internet.

This is a good feature, because an old operating system publicly accessible to the internet is incredibly dangerous. Using NAT, no unwanted traffic from the internet will reach the old operating system.

![Diagram exemplifying the UDP hole-punching process between two nodes in different NATed networks](assets/udp-hole-punching.png)

Note: Most routers that have NAT also allows port mapping configuration, in which you tell the router to always redirect a port to a specific internal IP, but that won't be considered because it's impractical to configure the router of each place you want to use this software, or in routers you don't control. Also, the port mapping is not a feature for users behind a [CGNAT](https://en.wikipedia.org/wiki/Carrier-grade_NAT), nor for users using mobile phone networks.

To achieve peer-to-peer communication, we can take advantage of that port mapping and force it to accept connection from other host. For example, you can coordinate beforehand with the other host (Host B) that you're gonna use the destination port 9000, and the Host A the destination port 9001. Now, your computer will make a request, which will create a registry in the NAT table of your router (actually, it will also create registries in the CGNAT or mobile network router). After that, your router's table will look like the following:

| Local IPV4     | Local source port | Translated IPV4 | Translated source port | Remote IPv4 | Remote port |
| -------------- | ----------------- | --------------- | ---------------------- | ----------- | ----------- |
| 192.168.100.20 | 9000              | 199.191.240.57  | 90001                  | 8.8.8.8     | 9001        |

After that, Host B won't receive this packet, but at least your router will have that mapping alive for about 30 seconds. Knowing that table, it's clear that if the host 199.191.240.57 sends a packet to your public IP with the destination port 90001, and the source port 9000, that packet will be redirected to your computer with the IP 192.168.100.20. In fact, that will actually work in most cases, and if you do this in both sides, you have a two-way peer-to-peer communication using UDP hole-punching.

##### Rendezvous server

For the UDP hole-punching to work, it's necessary to both the clients to know which destination ports they will use. It's not practical to guess or use all possible ports. For that, a so called Rendezvous server is necessary. The server serves only the purpose of choosing two random ports and informing them to the clients for them to use as destination ports for the hole-punching. During the labs, we implemented a Rendezvous server, and the sources can be found in the git history.

##### Limitations

Previoulsy I mentioned that this will actually work in most cases because that will only work for routers with specific configuration, one being the Symmetric NAT, which is the one examplified previously. It's called symmetric because the source port your computer specified is the same one as the source port forwarded by your router to the internet (called the Translated source port).

| Local IPV4     | Local source port | Translated IPV4 | Translated source port | Remote IPv4 | Remote port |
| -------------- | ----------------- | --------------- | ---------------------- | ----------- | ----------- |
| 192.168.100.20 | 9000              | 199.191.240.57  | 90001                  | 8.8.8.8     | 9001        |

Knowing the translated source port is essetial for UDP hole-punching. In a non-symmetric NAT, the router will use a different translated source port as the one your computer specified, and that will make the peer-to-peer connection not work.

| Local IPV4     | Local source port | Translated IPV4 | Translated source port | Remote IPv4 | Remote port |
| -------------- | ----------------- | --------------- | ---------------------- | ----------- | ----------- |
| 192.168.100.20 | 9000              | 199.191.240.57  | 97238                  | 8.8.8.8     | 9001        |

That's one case in which your router won't allow the connection to work, but if the router has a demilitarized zone (when conducting the lab, my router had one, and that made the connection to not occur), even with symmetric NAT, the connection won't always work. That's because with the DMZ, any packet not mathing the NAT table is routed to the demilitarized zone IP, and the router will save that as a new mapping. Any new connection from your computer to the destination will force the router to choose a new port, since that port is already present in the NAT table. Also, if the timeout of that NAT table is too short, or it has some other specific configuration, the method won't work.

Concluding, we can see that UDP hole-punching is a method that will work in some combination of origin and destination router configurations, but it's not good to rely on a connection that works only sometimes. Because of that, we discarded UDP hole-punching for this project.

Note: You can easily make a UDP hole-punching lab with [Netcat](https://en.wikipedia.org/wiki/Netcat), and that's good to diagnose and understand the working of this procedure.

Note 2: The system can be improved by having a hybrid interconnection strategy, using UDP hole-punching when possible, and relay as an alternative method. Probably, that will make the system more resilient and secure.

#### Issue with my home router

Conducting some tests, I noticed that the UDP hole punching is not effective with the router I have.

If I (A) start listening and send a packet to B, it works.

If B starts listening and send a packet to me (A), when I open the socket to listen on the port, the NAT translates the source address, making the connection not work.

It looks like my router creates a NAT registry for the packet, even if it's not expecting a new connection. Actually, as I'm writing this I remembered I configured a DMZ with an IP address other the the client I was testing. Probably that caused the issue, making the router accept any UDP or TCP connection and forward it to the DMZ IP. Later I'll do some testing and confirm this. Knowing that, probably this software won't work with routers that have DMZ enabled.

Other things worth trying:

- Send both the packets at the same time (less than 1 second deviation)

Either way, the relay server is the most compatible solution, the bad thing is that it adds a server resource cost.

UPDATE: I just validated, and it was the DMZ that was causing the issue. To test it, I used my LTE connection, which uses asymmetric NAT. In that case, it worked when A started, and when B started, but always only the A (The router at my house with symmetric NAT) received message from the B (LTE with CG-NAT and asymmetric NAT). Probably, there's a way to make it work with asymmetric NAT.

People say that the client's source port seen by the rendezvous server can be used as the destination port to requests made from another client. Probably NAT entries considers the source IP address when translating, and doesn't allow a different source IP address to use the same port to respond to the same client.

TODO: Include a diagram of the port translation

### Limitations

Close to what happens with the Onion network, for example, is that your ISP and the relay servers can intercept the messages, but cannot read the content. This is something to keep in mind, since the traffc pattern and time can be analyzed, and can help on discovering and locating people.

### How does the existing apps handle exchanging messages between devices?

Aparently Skype uses or used P2P connections to transmit call data and files, specifically UDP hole-punching.

Acording to the discussion in the thread [Is whatsapp peer to peer like skype? If yes, How am i able to send offline message to other people? If not, won't it be better to make it peer to peer since it will remove server connection overhead?](https://www.quora.com/Is-whatsapp-peer-to-peer-like-skype-If-yes-How-am-i-able-to-send-offline-message-to-other-people-If-not-wont-it-be-better-to-make-it-peer-to-peer-since-it-will-remove-server-connection-overhead) on Quora, WhatsApp appears to use a version of XMPP, which forwards the messages to central servers, so they can queue, store, and forward the messages to other clients. Aparently, that also happens for file transfer.

### The solution: Relay servers

The most compatible solution found for the case of this application was the use of relay servers, which are central applications that forward messages between nodes.

Currently, the relay server present in this project maintains a list of recent connected nodes. If in a timeout, a host doesn't send a keep-alive request, the node is considered offline and is removed from the list. For a host to register, it's only needed the username. When a node sends a packet to other host, the relay server forwards the message to all active UDP connections matching the username. You can see that there is a security concearn that people can fake their usernames and listen to the packets, in fact that could happen, but keep in mind that the content is completly encrypted.

Since the server is responsible only to relay messages from one client to the other, all users can use the same server, or there can be hundreds or thousands of servers. There can be routing between the servers, and the client could connect to multiple "top level" servers, not relying in only one server or group. Further, one can implement it's own local or remote server, to handle communication in the same organization, or between peple working remotely.

This project has the most basic relay server, that keeps the last active clients, and relay messages based on username. Since it's the only public part, this module in which there is the most possibility for improvements. It needs better strategies of security, resilience, filterin, queueing and routing.

#### When using relay severs, the connection can still be distributed

Using a central relay server doesn't mean that a central authority controls the traffic and filters it. If using a central server, there would be a security improvement, because each user could be registered by a key, and we could have unique usernames, but that introduces a problem also: everything depends on the central server.

To fix this, the relay server just forward the messages, and doesn't authenticate users. Currenty, the application supports only one relay server, but if implemented, the application could always use dozens of servers. In that case, if a authority goes down, or starts blocking requests from one user, it could be replaced by any other relay server. Of course, that would require two nodes to have at least one working relay server in common, or to be a routing, discovery and trust chain between the servers. It could even be possible for an individual or an organization to host its own relay server. By default, the application could come with dozens of relay servers, and allow the user to use custom ones. Again, as long as there is one path for packets to flow between two nodes, the secure communication is possible.

In the section Extending this project, there is ideas on how this important feature of the relay server could be improved.

### Alternative names for processes mentioned before:

TODO: Explain more

- Relay and NAT TURN and NAT STUN.
- Explain different ports in nat, the router reusing ports, etc.

# UDP Peer-to-Peer -> UDP Relay -> TCP Relay

Initially, I started this project by using UDP peer-to-peer to connect users. I quickly found out peer-to-peer connections are not that well supported by the current networks.

## UDP, and its limitations

In fact, UDP could work well if correctly implemented for the purpose of this project.

At first, when the app was used only for short text messages, sending UDP packets in a localhost relay server worked well. The limitation I hit was when I started sending large messages, or files over the internet.

### How much data can I fit in an UDP packet?

Different from TCP, when using UDP we always send packets with a maximum size. The theoretical maximum size of a UDP packet is 64KiB, but the most common [Maximum Transmission Unit](https://en.wikipedia.org/wiki/Maximum_transmission_unit) present in the internet is 1500 bytes. [To be safe, we can stick to a maximum of 508 bytes of payload in an single UDP packet](https://stackoverflow.com/a/35697810/17772642). If you send more data than what can fit in one packet along the path your packet makes, it'll just be discarded.

If we want to send more than 508 bytes (such as a 10MB file + metadata + encryption + destination client information), we would need to [break this data into small pieces](https://skerritt.blog/bit-torrent/), and send them using thousands of packets. That's not impossible, but we would need to implement a method of indexing these packets, and add more information (bytes) to the content regarding integrity check, and indexing. In practice, just to identify the destination user, this application usees 600 bytes (more than can safely fit in a single UDP packet).

Other big problem is sending thousands of UDP packets. We can't just send all of them at once. If your router, the ISP infrastructure, or the server can't read them in time, or if some part implements a rate limit, the packets would just be discarded, so we send all of the packets again.

If using UDP to transfer a lot of data, an acknowledgement system can be implemented, in which we gradually send more packets per second until we detect that some packets were not delivered.

There's an awesome [documentation of the uTorrent Transport Protocol](https://www.bittorrent.org/beps/bep_0029.html) explaining how they manage congestion control, acknowledgement, retry, and segmentation in UDP. It's implementation could be found in the [libutp](https://github.com/bittorrent/libutp).

### Simpler solution, so I can work on other things

I quickly noticed that if I choose to use UDP, this application would have to implement alternatives for most of the features already present in the TCP protocol, so I chose to just use TCP.

Note: If the necessity to handle millions of connections arise, the UDP would need to be highly considered, since it doesn't "waste" resources by mantaining a connection.

### Switching to TCP

Until now, the application was using the UDP model of packing information into one single packet, and sending it. If we used TCP like this, we would start a new connection (and make the whole TCP handshake), send the data, and end the connection. This would introduce latency, and a lot of wasted resources just handling these connections.

To fix this, we must update the application to use TCP as it was meant to be used: for straming data. The main concept that I would like to mention here is that in an open TCP connection, we only send/receive bits of data, without a discrete conventioned start, and end. In this case, we must implement a protocol to identify the starting, and end of one piece of data. One way of doing it is by using a special sequence of characters to inform the end of a sequence (HTTP does that). In this application, I opted to use a 4-byte magic number (a sequence of bytes that indicates the start of a piece of information), the 4-byte number, indicating the length of the content, followed by the content itself. This way, our application could send one "packet" of information with a theoretical maximum of 4GiB (interpreting the 4-byte number as an uint32). For practical purposes, described in the Relay Server section, we limited the content size to ~100KiB.

### More on the TCP straming characteristic

Some not so obvious things abount TCP that I would like to mention:

- There's no convention for indicating the start, and end of a portion of data
- The transmission adapts itself to the available network speed (congestion control)
- Lost packets are resent
- The stream is sequential, so to read more data, all the previous content must be read.
- There's a built-in cheksum, so a data corruption is less probable
- By default, we don't directly send, or receive the data. When we call `send()`, and `recv()` functions for a TCP socket, we just tell the kernel that we want to send, or receive some data. When, and at what rate it will be sent, or received is managed by the operating system, and the network infrastructure. Most importantly, calling `send()` doesn't mean the data will be delivered, nor that it will be sent at the exact same time the function was called, and calling `recv()` returns the bytes available in the read buffer of the operating system, which can be nothing, or less data then what were sent (we can call `recv(1024)` to receive 1024 bytes, and get back just 100 bytes). Just to ilustrate the distance between requesting data to be sent, and that data actually being sent, [TCP can literally wait up to 200ms to send the data, as mentioned in the section Forcing data delivery in the Wikipedia article about TCP](https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Forcing_data_delivery).
- There's 3 ways of sending data on a TCP stream: blocking synchronous, non-blocking synchronouse, and asynchronous

To finish this section, I recommend the [Wikipedia article about the Transmission Control Protocol](https://en.wikipedia.org/wiki/Transmission_Control_Protocol), which has a lot of precious information, and details.

# Connecting thousands of clients

Out of curiosity, I tested different architectures for the relay server to handle thousands of simultaneous clients.

# TODO: SPEED LIMITATION / THE NEW CHALLANGE: "LARGE" CONTENT, AND "FAST" TRANSFER SPEEDS

Practical UDP limitations: MTU of 1500, and practical maximum safe UDP payload size

Sending pieces of files. MTU, max UDP and TCP size

https://skerritt.blog/bit-torrent/

Slow start in TCP: https://www.isi.edu/nsnam/DIRECTED_RESEARCH/DR_HYUNAH/D-Research/slow-start-tcp.html?ref=skerritt.blog

# Send 1MB TCP streams

If it is required to not have an overhead in each chunk of data, the chunks needs to be sent sequentially over a TCP connection (I'm not sure about that). It doesn't seem to be a good solution to lock both sides of a Relay while sending this data. In that case, maybe a good idea is to first receive the 1MB in the Relay, and then to send it to the destination at once. Maybe 100KB is a good number for each chunk.

Sending from one client to the other would block both sides of the communication.

## The (not ideal) first architecture decision

[](https://www.isi.edu/nsnam/DIRECTED_RESEARCH/DR_HYUNAH/D-Research/slow-start-tcp.html?ref=skerritt.blog)

[](https://www.evanjones.ca/read-write-buffer-size.html)

[](https://support.ookla.com/hc/en-us/articles/360017436132-Optimizing-Server-Performance)

[](https://en.wikipedia.org/wiki/Transmission_Control_Protocol)

[](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)

[](https://blog.cloudflare.com/the-complete-guide-to-golang-net-http-timeouts)

[](https://blog.whatsapp.com/1-million-is-so-2011)

# Switching from UDP to TCP

TODO: Describe

- QoS with TCP (bandwidth) vs UDP (packets per second).
- Relaying (locking two connections in TCP)

## The first relay server

Python limitation, 2000 threads

Memory usage (and the size we should use for on SecurePacket)

CPU usage (idling with goroutines, or waiting for I/O)

## Scaling up to 1 million simultaneous users in one machine

Handling resources in the machine

Max open files

Max processes

Whatsapp guide

Read and write buffer sizes

## Scaling for mutliple million simultaneous users (horizontal scaling)

Previous techniques + Distributing, horizontal scaling

# OS

Leave as much as possible for the OS to handle. tc, connlimit, buffering

# TCP details

TODO: Describe better

With 2vCPU, 1GB RAM 4Gbps LAN I could reach 5047 concurrent connections each sending ~3500 bytes each 200ms, before running out of RAM, and both cores at ~80% usage on the htop command.

Keeping a send buffer in the application vs in the OS.

# CONNECTING NODES: The necessity of a fixed size packet, and the packet size limitation for scalability

The simplest possible functional relay server would redirect byte streams from one TCP connection, to the other. In this case, the RAM usage in the relay server would not be a big concearn, because we can read and write buffers as low as 1 byte each time.

While being simple, if two nodes send messages at the same time to other node, this relay method won't work, because in a TCP stream, we cannot interleave n bytes from stream A, and stream B. To understand this limtation, it must be noted that this application uses only one TCP connection/socket with only one relay server. To support multiple nodes sending at the same time, there must be a lock mechanism to allow only data from Node A to be sent to Node B until the stream ends. The problem with that is that the stream would be blocked for other messages. This is not a big problem when dealing with a few small packets, because the transmission would be blocked for ~100ms, but in the real life with congestion, latencies, and retransmissions, this transmission could easily be blocked for 5s, scaling with the number of friends one has. Moreover, a malicious node could send bytes slowly on purpose, locking one's stream for a long time, causing a DoS.

The solution implemented was a buffering on the relay server. The server would wait for a complete packet of max size `n` from the origin (which can take, for example, 10 seconds to send it), and only when the server has the complete packet, it will relay the content to the destination. This way we lock a transmission for as little time as possible. The main drawback of using this method is the high amount of memory used per client in the relay server. This way, the available RAM in the server limits the amount of simultaneous connected clients. I tested 100KB buffers, which would limit a server with 100GB of RAM to handle at most 800000 connections (with a 20% margin). If we lower the buffer size to support more connected clients, the file transfer gets slower. To keep the buffer small, and support faster file transfer, one possibility is to use two TCP connections.

## Two TCP connections

It should be noted that the support for two TCP connections is not implemented in this application, and is listed as a suggestion.

To better support more clients, and decrease the latency for small messages, and user feedback, each client could always have two connections to one relay server: one for control and small text messages (with a low buffer size, for example 10KB), and another connection exclusive for file transfer (with a larger buffer size, for example, 500KB).

When sending a small text message, updating the user status, or announcing that a file was sent, the latency will be lower than when sending files. Also, if the transfer server is overloaded, there will be no impact in the other actions.

## On-demmand buffers

Another solution is to create these buffers on-demmand, and expand them when reading more data. In this case, it's necessary to have a timeout for reading (keeping the buffer in use) the content. Also, this packet must be kept until it is sent to the destination.

In a public WhatsaApp partial benchmark, there was a RAM ratio of ~15KB per socket.

After implementing it, and benchmarking, a huge improvement in RAM usage was noted when dynamically allocating buffers.

# CONNECTING NODES: Benchmarking the relay server

In this repository, there's a project `benchmark`, which simulate clients exchanging simple messages. The mais purpose of this benchmark is to test the maximum number of simultaneous clients, and not bandwidth.

When running, it connects new clients, each sending ~2500 bytes every 1 second. As a benchmark, it records the maximum amount of simultaneous connected users.

A better benchmark would be to also receive the packets, and calculate the latency to deliver these packets.

I recommend to monitor the system resources while running the benchmark using `htop` for CPU and RAM, and `iftop` for network throughput.

## CONNECTING NODES: Early results

Using the AWS `t3.medium` instance type, with 2vCPU, 4GB RAM, and no CPU credits left, it made 16158 simultaneous clients.

Using the AWS `c7i.4xlarge` instance type, with 16vCPU, 32GB RAM, it made 28000 simultaneous clients. The RAM usage was only 700MB, the CPU usage was 20% in all 16 cores, and the network throughput reached 500Mbps receiving. The bottleneck in this scenario was the machine running the benchmark, which started getting `cannot assign requested address` errors, and I didn't investigate the problem. Considering the 20% CPU usage, and the connections, a linear projection can be made to estimate the capacity of 140000 active clients in this machine.

# CONNECTING NODES: Limiting the use of the relay server

Initially, I implemented a throughput, and connection limit in the application, but the Linux network stack has more efficient ways of doing this:

- iptables connlimit module to limit the amount of open TCP connections per IP
- [tc module](https://lartc.org/howto/lartc.qdisc.classful.html) to implement traffic shaping limiting the throughput for each IP

Also, this can be implemented in the router, or load balancer

# CONNECTING NODES: Idea for scaling even more the relay server

- Have multiple edge servers, that connects directly to the clients
- Have an internal queue-based routing mechanism to forward the messages

It should be noted that 2 nodes have to have at least one server in common to be able to communicate.

# Security checklist

This section provides a checklist with the most common security breaches and concearns related to this project. Each topic contains a general description of the vulnerability, and the explanation on how we prevented it.

## File name, and paths

Currently, all files are saved as the ID of the message (which should be checked for valid uuidv4), concatenated with the original file extension (the extension text is filtered with a list of allowed characters).

## Access control

The message exchange can only happen between two trusted users, and the username is set by the receiver, and not the sender.

Also, if a client sends a message with an uuid that already exists, this message gets ignores.

The only broken access present is the application is when requesting a file segment, where the application doesn't check if the message was sent to the client requesting the file.

## Handshake

For the handshake, a pre-shared key is needed. This key is used only to encrypt and decrypt the public key of the node starting the communication. After that, there's no security concerns if someone discovers this pre-shared key, since all the following content is encrypted with the private keys, which can't be derived from the public key, and the pre-shared key.

## Encryption

All messages exchanged between two nodes after the handshake are encrypted using symmetric, and asymetric encryption.

## Signing

The first problem is resolved, and we can encrypt the messages.

In the worst case scenario, where the first handshake packet is captured and saved, and later the attacker discovers the pre-shared key, and then the Node A's public key, the attacker could not read messages, but can send messages to Node A. To fix this, we can sign each message, and then verify the signature in the receiving side.

The method used for signing was [PCKS#1 v1.5 (RSA)](https://pycryptodome.readthedocs.io/en/latest/src/signature/pkcs1_v1_5.html). Whith this methdo implemented, a interceptor that gets the pre-shared key after the handshake cannot read, neither send messages.

## File encryption

The database used for persistence (friends, settings, and messages), and received files are not encrypted.

## API, and web interface authentication

There is no authentication in the API, and web interface, but they are listening only in 127.0.0.1 (localhost). An authenticaion is still necessary, since there could be multiple users in the localhost.

## Public (plain-text) information

Public data can be collected when when:

- There is a node using the same username as other node (receiving the same packets as the original node)
- Intercepting network requests
- The relay server is malicious, sniffing every forwarded packet

The information that can be collected, or derived using the data found in the previous methods are:

- The period in which a node is connected
- The sender public key
- The sender username
- The receiver username
- The aproximate length, and rate of the data transfer (which can be used to detect patterns in the communication between two nodes)
- When a handshake happens (request, and confirmation)

Other than that, all the encrypted data transfered between the nodes can be collected, but they're useless without the ability to decrypt it.

## Data privacy

With the current implementation, all nodes that announced itself with the same username will receive the same messages. If two nodes have the same username (one being the actual user, and other being an attacker), the messages (with encrypted content) going to the actual user will also be delivered to the attacker. This can be mitigated by authenticating in the relay server the forwarding between two ndoes. The only traffic that would not be authenticated would be the packets associated with the handshake process, which must be sent to users which we don't already trust.

## DDoS

Currently, a node A could open (max connections per IP) \* (available IPs) connections to transfer (max transfer speed per IP), and direct all of the data to node B, overloading the receiver node. The previously mentioned forwarding authentication could also fix this issue.

## DoS

Since there is a `transfer speed limit per IP`, and `maximum number of connections per IP`, a (not distributed/one single IP) Denial of Service is not probable to happen. If these two parameters are configured correctly, a single IP would not be able to overwhelm the relay server, or the destination node by just generating traffic.

If using more sophisticated methods, a DoS could probably be achieved, for example by:

- Sending malicious badly encrypted handshake content (the destination must be waiting for a handshake). In this case, there will be a resource cost associated with trying to decrypt the content that is not decrypable.
- Using some other (not found yet) breach that does heavy computation or waits, and accept unauthenticated packets, which can be used to scale resource cost associated with just receiving some bytes.

## Availability, and latency patterns

By keeping a history of the availability (when traffic is detected with an active node), this data can be used to associate with power, or network outages to narrow the possible locations of a user. Due to the architecture, the application is meant to always be running when the machine is operating (so nodes can be notified about new messages, and deliver messages to other connected nodes).

By analyzing the latency between nodes in multiple locations, and the destination node (passing through the relay server), the location could be estimated with small precision. This can be mitigated by adding a random delay when sending, forwarding, and receiving a message.

## Algorithm time-based attacks

I haven't analyzed the algorithms utilized for encryption, decryption, and signing for time-based attacks, but feel free to do that investigation.

# Persistence, and its scalability

Currently, the persistence of friends and messages are implemented the simplest way: an append-only file, in which each line is a JSON string containing the data of a registry. When loading, all the lines are read, and loaded. Currently the persisted friends never gets updated, but the messeges does, and for that case, each update to one message is saved as a new line (a new registry) in the file. When loading, the last message replaces the previous messages that have the same ID.

Received files are always associated with a message, and the actual files are all stored in a separate directory.

This "simple" persistence allows a easier debugging, backup, migration, and editing, but it also have some problems considering scalability, the most notable being the necessity to load all the messages when starting the application. Messages are small, but if actually using this application to exchange messages, the amount of persisted messages could grow fast. To fix this, the persistence could be implemented in multiple files, prefering the latest file only, but falling back to older ones when an old message is requested.

# (Re)synchronization

It's easy for one client to not be in sync with the other, which can be:

- Messages
- Delivery, and read confirmations
- Files

The messages, and files are already resynchronized when an existing client reconnects, but the delivery, and read confirmations should be implemented.

# Extending this project

This project is open source, and contribution is much appreciated both in the code itself, and the documentation and examples. This project is not activelly maintained, and it was intended more as a PoC and to document this process, than to be used in production, so keep in mind that if you want to use this project, a more in-depth analysis of the algorithms and the encryption must be done.

At the end, I decided to document in details this project, because even being simple, it served its purpose really well: to teach me things I didn't know about encryption, synchronization and interconnecting users.

## Friend's friends

Forwarding a friend handshake. In this case, we can ask B to handshake A with C, and we don't need to have a private key. This would be useful for groups. It should be saved that C was added through B.

A --(is friend of)--> B

B --(is friend of)--> C

A --> B --> C

## Group chats

There is no `User -> Server -> All Users`. Rather, all the users must have as friends all the other users, and there should be the possibility for a node to forward a message received from a user in a group to its friends.

Probably, the user must have at least another friend in the group, from which the messages will be forwarded. In that case, there must be a note indicating that the friend forwarded that message as being sent from another user in the group, reducing the trust level.

[](https://medium.com/@asierr/implementing-end-to-end-encryption-for-group-chats-f068577c53de#:~:text=Messages%20sent%20to%20the%20group,it%20to%20read%20the%20message.)

[](https://security.stackexchange.com/questions/126768/which-protocols-exist-for-end-to-end-encrypted-group-chat)

[](https://www.quora.com/How-does-group-messaging-work-with-end-to-end-encryption)

[](https://en.wikipedia.org/wiki/Signal_%28software%29#Implementations)

[](https://security.stackexchange.com/questions/119633/how-does-whatsapps-new-group-chat-protocol-work-and-what-security-properties-do/119656#119656)

[IMPORTANT](https://www.whatsapp.com/security/WhatsApp-Security-Whitepaper.pdf)

[](https://messaginglayersecurity.rocks/)

[](https://serverfault.com/a/10919)

[](https://www.sobyte.net/post/2021-09/golang-netpoll/)

[](https://gist.github.com/Lisprez/7b52f4a55cd0fcf96324b5f02b865e54)

[](https://en.wikipedia.org/wiki/Epoll)

[](https://www.youtube.com/watch?v=_3LpJ6I-tzc)

[](https://gist.github.com/Lisprez/7b52f4a55cd0fcf96324b5f02b865e54)

[Signal protocol, used by WhatsApp](https://en.wikipedia.org/wiki/Signal_Protocol)

To scale more the relay server (programming language independent), we would need to use the [Linux epoll](https://man7.org/linux/man-pages/man7/epoll.7.html), and handle file descriptors and syscalls directly.

Apparently, the group chat implementation would be a multiple one-to-one chat, in which each client have a key pair with each other user.

Even having multiple one-to-one chat, the message forwarding between trusted users in the group would still be recommended, otherwise we would need the sender online to receive the message, making the message consistency in the group a mess. When a message is forwarded through a trusted user, this can be flagged in the message, while we don't receive the message from the original sender.

## Offline messages and queueing in the relay server

Currently, the relay server doesn't have a queue, neither does it save messages if the destination node is offline. This is also a good feature to have.

## Confirm when accepting a friend request

Currently, when a user receives a friend request from one which have the same pre-shared key, the request is automatically accepted, and the user is instantly added to the friend list. It's a great update to prompt the receiving user to accept or deny the request. Also, there could be a "allow friend requests" state, and the pre-shared could be tied to a specific username.

## Username uniqueness

When using the "distributed" architectured of this project, we cannot rely on the uniqueness of the usernames. The relay server is prepared to work with duplicate usernames, but the nodes are not tested to that case.

## Support for multiple relays

- One client should always be connected to multiple relay servers
- There should be a confirmation to establish a single client-to-client connection
- There should be a routing algorithm to connect one client to the relay server that has the other client connected to

## Longer lived symmetric keys

Currently, every message uses a new symmetric key. Maybe there could be a 1-month session that uses the same symmetric key. I don't know the performance impact of decrypting each symmetric key using RSA, nor the security implications of keeping a symmetric key for one month.

TODO: Describe better
