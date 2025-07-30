import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = crypto
  .createHash('sha256')
  .update(String('TyoANLLIKdcJuBRwLUVw6mAZNQrbhR65'))
  .digest('base64')
  .substring(0, 32); // 256 bit key

const iv = crypto.randomBytes(16); // initialization vector

export function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const ivHex = iv.toString('hex');
  return `${ivHex}:${encrypted}`; // gabungkan IV dan hasil
}

export function decrypt(encryptedText) {
  const [ivHex, encrypted] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
