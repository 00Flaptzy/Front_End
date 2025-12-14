import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    
    let authReq = req;
    
    // Si hay token, agregarlo a los headers
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Manejar errores 401 (No autorizado)
        if (error.status === 401) {
          console.warn('Token inválido o expirado, cerrando sesión...');
          
          // Limpiar localStorage
          localStorage.clear();
          
          // Redirigir al login
          this.router.navigate(['/login']);
        }
        
        return throwError(() => error);
      })
    );
  }
}