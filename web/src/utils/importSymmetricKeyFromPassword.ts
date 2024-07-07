import { symmetricKeyToString } from "./symmetricKeyToString";

export async function importSymmetricKeyFromPassword(password: string) {
  let encodedPassword = new TextEncoder().encode(password);
  if (encodedPassword.length > 32) {
    encodedPassword = encodedPassword.slice(0, 32);
  } else {
    if (encodedPassword.length !== 16) {
      if (encodedPassword.length < 16) {
        const diff = 16 - encodedPassword.length;
        encodedPassword = new Uint8Array([
          // @ts-ignore
          ...encodedPassword,
          // @ts-ignore
          ...new Uint8Array(diff).fill(0),
        ]);
      } else {
        const diff = 32 - encodedPassword.length;
        encodedPassword = new Uint8Array([
          // @ts-ignore
          ...encodedPassword,
          // @ts-ignore
          ...new Uint8Array(diff).fill(0),
        ]);
      }
    }
  }
  const key = await window.crypto.subtle.importKey(
    "raw",
    encodedPassword,
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  return symmetricKeyToString(key);
}
