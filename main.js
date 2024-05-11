const crypto = window.crypto.subtle;

function escapeHtml(text) {
  var map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

function linkify(inputText) {
  var replacedText, replacePattern1, replacePattern2, replacePattern3;

  //URLs starting with http://, https://, or ftp://
  replacePattern1 =
    /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
  replacedText = inputText.replace(
    replacePattern1,
    '<a href="$1" target="_blank">$1</a>'
  );

  //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
  replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
  replacedText = replacedText.replace(
    replacePattern2,
    '$1<a href="http://$2" target="_blank">$2</a>'
  );

  //Change email addresses to mailto:: links.
  replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
  replacedText = replacedText.replace(
    replacePattern3,
    '<a href="mailto:$1">$1</a>'
  );

  return replacedText;
}

function messageToHtml(message) {
  return linkify(escapeHtml(message))
    .replace(/\*{1,2}(.*?)\*{1,2}/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/_(.*?)_/g, "<i>$1</i>");
}

class Connectivity {
  constructor(myGlobalPublicKey) {
    this.myGlobalPublicKey = myGlobalPublicKey;
    this.connect();
  }

  connect() {
    this._socket = new WebSocket("ws://localhost:9090", "protocolOne");
    if (this.messageHandler) {
      this._socket.onmessage = (event) => this.messageHandler(event.data);
    }
    this._socket.onopen = () =>
      this._socket.send(`CONNECT ${this.myGlobalPublicKey}`);
    this._socket.onclose = (e) => {
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        e.reason
      );
      setTimeout(() => {
        this.connect();
      }, 1000);
    };
  }

  async getIsConnected() {
    return this._socket.readyState === WebSocket.OPEN;
  }

  async send(message) {
    try {
      this._socket.send(message);
    } catch (error) {
      console.error(error);
    }
  }

  onMessage(receiverCallback) {
    this.messageHandler = receiverCallback;
    this._socket.onmessage = (event) => receiverCallback(event.data);
  }
}

class Profile {
  static getProfiles() {
    const profiles = window.localStorage.getItem("profiles");
    if (!profiles) return [];
    return JSON.parse(profiles);
  }

  static getProfileById(id) {
    const profiles = Profile.getProfiles();
    return profiles.find((p) => p.id === id);
  }

  static _getNextProfileId() {
    const profiles = Profile.getProfiles();
    const ids = profiles.map((p) => p.id);
    if (!ids.length) return 1;
    return Math.max(...ids) + 1;
  }

  static saveProfiles(profiles) {
    window.localStorage.setItem("profiles", JSON.stringify(profiles));
  }

  static async newProfile(password) {
    const symmetricKey = await generateSymmetricKey();
    const encryptedSymmetricKey = await symmetricEncrypt(
      symmetricKey,
      password
    );

    const prof = {
      id: Profile._getNextProfileId(),
      encryptedSymmetricKey: encryptedSymmetricKey.encrypted,
      encryptedSymmetricKeyIv: encryptedSymmetricKey.iv,
    };

    const profiles = Profile.getProfiles();
    profiles.push(prof);
    Profile.saveProfiles(profiles);

    return {
      ...prof,
      symmetricKey,
    };
  }

  static async loadProfile(profileId, password) {
    const profile = Profile.getProfileById(profileId);
    if (!profile) throw new Error(`Profile with id ${profileId} not found`);
    const symmetricKey = await symmetricDecrypt(
      profile.encryptedSymmetricKey,
      password,
      profile.encryptedSymmetricKeyIv
    );
    return {
      ...profile,
      symmetricKey,
    };
  }
}

class AppPersistence {
  constructor(profile) {
    this.profile = profile;
  }

