import { base64ToArrayBuffer } from "./base64ToArrayBuffer";

export async function stringToSignaturePublicKey(content: string) {
  return await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(content),
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["verify"]
  );
}
