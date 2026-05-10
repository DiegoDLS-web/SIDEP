import { Injectable } from '@angular/core';

export type MotionProfile = 'SUAVE' | 'PREMIUM' | 'CINEMATICO';

@Injectable({ providedIn: 'root' })
export class MotionProfileService {
  private static readonly KEY = 'sidep_motion_profile';

  obtener(): MotionProfile {
    const raw = localStorage.getItem(MotionProfileService.KEY)?.trim().toUpperCase();
    if (raw === 'SUAVE' || raw === 'PREMIUM' || raw === 'CINEMATICO') {
      return raw;
    }
    return 'PREMIUM';
  }

  guardar(profile: MotionProfile): void {
    localStorage.setItem(MotionProfileService.KEY, profile);
    this.aplicar(profile);
  }

  aplicar(profile: MotionProfile = this.obtener()): void {
    const body = document.body;
    body.classList.remove('motion-suave', 'motion-premium', 'motion-cinematico');
    if (profile === 'SUAVE') body.classList.add('motion-suave');
    else if (profile === 'CINEMATICO') body.classList.add('motion-cinematico');
    else body.classList.add('motion-premium');
  }
}
