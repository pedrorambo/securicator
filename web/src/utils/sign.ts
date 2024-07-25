import { arrayBufferToBase64 } from "./arrayBufferToBase64";
import { hash } from "./hash";
import { stringToSignaturePrivateKey } from "./stringToSignaturePrivateKey";

export async function sign(content: string, key: string) {
  const parsedKey = await stringToSignaturePrivateKey(key);
  const parsedContent =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  const signature = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-384",
    },
    parsedKey,
    parsedContent
  );
  return arrayBufferToBase64(signature);
}
