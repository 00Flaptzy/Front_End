import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';

// Importar componentes
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  // Rutas públicas
  { 
    path: '', 
    component: HomeComponent,
    data: { title: 'AcademicFlow - Inicio' }
  },
  { 
    path: 'login', 
    component: LoginComponent,
    data: { title: 'AcademicFlow - Login' }
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    data: { title: 'AcademicFlow - Registro' }
  },
  
  // Rutas protegidas (requieren autenticación)
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { title: 'AcademicFlow - Dashboard' }
  },
  
  // Redirecciones
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'inicio', redirectTo: '', pathMatch: 'full' },
  
  // Ruta comodín (404)
  { 
    path: '**', 
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled',
    onSameUrlNavigation: 'reload'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }