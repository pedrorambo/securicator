import { privateKeyToString } from "./privateKeyToString";
import { publicKeyToString } from "./publicKeyToString";

export async function generateSignatureKeyPair() {
  const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["sign", "verify"]
  );
  return {
    publicKey: await publicKeyToString(publicKey),
    privateKey: await privateKeyToString(privateKey),
  };
}
