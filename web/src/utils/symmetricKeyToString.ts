import { arrayBufferToBase64 } from "./arrayBufferToBase64";

export async function symmetricKeyToString(key: any) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}
