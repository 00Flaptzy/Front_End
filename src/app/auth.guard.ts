import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private router: Router) {}

  canActivate(): boolean {
    // Verificar si hay token en localStorage
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    
    if (token && usuario) {
      try {
        // Verificar que el token no esté expirado (ejemplo básico)
        const usuarioData = JSON.parse(usuario);
        if (!usuarioData || !usuarioData.id) {
          this.cleanStorageAndRedirect();
          return false;
        }
        return true;
      } catch (error) {
        this.cleanStorageAndRedirect();
        return false;
      }
    }
    
    // Redirigir al login si no está autenticado
    this.router.navigate(['/login']);
    return false;
  }

  private cleanStorageAndRedirect(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('sessionStart');
    this.router.navigate(['/login']);
  }
}