  async load() {
    const encryptedContent = window.localStorage.getItem(
      `profile-${this.profile.id}`
    );
    if (!encryptedContent) {
      const { publicKey, privateKey } = await generateKeypair();
      const app = new App(privateKey, publicKey, this);
      app.persistence = this;
      await this.save(app);
      return app;
    }
    const [iv, encrypted] = encryptedContent.split(" ");
    const content = await symmetricDecrypt(
      encrypted,
      this.profile.symmetricKey,
      iv
    );
    if (content) {
      const {
        globalPrivateKey,
        globalPublicKey,
        contacts,
        displayName,
        envelopes,
      } = JSON.parse(content);
      const app = new App(globalPrivateKey, globalPublicKey, this);
      app.contacts = contacts;
      app.displayName = displayName || "User";
      app.envelopes =
        envelopes.map((e) => ({
          ...e,
          createdAt: e.createdAt ? new Date(e.createdAt) : null,
          deliveredAt: e.deliveredAt ? new Date(e.deliveredAt) : null,
          readAt: e.readAt ? new Date(e.readAt) : null,
        })) || [];
      return app;
    }
  }

  async save(app) {
    const content = {
      globalPrivateKey: app.globalPrivateKey,
      globalPublicKey: app.globalPublicKey,
      contacts: app.contacts.map((c) => ({
        ...c,
      })),
      displayName: app.displayName,
      envelopes: app.envelopes
        ? app.envelopes.map((e) => ({
            ...e,
            createdAt: e.createdAt ? e.createdAt.toISOString() : null,
            deliveredAt: e.deliveredAt ? e.deliveredAt.toISOString() : null,
            readAt: e.readAt ? e.readAt.toISOString() : null,
          }))
        : [],
    };
    const encryptedContent = await symmetricEncrypt(
      JSON.stringify(content),
      this.profile.symmetricKey
    );
    window.localStorage.setItem(
      `profile-${this.profile.id}`,
      `${encryptedContent.iv} ${encryptedContent.encrypted}`
    );
  }
}

class App {
  constructor(globalPrivateKey, globalPublicKey, persistence) {
    this.globalPrivateKey = globalPrivateKey;
    this.globalPublicKey = globalPublicKey;
    this.contactHandshakeSessions = [];
    this.contacts = [];
    this.envelopes = [];
    this.connectivity = new Connectivity(globalPublicKey);
    this.connectivity.onMessage(this.onMessage.bind(this));
    this.displayName = "User";
    this.persistence = persistence;

    setInterval(() => {
      this.sendContactHeartbeats();
    }, 1000);
  }

  async _handleHandshakeConfirmed(contactGlobalPublicKey, content) {
    const [
      handshakeId,
      encryptedReceivingSymmetricKey,
      publicKeyIv,
      myEncryptedPublicKey,
    ] = content.split(" ");
    console.log("HANDLE HANDSHAKE CONFIRMED: ", handshakeId);

    const foundHandshake = this.contactHandshakeSessions.find(
      (h) => h.handshakeId === handshakeId
    );

    const receivingSymmetricKey = await asymmetricDecrypt(
      encryptedReceivingSymmetricKey,
      foundHandshake.myPrivateKey
    );

    const myPublicKey = await symmetricDecrypt(
      myEncryptedPublicKey,
      receivingSymmetricKey,
      publicKeyIv
    );

    if (myPublicKey !== foundHandshake.myPublicKey)
      return console.error("Handshake confirmation failed");

    this.contacts.push({
      ...foundHandshake,
    });
    this.contactHandshakeSessions = this.contactHandshakeSessions.filter(
      (c) => c.handshakeId !== handshakeId
    );
    await this.persistence.save(this);
  }

