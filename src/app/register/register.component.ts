import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  nombre = '';
  apellidos = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  particles: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateParticles();
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  generateParticles(): void {
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        size: Math.random() * 6 + 2,
        color: `rgba(${Math.floor(Math.random() * 100 + 126)}, 
                ${Math.floor(Math.random() * 100 + 234)}, 
                ${Math.floor(Math.random() * 100 + 102)}, 
                ${Math.random() * 0.3 + 0.1})`,
        delay: Math.random() * 15,
        duration: Math.random() * 8 + 12
      });
    }
  }

  register(): void {
    if (!this.nombre.trim()) {
      this.error = 'Por favor, ingresa tu nombre';
      return;
    }
    if (!this.apellidos.trim()) {
      this.error = 'Por favor, ingresa tus apellidos';
      return;
    }
    if (!this.email.trim()) {
      this.error = 'Por favor, ingresa tu correo electrónico';
      return;
    }
    if (!this.password.trim()) {
      this.error = 'Por favor, ingresa tu contraseña';
      return;
    }
    if (!this.confirmPassword.trim()) {
      this.error = 'Por favor, confirma tu contraseña';
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.error = 'Por favor, ingresa un correo electrónico válido';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.error = '';
    this.success = '';
    this.loading = true;

    const registerData = {
      nombre: this.nombre,
      apellidos: this.apellidos,
      email: this.email,
      password: this.password
    };

    this.authService.register(registerData).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.success = '¡Registro exitoso! Redirigiendo al login...';
        console.log('✅ Registro exitoso:', response);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Error en registro:', err);
        if (err.status === 409) {
          this.error = 'El correo electrónico ya está registrado';
        } else if (err.status === 400) {
          this.error = 'Datos inválidos. Verifica la información.';
        } else if (err.status === 0) {
          this.error = 'No se pudo conectar con el servidor';
        } else {
          this.error = 'Error en el registro. Intenta nuevamente.';
        }
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.loading) {
      this.register();
    }
  }

  clearError(): void {
    this.error = '';
  }
}