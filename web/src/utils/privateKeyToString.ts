import { arrayBufferToBase64 } from "./arrayBufferToBase64";

export async function privateKeyToString(key: CryptoKey) {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
}
