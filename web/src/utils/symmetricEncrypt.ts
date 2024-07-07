import { arrayBufferToBase64 } from "./arrayBufferToBase64";
import { stringToSymmetricKey } from "./stringToSymmetricKey";

export async function symmetricEncrypt(content: any, key: any) {
  const parsedKey = await stringToSymmetricKey(key);
  const parsedContent =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv,
    },
    parsedKey,
    parsedContent
  );
  const base64Iv = arrayBufferToBase64(iv);
  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: base64Iv,
  };
}