  async _handleContactMessage(contactGlobalPublicKey, rawContent) {
    const [encryptedSymmetricKey, iv, encrypted] = rawContent.split(" ");
    const contact = this.contacts.find(
      (c) => c.itsGlobalPublicKey === contactGlobalPublicKey
    );
    const symmetricKey = await asymmetricDecrypt(
      encryptedSymmetricKey,
      contact.myPrivateKey
    );
    const content = await symmetricDecrypt(encrypted, symmetricKey, iv);
    const [verb, ...rest] = content.split(" ");
    const innerContent = rest.join(" ");
    switch (verb) {
      case "HEARTBEAT":
        this._handleHeartbeatReceived(contactGlobalPublicKey, innerContent);
        break;
      case "DISPLAY_NAME":
        this._handleDisplayNameReceived(contactGlobalPublicKey, innerContent);
        break;
      case "ENVELOPE":
        this._handleEnvelopeReceived(contactGlobalPublicKey, innerContent);
        break;
      case "ENVELOPE_DELIVERED":
        this._handleEnvelopeDelivered(contactGlobalPublicKey, innerContent);
        break;
      case "ENVELOPE_READ":
        this._handleEnvelopeRead(contactGlobalPublicKey, innerContent);
        break;
      default:
        console.error("Unknown verb", verb);
    }
  }

  async _handleHeartbeatReceived(contactGlobalPublicKey, content) {
    const date = new Date(content);
    const contact = this.contacts.find(
      (c) => c.itsGlobalPublicKey === contactGlobalPublicKey
    );
    contact.lastSeenAt = date;
    await this._resendUndeliveredEnvelopesToContact(contactGlobalPublicKey);
    await this.persistence.save(this);
  }

  async _resendUndeliveredEnvelopesToContact(contactGlobalPublicKey) {
    const pendingEnvelopes = this.envelopes.filter(
      (e) => e.to === contactGlobalPublicKey && !e.deliveredAt
    );
    for (const envelope of pendingEnvelopes) {
      await this.sendToContact(
        contactGlobalPublicKey,
        `ENVELOPE ${JSON.stringify(envelope)}`
      );
    }
  }

  async _handleDisplayNameReceived(contactGlobalPublicKey, content) {
    const contact = this.contacts.find(
      (c) => c.itsGlobalPublicKey === contactGlobalPublicKey
    );
    contact.displayName = content;
    await this.persistence.save(this);
  }

  async _handleEnvelopeReceived(contactGlobalPublicKey, content) {
    const contact = this.contacts.find(
      (c) => c.itsGlobalPublicKey === contactGlobalPublicKey
    );
    const parsed = JSON.parse(content);

    const deliveredAt = new Date();

    const envelope = {
      type: parsed.type,
      from: contactGlobalPublicKey,
      to: this.globalPublicKey,
      id: parsed.id,
      content: parsed.content,
      createdAt: new Date(parsed.createdAt),
      deliveredAt: deliveredAt,
      readAt: null,
    };
    const existingEnvelope = this.envelopes.find((e) => e.id === envelope.id);
    if (existingEnvelope) {
      await this.sendToContact(
        contactGlobalPublicKey,
        `ENVELOPE_DELIVERED ${
          parsed.id
        } ${existingEnvelope.deliveredAt.toISOString()}`
      );
    } else {
      this.envelopes.push(envelope);
      await this.persistence.save(this);
      await this.sendToContact(
        contactGlobalPublicKey,
        `ENVELOPE_DELIVERED ${parsed.id} ${deliveredAt.toISOString()}`
      );
    }
  }

  async setEnvelopeRead(envelopeId) {
    const envelope = this.envelopes.find((e) => e.id === envelopeId);
    const now = new Date();
    envelope.readAt = now;
    await this.persistence.save(this);
    await this.sendToContact(
      envelope.from,
      `ENVELOPE_READ ${envelope.id} ${now.toISOString()}`
    );
  }

  async _handleEnvelopeDelivered(contactGlobalPublicKey, content) {
    const contact = this.contacts.find(
      (c) => c.itsGlobalPublicKey === contactGlobalPublicKey
    );
    const [envelopeId, deliveredAt] = content.split(" ");
    const foundEnvelope = this.envelopes.find((e) => e.id === envelopeId);
    if (foundEnvelope.deliveredAt) return;
    foundEnvelope.deliveredAt = new Date(deliveredAt);
    await this.persistence.save(this);
  }

