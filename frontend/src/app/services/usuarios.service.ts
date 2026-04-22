import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import type { UsuarioActualizarDto, UsuarioCrearDto, UsuarioListaDto } from '../models/usuario.dto';

function demoAhora(): string {
  return new Date().toISOString();
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  /** Fallback si el backend no responde (modo demo). */
  private readonly demoUsuarios: UsuarioListaDto[] = [
    {
      id: 1,
      nombre: 'Capitán Demo',
      nombres: 'Capitán',
      apellidoPaterno: 'Demo',
      apellidoMaterno: 'Uno',
      rut: '11.111.111-1',
      rol: 'CAPITAN',
      email: 'capitan@bomberos.cl',
      telefono: null,
      activo: true,
      nacionalidad: 'Chilena',
      grupoSanguineo: 'O+',
      direccion: '—',
      region: 'Metropolitana',
      comuna: 'Santiago',
      actividad: 'Bombero',
      fechaNacimiento: null,
      fechaIngreso: null,
      tipoVoluntario: 'ACTIVO',
      cuerpoBombero: 'Primera',
      compania: '1',
      estadoVoluntario: 'VIGENTE',
      cargoOficialidad: 'CAPITAN_COMPANIA',
      observacionesRegistro: null,
      firmaImagen: null,
      createdAt: demoAhora(),
      updatedAt: demoAhora(),
    },
    {
      id: 2,
      nombre: 'Teniente Demo',
      nombres: 'Teniente',
      apellidoPaterno: 'Demo',
      apellidoMaterno: 'Dos',
      rut: '22.222.222-2',
      rol: 'TENIENTE',
      email: null,
      telefono: null,
      activo: true,
      nacionalidad: 'Chilena',
      grupoSanguineo: 'A+',
      direccion: '—',
      region: 'Metropolitana',
      comuna: 'Santiago',
      actividad: 'Bombero',
      fechaNacimiento: null,
      fechaIngreso: null,
      tipoVoluntario: 'ACTIVO',
      cuerpoBombero: 'Primera',
      compania: '1',
      estadoVoluntario: 'VIGENTE',
      cargoOficialidad: 'TENIENTE_PRIMERO',
      observacionesRegistro: null,
      firmaImagen: null,
      createdAt: demoAhora(),
      updatedAt: demoAhora(),
    },
    {
      id: 3,
      nombre: 'Voluntario Demo',
      nombres: 'Voluntario',
      apellidoPaterno: 'Demo',
      apellidoMaterno: 'Tres',
      rut: '33.333.333-3',
      rol: 'VOLUNTARIOS',
      email: null,
      telefono: null,
      activo: true,
      nacionalidad: 'Chilena',
      grupoSanguineo: 'B+',
      direccion: '—',
      region: 'Metropolitana',
      comuna: 'Santiago',
      actividad: 'Estudiante',
      fechaNacimiento: null,
      fechaIngreso: null,
      tipoVoluntario: 'ACTIVO',
      cuerpoBombero: 'Primera',
      compania: '1',
      estadoVoluntario: 'VIGENTE',
      cargoOficialidad: 'TENIENTE_CUARTO',
      observacionesRegistro: null,
      firmaImagen: null,
      createdAt: demoAhora(),
      updatedAt: demoAhora(),
    },
  ];

  listar(): Observable<UsuarioListaDto[]> {
    return this.http.get<UsuarioListaDto[]>('/api/usuarios').pipe(catchError(() => of(this.demoUsuarios)));
  }

  crear(payload: UsuarioCrearDto): Observable<UsuarioListaDto> {
    return this.http.post<UsuarioListaDto>('/api/usuarios', payload);
  }

  actualizar(id: number, payload: UsuarioActualizarDto): Observable<UsuarioListaDto> {
    return this.http.patch<UsuarioListaDto>(`/api/usuarios/${id}`, payload);
  }

  eliminar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/usuarios/${id}`);
  }
}
