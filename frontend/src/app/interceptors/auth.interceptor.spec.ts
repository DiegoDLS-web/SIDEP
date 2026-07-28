import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: {} },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('no envía Authorization (cookie httpOnly)', () => {
    http.get('/api/ping').subscribe();
    const req = httpMock.expectOne('/api/ping');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('usa withCredentials en rutas /api', () => {
    http.get('/api/ping').subscribe();
    const req = httpMock.expectOne('/api/ping');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('no altera peticiones fuera de /api', () => {
    http.get('/assets/x.json').subscribe();
    const req = httpMock.expectOne('/assets/x.json');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });
});
