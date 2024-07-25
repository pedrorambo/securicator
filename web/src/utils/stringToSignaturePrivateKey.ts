import { base64ToArrayBuffer } from "./base64ToArrayBuffer";

export async function stringToSignaturePrivateKey(content: string) {
  return await window.crypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(content),
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["sign"]
  );
}
