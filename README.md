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

- NAT hole punching and why we don't use it. Server defining the ports, reusing ports, NAT issue.
- NAT and port translation
- UDP statless and ports
- UDP connected vs unconnected packets
