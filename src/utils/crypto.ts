// Утилиты для шифрования/дешифрования данных с помощью AES-GCM и PBKDF2
// Используется для защиты пользовательских данных пин-кодом

export async function deriveKey(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: string, pin: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(data)
  );
  // Сохраняем salt, iv и ciphertext в base64 через JSON
  return btoa(
    JSON.stringify({
      salt: Array.from(salt),
      iv: Array.from(iv),
      ct: Array.from(new Uint8Array(ciphertext)),
    })
  );
}

export async function decryptData(
  encrypted: string,
  pin: string
): Promise<string> {
  const dec = new TextDecoder();
  const { salt, iv, ct } = JSON.parse(atob(encrypted));
  const key = await deriveKey(pin, new Uint8Array(salt));
  const plaintext = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(ct)
  );
  return dec.decode(plaintext);
}
