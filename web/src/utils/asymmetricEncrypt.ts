import { arrayBufferToBase64 } from "./arrayBufferToBase64";
import { stringToPublicKey } from "./stringToPublicKey";

export async function asymmetricEncrypt(content: string, key: string) {
  const parsedKey = await stringToPublicKey(key);
  const parsedContent =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  if (content.length > 126)
    throw new Error(`Content is too long (${content.length}): ${content}`);
  const encrypted = await window.crypto.subtle.encrypt(
    "RSA-OAEP",
    parsedKey,
    parsedContent
  );
  return arrayBufferToBase64(encrypted);
}