  async _handleEnvelopeRead(contactGlobalPublicKey, content) {
    console.log("RECEIVED ENVELOPE READ");
    const contact = this.contacts.find(
      (c) => c.itsGlobalPublicKey === contactGlobalPublicKey
    );
    const [envelopeId, readAt] = content.split(" ");
    const foundEnvelope = this.envelopes.find((e) => e.id === envelopeId);
    if (foundEnvelope.to !== contactGlobalPublicKey) return;
    if (foundEnvelope.readAt) return;
    foundEnvelope.readAt = new Date(readAt);
    await this.persistence.save(this);
  }

  async sendContactHeartbeats() {
    const now = new Date();
    for (const contact of this.contacts) {
      await this.sendToContact(
        contact.itsGlobalPublicKey,
        `HEARTBEAT ${now.toISOString()}`
      );
      await this.sendToContact(
        contact.itsGlobalPublicKey,
        `DISPLAY_NAME ${this.displayName}`
      );
    }
  }

  async _handleHandshakeReturned(contactGlobalPublicKey, content) {
    const [
      handshakeId,
      encryptedReceivingSymmetricKey,
      publicKeyIv,
      itsEncryptedPublicKey,
    ] = content.split(" ");
    console.log("HANDLE HANDSHAKE RETURNED: ", handshakeId);

    const foundHandshake = this.contactHandshakeSessions.find(
      (h) => h.handshakeId === handshakeId
    );

    const receivingSymmetricKey = await asymmetricDecrypt(
      encryptedReceivingSymmetricKey,
      foundHandshake.myPrivateKey
    );

    const itsPublicKey = await symmetricDecrypt(
      itsEncryptedPublicKey,
      receivingSymmetricKey,
      publicKeyIv
    );

    const symmetricKey = await generateSymmetricKey();
    const encryptedSymmetricKey = await asymmetricEncrypt(
      symmetricKey,
      itsPublicKey
    );
    const encryptedPublicKey = await symmetricEncrypt(
      itsPublicKey,
      symmetricKey
    );

    this.contacts.push({
      ...foundHandshake,
      itsGlobalPublicKey: contactGlobalPublicKey,
      itsPublicKey: itsPublicKey,
    });
    this.contactHandshakeSessions = this.contactHandshakeSessions.filter(
      (c) => c.handshakeId !== handshakeId
    );
    await this.connectivity.send(
      `${this.globalPublicKey} ${contactGlobalPublicKey} HANDSHAKE_CONFIRM ${handshakeId} ${encryptedSymmetricKey} ${encryptedPublicKey.iv} ${encryptedPublicKey.encrypted}`
    );
    await this.persistence.save(this);
  }

  async _handleHandshakeCreated(contactGlobalPublicKey, content) {
    const [
      handshakeId,
      encryptedReceivingSymmetricKey,
      publicKeyIv,
      itsEncryptedPublicKey,
    ] = content.split(" ");
    console.log("HANDLE HANDSHAKE CREATED: ", handshakeId);

    const receivingSymmetricKey = await asymmetricDecrypt(
      encryptedReceivingSymmetricKey,
      this.globalPrivateKey
    );

    const itsPublicKey = await symmetricDecrypt(
      itsEncryptedPublicKey,
      receivingSymmetricKey,
      publicKeyIv
    );

    const { publicKey, privateKey } = await generateKeypair();
    const contact = {
      handshakeId: handshakeId,
      status: "returned",
      itsGlobalPublicKey: contactGlobalPublicKey,
      myPublicKey: publicKey,
      myPrivateKey: privateKey,
      itsPublicKey: itsPublicKey,
    };
    this.contactHandshakeSessions.push(contact);
    const symmetricKey = await generateSymmetricKey();
    const encryptedSymmetricKey = await asymmetricEncrypt(
      symmetricKey,
      itsPublicKey
    );
    const encryptedPublicKey = await symmetricEncrypt(publicKey, symmetricKey);
    await this.connectivity.send(
      `${this.globalPublicKey} ${contactGlobalPublicKey} HANDSHAKE_RETURN ${handshakeId} ${encryptedSymmetricKey} ${encryptedPublicKey.iv} ${encryptedPublicKey.encrypted}`
    );
  }

