import { base64ToArrayBuffer } from "./base64ToArrayBuffer";

export async function stringToPublicKey(content: string) {
  return await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(content),
    {
      name: "RSA-OAEP",
      hash: "SHA-512",
      // @ts-ignore
      modulusLength: 2048,
      publicExponent: Uint8Array.from([0x01, 0x00, 0x01]),
    },
    true,
    ["encrypt"]
  );
}
