import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';

interface LoginResponse {
  token: string;
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

interface RegisterRequest {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ⬇️⬇️⬇️ CAMBIA ESTA LÍNEA ⬇️⬇️⬇️
  private apiUrl = `${environment.apiUrl}/auth`; // <-- USA EL ENVIRONMENT
  // ⬆️⬆️⬆️ CAMBIA ESTA LÍNEA ⬆️⬆️⬆️
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // ========== LOGIN ==========
  login(email: string, password: string): Observable<LoginResponse> {
    const loginData = { email, password };
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginData).pipe(
      tap(response => {
        if (response && response.token) {
          // Guardar datos en localStorage
          localStorage.setItem('token', response.token);
          localStorage.setItem('usuario', JSON.stringify({
            id: response.id,
            nombre: response.nombre,
            email: response.email,
            rol: response.rol
          }));
          
          // Guardar hora de inicio de sesión
          localStorage.setItem('sessionStart', new Date().toISOString());
          
          console.log('✅ Login exitoso, usuario:', response.nombre);
        }
      }),
      catchError(error => {
        console.error('❌ Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== REGISTRO ==========
  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(response => {
        console.log('✅ Registro exitoso:', response);
      }),
      catchError(error => {
        console.error('❌ Error en registro:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== VERIFICACIÓN DE AUTENTICACIÓN ==========
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    
    if (!token || !usuario) {
      return false;
    }
    
    try {
      const usuarioData = JSON.parse(usuario);
      return !!(usuarioData && usuarioData.id);
    } catch {
      return false;
    }
  }

  getCurrentUser(): any {
    const usuario = localStorage.getItem('usuario');
    if (usuario) {
      try {
        return JSON.parse(usuario);
      } catch {
        return null;
      }
    }
    return null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // ========== LOGOUT ==========
  logout(): void {
    console.log('🔒 Cerrando sesión...');
    
    // Limpiar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('sessionStart');
    localStorage.removeItem('remember');
    localStorage.removeItem('savedEmail');
    
    // Redirigir al login con delay para evitar errores
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 100);
  }

  // ========== RECUPERACIÓN DE CONTRASEÑA ==========
  forgotPassword(email: string): Observable<any> {
    // Implementar cuando tengas el endpoint en el backend
    console.log('📧 Solicitando recuperación para:', email);
    
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ success: true, message: 'Correo enviado (simulado)' });
        observer.complete();
      }, 1000);
    });
  }
}