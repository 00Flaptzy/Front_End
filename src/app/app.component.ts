import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'AcademicFlow';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Configurar listener para cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Verificar autenticación en cada cambio de ruta
      this.verificarAutenticacion(event.url);
    });

    // Verificar autenticación inicial
    this.verificarAutenticacion(this.router.url);
  }

  private verificarAutenticacion(url: string): void {
    const rutasProtegidas = ['/dashboard'];
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    
    // Si intenta acceder a ruta protegida sin autenticación
    if (rutasProtegidas.some(ruta => url.includes(ruta))) {
      if (!token || !usuario) {
        console.warn('Acceso no autorizado a ruta protegida:', url);
        this.router.navigate(['/login']);
      }
    }
    
    // Si está autenticado y va al login/register, redirigir al dashboard
    if (token && usuario && (url === '/login' || url === '/register')) {
      console.log('Usuario ya autenticado, redirigiendo al dashboard...');
      this.router.navigate(['/dashboard']);
    }
  }
}