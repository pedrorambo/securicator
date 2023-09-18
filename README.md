# Adding a new contact flow:

```text
-> PING
<- PONG

-> Secret + Generated certificate's public key

<- Other public key encrypted by the previously received public key

...communication
```

```
1. Created
2. Phase 1 handshake initiated
3. Phase 1 handshake finished
4. Phase 2 handshake initiated
5. Completed
```

# TODO

- [ ] Encrypt the packets with asymmetric encryption
