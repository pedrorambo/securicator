import { arrayBufferToBase64 } from "./arrayBufferToBase64";

export async function publicKeyToString(key: CryptoKey) {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}
