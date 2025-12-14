import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  remember = false;
  showPassword = false;
  error = '';
  loading = false;
  particles: any[] = [];
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateParticles();

    // Si ya está autenticado, redirigir al dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Cargar email guardado si existe
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      this.email = savedEmail;
      this.remember = true;
    }
  }

  generateParticles(): void {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        size: Math.random() * 8 + 2,
        color: `rgba(${Math.floor(Math.random() * 100 + 156)}, 
                ${Math.floor(Math.random() * 100 + 126)}, 
                ${Math.floor(Math.random() * 100 + 234)}, 
                ${Math.random() * 0.3 + 0.1})`,
        delay: Math.random() * 20,
        duration: Math.random() * 10 + 15
      });
    }
  }

  login(): void {
    // Validaciones
    if (!this.email.trim()) {
      this.error = 'Por favor, ingresa tu correo electrónico';
      return;
    }

    if (!this.password.trim()) {
      this.error = 'Por favor, ingresa tu contraseña';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.error = 'Por favor, ingresa un correo electrónico válido';
      return;
    }

    // Limpiar error y mostrar loading
    this.error = '';
    this.loading = true;

    // Usar AuthService para login
    this.authService.login(this.email, this.password).subscribe({
      next: (response: any) => {
        this.loading = false;
        
        console.log('✅ Login exitoso:', response);
        
        // Guardar preferencia de "Recordarme"
        if (this.remember) {
          localStorage.setItem('remember', 'true');
          localStorage.setItem('savedEmail', this.email);
        } else {
          localStorage.removeItem('remember');
          localStorage.removeItem('savedEmail');
        }
        
        // Redirigir al dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Error en login:', err);
        
        if (err.status === 401 || err.status === 400) {
          this.error = 'Correo o contraseña incorrectos';
        } else if (err.status === 0) {
          this.error = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        } else {
          this.error = 'Error en el servidor. Por favor, intenta más tarde.';
        }
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  forgotPassword(): void {
    if (!this.email.trim()) {
      this.error = 'Por favor, ingresa tu correo para recuperar tu contraseña';
      return;
    }

    this.loading = true;
    this.authService.forgotPassword(this.email).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.error = '';
        alert(`✅ Se ha enviado un enlace de recuperación a: ${this.email}`);
      },
      error: (err: any) => {
        this.loading = false;
        console.error('❌ Error en recuperación:', err);
        this.error = 'No se pudo enviar el correo de recuperación. Intenta nuevamente.';
      }
    });
  }

  signInWithGoogle(): void {
    alert('🔧 Login con Google estará disponible próximamente');
    // Implementación futura
  }

  clearError(): void {
    this.error = '';
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.loading) {
      this.login();
    }
  }
}