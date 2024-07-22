import { privateKeyToString } from "./privateKeyToString";
import { publicKeyToString } from "./publicKeyToString";
import { stringToPrivateKey } from "./stringToPrivateKey";

export async function generateKeypairFromPrivateKey(privateKeyText: string) {
  const parsedKey = await stringToPrivateKey(privateKeyText);

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
