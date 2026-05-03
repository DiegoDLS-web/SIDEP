import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const authState = { token: null as string | null };
  const authStub = {
    get token() {
      return authState.token;
    },
  };

  beforeEach(() => {
    authState.token = null;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authStub },
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

  it('no envía Authorization si no hay token', () => {
    http.get('/api/ping').subscribe();
    const req = httpMock.expectOne('/api/ping');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('añade Authorization Bearer cuando hay token', () => {
    authState.token = 'mi-jwt';
    http.get('/api/ping').subscribe();
    const req = httpMock.expectOne('/api/ping');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mi-jwt');
    req.flush({});
  });
});
