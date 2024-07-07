import { base64ToArrayBuffer } from "./base64ToArrayBuffer";
import { stringToPrivateKey } from "./stringToPrivateKey";

export async function asymmetricDecrypt(content: string, key: string) {
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
