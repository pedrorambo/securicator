import { base64ToArrayBuffer } from "./base64ToArrayBuffer";
import { base64ToUint8Array } from "./base64ToUint8Array";
import { stringToSymmetricKey } from "./stringToSymmetricKey";

export async function symmetricDecrypt(content: any, key: any, iv: any) {
  const parsedKey = await stringToSymmetricKey(key);
  const parsedIv = base64ToUint8Array(iv);
  const parsedContent =
    typeof content === "string" ? base64ToArrayBuffer(content) : content;
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: parsedIv,
    },
    parsedKey,
    parsedContent
  );
  return new TextDecoder().decode(decrypted);
}
