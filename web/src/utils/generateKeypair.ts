import { privateKeyToString } from "./privateKeyToString";
import { publicKeyToString } from "./publicKeyToString";

export async function generateKeypair() {
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
