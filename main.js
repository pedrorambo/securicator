const crypto = window.crypto.subtle;

function arrayBufferToBase64(buffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function generateSymmetricKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function generateKeypair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: Uint8Array.from([0x01, 0x00, 0x01]),
      hash: "SHA-512",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function asymmetricEncrypt(content, key) {
  return await window.crypto.subtle.encrypt("RSA-OAEP", key, content);
}

async function symmetricEncrypt(content, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv,
    },
    key,
    content
  );
  return {
    encrypted,
    iv,
  };
}

async function symmetricDecrypt(content, key, iv) {
  return await window.crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv,
    },
    key,
    content
  );
}

async function asymmetricDecrypt(content, key) {
  return await window.crypto.subtle.decrypt("RSA-OAEP", key, content);
}

async function main() {
  const { publicKey, privateKey } = await generateKeypair();
  const symmetricKey = await generateSymmetricKey();
  const exported = await window.crypto.subtle.exportKey("raw", symmetricKey);
  const symmetricEncrypted = await symmetricEncrypt(
    new TextEncoder().encode("aab"),
    symmetricKey
  );
  console.log(
    await symmetricDecrypt(
      symmetricEncrypted.encrypted,
      symmetricKey,
      symmetricEncrypted.iv
    )
  );
  // Max payload is 126 bytes
  // 32 is used for the key
  const encrypted = await asymmetricEncrypt(exported, publicKey);
  const decrypted = await asymmetricDecrypt(encrypted, privateKey);
}

main();