  async sendMessage(contactGlobalPublicKey, content) {
    const envelope = {
      type: "simple-message",
      from: this.globalPublicKey,
      to: contactGlobalPublicKey,
      id: randomUUID(),
      content,
      createdAt: new Date(),
      deliveredAt: null,
      readAt: null,
    };
    this.envelopes.push(envelope);
    await this.sendToContact(
      contactGlobalPublicKey,
      `ENVELOPE ${JSON.stringify(envelope)}`
    );
    await this.persistence.save(this);
  }

  async sendToContact(contactGlobalPublicKey, content) {
    const contact = this.contacts.find(
      (c) => c.itsGlobalPublicKey === contactGlobalPublicKey
    );
    if (!contact) return console.error("Contact not found");
    const symmetricKey = await generateSymmetricKey();
    const encryptedSymmetricKey = await asymmetricEncrypt(
      symmetricKey,
      contact.itsPublicKey
    );
    const encryptedContent = await symmetricEncrypt(content, symmetricKey);
    await this.connectivity.send(
      `${this.globalPublicKey} ${contactGlobalPublicKey} CONTACT_MESSAGE ${encryptedSymmetricKey} ${encryptedContent.iv} ${encryptedContent.encrypted}`
    );
  }

  async onMessage(data) {
    const parts = data
      .trim()
      .split(" ")
      .map((part) => part.trim());
    const contactGlobalPublicKey = parts[0];
    const myGlobalPublicKey = parts[1];
    const verb = parts[2].replace(/gpk_/, "");
    const content = parts.slice(3).join(" ");
    switch (verb) {
      case "HANDSHAKE_CREATED":
        if (this.globalPublicKey !== myGlobalPublicKey) return;
        this._handleHandshakeCreated(contactGlobalPublicKey, content);
        break;
      case "HANDSHAKE_RETURN":
        if (this.globalPublicKey !== myGlobalPublicKey) return;
        this._handleHandshakeReturned(contactGlobalPublicKey, content);
        break;
      case "HANDSHAKE_CONFIRM":
        if (this.globalPublicKey !== myGlobalPublicKey) return;
        this._handleHandshakeConfirmed(contactGlobalPublicKey, content);
        break;
      case "CONTACT_MESSAGE":
        if (this.globalPublicKey !== myGlobalPublicKey) return;
        this._handleContactMessage(contactGlobalPublicKey, content);
        break;
    }
  }

  async setDisplayName(displayName) {
    this.displayName = displayName;
    await this.persistence.save(this);
  }

  async createHandshakeSession(contactGlobalPublicKey) {
    const { publicKey, privateKey } = await generateKeypair();
    const symmetricKey = await generateSymmetricKey();
    const handshakeId = randomUUID();
    const contact = {
      handshakeId,
      status: "created",
      createdAt: new Date(),
      itsGlobalPublicKey: contactGlobalPublicKey,
      myPublicKey: publicKey,
      myPrivateKey: privateKey,
    };
    this.contactHandshakeSessions.push(contact);
    const encryptedSymmetricKey = await asymmetricEncrypt(
      symmetricKey,
      contactGlobalPublicKey
    );
    const encryptedPublicKey = await symmetricEncrypt(publicKey, symmetricKey);
    await this.connectivity.send(
      `${this.globalPublicKey} ${contactGlobalPublicKey} HANDSHAKE_CREATED ${handshakeId} ${encryptedSymmetricKey} ${encryptedPublicKey.iv} ${encryptedPublicKey.encrypted}`
    );
  }
}

