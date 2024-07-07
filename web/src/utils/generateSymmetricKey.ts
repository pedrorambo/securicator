import { symmetricKeyToString } from "./symmetricKeyToString";

export async function generateSymmetricKey() {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  return symmetricKeyToString(key);
}
