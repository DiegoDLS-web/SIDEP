import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Encripta una contraseña en texto plano utilizando bcryptjs con 10 salt rounds.
 * 
 * @param password - Contraseña en texto plano a encriptar.
 * @returns Promesa que resuelve a la contraseña cifrada.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano con un hash de bcryptjs previamente guardado.
 * 
 * @param password - Contraseña en texto plano.
 * @param hash - Hash de la contraseña con la que comparar.
 * @returns Promesa que resuelve a true si coinciden, false de lo contrario.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