function arrayBufferToBase64(buffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64ToUint8Array(base64) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Uint8Array(bytes.buffer);
}

function randomUUID() {
  return window.crypto.randomUUID();
}

/**
 * Generates a symmetric key.
 * @returns {Promise<string>} The base64 encoded symmetric key.
 */
async function generateSymmetricKey() {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  return symmetricKeyToString(key);
}

/**
 * Generates a keypair. The keys are exported as base64 encoded strings
 */
async function generateKeypair() {
  const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: Uint8Array.from([0x01, 0x00, 0x01]),
      hash: "SHA-512",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return {
    publicKey: await publicKeyToString(publicKey),
    privateKey: await privateKeyToString(privateKey),
  };
}

async function publicKeyToString(key) {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

async function privateKeyToString(key) {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
}

async function symmetricKeyToString(key) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

async function stringToSymmetricKey(content) {
  return await window.crypto.subtle.importKey(
    "raw",
    base64ToArrayBuffer(content),
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function stringToPublicKey(content) {
  return await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(content),
    {
      name: "RSA-OAEP",
      hash: "SHA-512",
      modulusLength: 2048,
      publicExponent: Uint8Array.from([0x01, 0x00, 0x01]),
    },
    true,
    ["encrypt"]
  );
}

async function stringToPrivateKey(content) {
  return await window.crypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(content),
    {
      name: "RSA-OAEP",
      hash: "SHA-512",
      modulusLength: 2048,
      publicExponent: Uint8Array.from([0x01, 0x00, 0x01]),
    },
    true,
    ["decrypt"]
  );
}

/**
 * Symmetric key encryption
 * @param {string | ArrayBuffer} Content to be encrypted
 * @param {string} Key base 64 encoded symmetric key to encrypt the content with
 * @returns
 */
async function asymmetricEncrypt(content, key) {
  const parsedKey = await stringToPublicKey(key);
  const parsedContent =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  if (content.length > 126)
    throw new Error(`Content is too long (${content.length}): ${content}`);
  const encrypted = await window.crypto.subtle.encrypt(
    "RSA-OAEP",
    parsedKey,
    parsedContent
  );
  return arrayBufferToBase64(encrypted);
}

/**
 * Symmetrically encrypts the content
 * @param {string | ArrayBuffer} content to be encrypted
 * @param {string} key The base64 encoded symmetric key
 * @returns
 */
async function symmetricEncrypt(content, key) {
  const parsedKey = await stringToSymmetricKey(key);
  const parsedContent =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv,
    },
    parsedKey,
    parsedContent
  );
  const base64Iv = arrayBufferToBase64(iv);
  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: base64Iv,
  };
}

async function symmetricDecrypt(content, key, iv) {
  const parsedKey = await stringToSymmetricKey(key);
  const parsedIv = base64ToUint8Array(iv);
  const parsedContent =
    typeof content === "string" ? base64ToArrayBuffer(content) : content;
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: parsedIv,
    },
    parsedKey,
    parsedContent
  );
  return new TextDecoder().decode(decrypted);
}

async function asymmetricDecrypt(content, key) {
  const parsedKey = await stringToPrivateKey(key);
  const parsedContent =
    typeof content === "string" ? base64ToArrayBuffer(content) : content;
  const decrypted = await window.crypto.subtle.decrypt(
    "RSA-OAEP",
    parsedKey,
    parsedContent
  );
  return new TextDecoder().decode(decrypted);
}

let app = null;

async function onHandshake() {
  const itsPublicKey = document.getElementById("its-public-key").value;
  await app.createHandshakeSession(itsPublicKey);
}

async function onChangeDisplayName() {
  const newName = document.getElementById("my-display-name").value;
  await app.setDisplayName(newName);
}

async function onCopyKey() {
  navigator.clipboard.writeText(app.globalPublicKey);
}

