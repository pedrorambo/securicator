import { base64ToArrayBuffer } from "./base64ToArrayBuffer";

export async function stringToSymmetricKey(content: any) {
  return await window.crypto.subtle.importKey(
    "raw",
    base64ToArrayBuffer(content),
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}
