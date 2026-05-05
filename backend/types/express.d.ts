import type { JwtPayloadSidep } from '../lib/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadSidep;
    }
  }
}

export {};