async function onSendMessage() {
  const urlParams = new URLSearchParams(window.location.search);
  const selectedContactPublicKey = decodeURIComponent(urlParams.get("contact"));

  const message = document.getElementById("message").value.trim();
  if (!message) return;
  await app.sendMessage(selectedContactPublicKey, message);
  document.getElementById("message").value = "";
}

async function importSymmetricKeyFromPassword(password) {
  let encodedPassword = new TextEncoder().encode(password);
  if (encodedPassword.length > 32) {
    encodedPassword = encodedPassword.slice(0, 32);
  } else {
    if (encodedPassword.length !== 16) {
      if (encodedPassword.length < 16) {
        const diff = 16 - encodedPassword.length;
        encodedPassword = new Uint8Array([
          ...encodedPassword,
          ...new Uint8Array(diff).fill(0),
        ]);
      } else {
        const diff = 32 - encodedPassword.length;
        encodedPassword = new Uint8Array([
          ...encodedPassword,
          ...new Uint8Array(diff).fill(0),
        ]);
      }
    }
  }
  const key = await window.crypto.subtle.importKey(
    "raw",
    encodedPassword,
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  return symmetricKeyToString(key);
}

async function onLoadProfile() {
  const newName = document.getElementById("profile-password").value;
  const selectedProfileId = document.querySelector(
    'input[name="profile-index"]'
  ).value;
  if (selectedProfileId !== "new") {
    const profileId = parseInt(selectedProfileId);
    const key = await importSymmetricKeyFromPassword(newName);
    const profile = await Profile.loadProfile(profileId, key);
    const appPersistence = new AppPersistence(profile);
    app = await appPersistence.load();
    window.sessionStorage.setItem(
      "current-profile",
      JSON.stringify({ profileId, key })
    );
  } else {
    const key = await importSymmetricKeyFromPassword(newName);
    const profile = await Profile.newProfile(key);
    const appPersistence = new AppPersistence(profile);
    app = await appPersistence.load();
    window.sessionStorage.setItem(
      "current-profile",
      JSON.stringify({ profileId: profile.id, key })
    );
  }
}

setInterval(() => {
  if (app) {
    const unreadEnvelopes = app.envelopes.filter(
      (e) => e.to === app.globalPublicKey && !e.readAt
    ).length;

    if (unreadEnvelopes) {
      changeFavicon("favicon.ico");
    } else {
      changeFavicon(
        "data:image/x-icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAA////ACgfAQBjYi0AqHwDAEI5GwCHZAIAhGEYAEE4GgBeXCgAOzQNAMSNKAArIgEAKCABADozDABYVSQALiUDAH5dFgAqIQMAhYhHAP7+/QD/tjcAPjUXADQsCAC4iAMAPTQWAC8nBAAsIwEANSkEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbGxsbGxsAAAAAAAAAABsbBQIIGxINGxsAAAAAAAkbExsbGxsbGxsbGwAAABsDGxMbGxgGGxgGGxsbAAAbEBsTGxsbGwEbGwEbGwAbGxsXGxsbGwEbGBQbGxsbGwoMGxsbGxgBGwQBGxwbGxsbDxsbDhsbGxsbGxUVGwsbGxsaGxsbGxsbGxsRBxsVGxsbGxsbGxsbGxsbGxsbGxsbGxsbBQIIDBkNGxsbGxsAGxsbGxsbGxsbGxsbGxsAABsbGxsbGxsbGxsbGxsbAAAAGxsbGxsbGxsbGxsbAAAAAAAFDBsbGxsbGxYCAAAAAAAAAAAbGxsbGxsAAAAAAPgfAADgBwAAwAMAAIABAACAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAEAAIABAADAAwAA4AcAAPgfAAA="
      );
    }

    document.getElementById("friends").innerHTML = app.contacts
      .map((c) => {
        const isConnected = c.lastSeenAt && new Date() - c.lastSeenAt < 10000;
        const hasUnreadEnvelopes = app.envelopes.some(
          (e) => e.from === c.itsGlobalPublicKey && !e.readAt
        );

        const lastSeenAt =
          c.lastSeenAt && typeof c.lastSeenAt !== "string"
            ? `${
                c.lastSeenAt &&
                typeof c.lastSeenAt !== "string" &&
                c.lastSeenAt.toLocaleDateString()
              } ${
                c.lastSeenAt &&
                typeof c.lastSeenAt !== "string" &&
                c.lastSeenAt.toLocaleTimeString()
              }
        `
            : "";

        return `<li>
        <a href="?contact=${encodeURIComponent(c.itsGlobalPublicKey)}">
          <h3 class="${hasUnreadEnvelopes ? "unread" : ""}"><div class="${
          isConnected ? "connected" : "disconnected"
        }"></div> ${c.displayName || c.itsGlobalPublicKey}</h3>
          <span>
          ${lastSeenAt}
          </span>
        </a>
        </li>`;
      })
      .join("");
    document.getElementById("handshakes").innerHTML =
      app.contactHandshakeSessions
        .map((c) => `<li>${c.handshakeId}</li>`)
        .join("");
    document.getElementById("my-current-display-name").innerText =
      app.displayName;
    app.connectivity.getIsConnected().then((isConnected) => {
      document.getElementById("conn-status").innerHTML = `
        <div class="${isConnected ? "connected" : "disconnected"}"></div>
      `;
    });

    const urlParams = new URLSearchParams(window.location.search);
    const selectedContactPublicKey = decodeURIComponent(
      urlParams.get("contact")
    );

    if (selectedContactPublicKey) {
      if (document.hasFocus()) {
        const unreadEnvelopesInCurrentChat = app.envelopes.filter(
          (e) =>
            e.to === app.globalPublicKey &&
            e.from === selectedContactPublicKey &&
            !e.readAt
        );
        for (const envelope of unreadEnvelopesInCurrentChat) {
          app.setEnvelopeRead(envelope.id);
        }
      }
    }

    document.querySelector(".messages-box").innerHTML = app.envelopes
      .filter(
        (e) =>
          e.from === selectedContactPublicKey ||
          e.to === selectedContactPublicKey
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(
        (e) => `
      <div class="${e.from === app.globalPublicKey ? "sent" : "received"}">
        <div>
          <p>${messageToHtml(e.content)}</p>
          <span class="delivered ${e.deliveredAt ? "" : "not-delivered"} ${
          e.readAt ? "read" : ""
        }"></span>
        </div>
      </div>
      `
      )
      .join("");
  }
}, 500);

function changeFavicon(src) {
  document.head = document.head || document.getElementsByTagName("head")[0];
  var link = document.createElement("link"),
    oldLink = document.getElementById("dynamic-favicon");
  link.id = "dynamic-favicon";
  link.rel = "shortcut icon";
  link.href = src;
  if (oldLink) {
    document.head.removeChild(oldLink);
  }
  document.head.appendChild(link);
}

document.addEventListener("DOMContentLoaded", () => {
  const currentProfile = window.sessionStorage.getItem("current-profile");
  if (currentProfile) {
    const parsed = JSON.parse(currentProfile);
    Profile.loadProfile(parsed.profileId, parsed.key).then((profile) => {
      const appPersistence = new AppPersistence(profile);
      appPersistence.load().then((newApp) => {
        app = newApp;
      });
    });
  }

  document.getElementById("profiles").innerHTML =
    Profile.getProfiles()
      .map(
        (p) => `
<div class="radio-item">
<input
type="radio"
name="profile-index"
value="${p.id}"
id="profile-${p.id}"
/>
<label for="profile-${p.id}">Profile #${p.id}</label>
</div>
`
      )
      .join("") +
    `
    <div class="radio-item">
    <input
      type="radio"
      name="profile-index"
      value="new"
      id="profile-new"
    />
    <label for="profile-new">New profile</label>
  </div>`;
});
