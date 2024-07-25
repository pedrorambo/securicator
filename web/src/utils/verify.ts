import { base64ToArrayBuffer } from "./base64ToArrayBuffer";
import { hash } from "./hash";
import { stringToSignaturePublicKey } from "./stringToSignaturePublicKey";

export async function verify(content: string, key: string, signature: string) {
  const parsedSignarure = base64ToArrayBuffer(signature);
  const parsedKey = await stringToSignaturePublicKey(key);
  const parsedContent =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  const isVerified = await window.crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: "SHA-384",
    },
    parsedKey,
    parsedSignarure,
    parsedContent
  );
  return isVerified;
}
