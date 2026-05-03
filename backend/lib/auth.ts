import jwt from 'jsonwebtoken';

export type JwtPayloadSidep = {
  sub: string;
  uid: number;
  rol: string;
  nombre: string;
  email?: string | null;
};

const JWT_SECRET = process.env.JWT_SECRET || 'sidep_dev_secret_change_me';
const JWT_EXP_SECONDS = Number(process.env.JWT_EXP_SECONDS || 60 * 60 * 12);

export function firmarToken(payload: JwtPayloadSidep): string {
  const exp = Math.floor(Date.now() / 1000) + JWT_EXP_SECONDS;
  return jwt.sign({ ...payload, exp }, JWT_SECRET as jwt.Secret);
}

export function verificarToken(token: string): JwtPayloadSidep {
  return jwt.verify(token, JWT_SECRET) as JwtPayloadSidep;
}
