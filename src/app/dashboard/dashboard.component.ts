import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../environments/environment'; // ✅ AÑADE ESTA LÍNEA

interface Task {
  id: number;
  titulo: string;
  descripcion: string;
  fechaLimite: string;
  prioridad: string;
  completada: boolean;
  usuario?: any;
  horario?: any;
}

interface Horario {
  id: number;
  actividad: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  usuario?: any;
}

interface Alert {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'warning' | 'info' | 'success' | 'error';
  fecha: string;
  leida: boolean;
  icono: string;
}

interface DashboardData {
  tareas: Task[];
  horarios: Horario[];
  totalTareas: number;
  tareasCompletadas: number;
  porcentajeAvance: number;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  apellidos?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Usuario autenticado
  usuario: Usuario = { 
    id: 0, 
    nombre: 'Usuario', 
    email: '',
    rol: 'USER'
  };
  token: string = '';
  
  // Datos principales
  tareas: Task[] = [];
  horarios: Horario[] = [];
  alertas: Alert[] = [];
  
  // Estadísticas
  totalTareas: number = 0;
  tareasCompletadas: number = 0;
  tareasPendientes: number = 0;
  porcentajeAvance: number = 0;
  alertasCriticas: number = 0;
  alertasInfo: number = 0;
  
  // Tiempo
  tiempoActivo: string = '00:00:00';
  horaActual: string = '';
  fechaActual: string = '';
  sessionStartTime: number = Date.now();
  
  // Filtros
  filtroTarea: string = 'todas';
  filtroPrioridad: string = 'todas';
  filtroDia: string = 'todos';
  
  // Formularios
  nuevaTarea = {
    titulo: '',
    descripcion: '',
    fechaLimite: this.getTomorrowDate() + 'T09:00',
    prioridad: 'media',
    horarioId: null as number | null
  };
  
  nuevoHorario = {
    actividad: '',
    dia: 'LUNES',
    horaInicio: '08:00',
    horaFin: '10:00'
  };
  
  horarioEditando: any = null;
  
  // Estados UI
  loading: boolean = false;
  mostrarModalTarea: boolean = false;
  mostrarModalHorario: boolean = false;
  mostrarModalUsuario: boolean = false;
  mostrarModalGrafico: boolean = false;
  mostrarModalEditarHorario: boolean = false;
  backendOnline: boolean = true;
  
  // Configuración
  diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  horasDisponibles = [
    '06:00', '07:00', '08:00', '09:00', '10:00', 
    '11:00', '12:00', '13:00', '14:00', '15:00', 
    '16:00', '17:00', '18:00', '19:00', '20:00'
  ];
  
  // Notificaciones flotantes
  notificacionesFlotantes: any[] = [];
  
  // Subscripciones
  private timerSubscription!: Subscription;
  private updateSubscription!: Subscription;
  
  constructor(
    private http: HttpClient, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.initializeSession();
    this.cargarDashboard();
    this.iniciarActualizaciones();
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  // ========== AUTENTICACIÓN Y SESIÓN ==========
  private verificarAutenticacion(): void {
    const token = localStorage.getItem('token');
    const usuarioData = localStorage.getItem('usuario');
    
    if (!token || !usuarioData) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.token = token;
    this.usuario = JSON.parse(usuarioData);
    
    // Cargar datos completos del usuario desde el endpoint
    this.cargarUsuarioCompleto();
  }

  private cargarUsuarioCompleto(): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.get<Usuario>(`${environment.apiUrl}/usuarios/${this.usuario.id}`, { headers })
      .subscribe({
        next: (usuarioCompleto) => {
          this.usuario = usuarioCompleto;
          localStorage.setItem('usuario', JSON.stringify(usuarioCompleto));
        },
        error: (err) => {
          console.error('Error cargando usuario:', err);
        }
      });
  }

  private initializeSession(): void {
    this.sessionStartTime = Date.now();
    this.updateTiempoActivo();
    this.updateFechaHora();
    
    // Guardar hora de inicio
    localStorage.setItem('sessionStart', new Date().toISOString());
  }

  logout(): void {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }

  abrirModalUsuario(): void {
    this.mostrarModalUsuario = true;
  }

  abrirModalGrafico(): void {
    this.mostrarModalGrafico = true;
  }

  // ========== CARGA DE DATOS (BACKEND REAL) ==========
  cargarDashboard(): void {
    if (this.loading) return;
    
    this.loading = true;
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.get<DashboardData>(`${environment.apiUrl}/dashboard/${this.usuario.id}`, { headers })
      .subscribe({
        next: (data) => {
          this.tareas = data.tareas || [];
          this.horarios = data.horarios || [];
          this.totalTareas = data.totalTareas || 0;
          this.tareasCompletadas = data.tareasCompletadas || 0;
          this.tareasPendientes = this.totalTareas - this.tareasCompletadas;
          this.porcentajeAvance = data.porcentajeAvance || 0;
          
          this.backendOnline = true;
          this.generarAlertasAutomaticas();
          this.loading = false;
          this.cdr.detectChanges();
          
          // Mostrar notificación de éxito
          this.mostrarNotificacionFlotante('success', 'Dashboard cargado', 'Datos actualizados correctamente');
        },
        error: (err) => {
          console.error('Error cargando dashboard:', err);
          this.backendOnline = false;
          this.loading = false;
          this.cdr.detectChanges();
          this.mostrarNotificacionFlotante('error', 'Error de conexión', 'No se pudo conectar con el servidor');
        }
      });
  }

  cargarTareas(): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.get<Task[]>(`${environment.apiUrl}/tareas/usuario/${this.usuario.id}`, { headers })
      .subscribe({
        next: (tareas) => {
          this.tareas = tareas || [];
          this.actualizarEstadisticas();
          this.generarAlertasAutomaticas();
          this.cdr.detectChanges();
          this.mostrarNotificacionFlotante('success', 'Tareas actualizadas', `${tareas.length} tareas cargadas`);
        },
        error: (err) => {
          console.error('Error cargando tareas:', err);
          this.mostrarNotificacionFlotante('error', 'Error', 'No se pudieron cargar las tareas');
        }
      });
  }

  cargarHorarios(): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.get<Horario[]>(`${environment.apiUrl}/horarios/usuario/${this.usuario.id}`, { headers })
      .subscribe({
        next: (horarios) => {
          this.horarios = horarios || [];
          this.cdr.detectChanges();
          this.mostrarNotificacionFlotante('success', 'Horarios actualizados', `${horarios.length} horarios cargados`);
        },
        error: (err) => {
          console.error('Error cargando horarios:', err);
          this.mostrarNotificacionFlotante('error', 'Error', 'No se pudieron cargar los horarios');
        }
      });
  }

  // ========== CRUD TAREAS (BACKEND REAL) ==========
  crearTarea(): void {
    if (!this.nuevaTarea.titulo.trim()) {
      this.mostrarNotificacionFlotante('error', 'Error', 'El título es requerido');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // Formatear fecha para el backend
    const tareaData = {
      ...this.nuevaTarea,
      fechaLimite: new Date(this.nuevaTarea.fechaLimite).toISOString()
    };

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.post<Task>(`${environment.apiUrl}/tareas`, tareaData, { headers })
      .subscribe({
        next: (tareaCreada) => {
          this.tareas.unshift(tareaCreada);
          this.actualizarEstadisticas();
          this.mostrarModalTarea = false;
          this.resetearFormularioTarea();
          this.generarAlertasAutomaticas();
          this.cdr.detectChanges();
          
          this.mostrarNotificacionFlotante('success', 'Tarea creada', `"${tareaCreada.titulo}" creada correctamente`);
        },
        error: (err) => {
          console.error('Error creando tarea:', err);
          this.mostrarNotificacionFlotante('error', 'Error', 'No se pudo crear la tarea: ' + err.error?.message);
        }
      });
  }

  completarTarea(tareaId: number): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.put(`${environment.apiUrl}/tareas/${tareaId}/completar`, {}, { headers })
      .subscribe({
        next: () => {
          const tarea = this.tareas.find(t => t.id === tareaId);
          if (tarea) {
            tarea.completada = true;
            this.actualizarEstadisticas();
            this.generarAlertasAutomaticas();
            this.cdr.detectChanges();
            
            this.mostrarNotificacionFlotante('success', '¡Excelente!', `Tarea "${tarea.titulo}" completada`);
          }
        },
        error: (err) => {
          console.error('Error completando tarea:', err);
          this.mostrarNotificacionFlotante('error', 'Error', 'No se pudo completar la tarea');
        }
      });
  }

  // ========== CRUD HORARIOS (BACKEND REAL) ==========
  crearHorario(): void {
    if (!this.nuevoHorario.actividad.trim()) {
      this.mostrarNotificacionFlotante('error', 'Error', 'La actividad es requerida');
      return;
    }

    if (this.nuevoHorario.horaInicio >= this.nuevoHorario.horaFin) {
      this.mostrarNotificacionFlotante('error', 'Error', 'La hora de inicio debe ser anterior a la hora de fin');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.post<Horario>(`${environment.apiUrl}/horarios`, this.nuevoHorario, { headers })
      .subscribe({
        next: (horarioCreado) => {
          this.horarios.push(horarioCreado);
          this.mostrarModalHorario = false;
          this.resetearFormularioHorario();
          this.cdr.detectChanges();
          
          this.mostrarNotificacionFlotante('success', 'Horario creado', `"${horarioCreado.actividad}" creado correctamente`);
        },
        error: (err) => {
          console.error('Error creando horario:', err);
          this.mostrarNotificacionFlotante('error', 'Error', 'No se pudo crear el horario: ' + err.error?.message);
        }
      });
  }

  abrirModalEditarHorario(horario: Horario): void {
    this.horarioEditando = { ...horario };
    this.mostrarModalEditarHorario = true;
  }

  actualizarHorario(): void {
    if (!this.horarioEditando.actividad.trim()) {
      this.mostrarNotificacionFlotante('error', 'Error', 'La actividad es requerida');
      return;
    }

    if (this.horarioEditando.horaInicio >= this.horarioEditando.horaFin) {
      this.mostrarNotificacionFlotante('error', 'Error', 'La hora de inicio debe ser anterior a la hora de fin');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.put<Horario>(`${environment.apiUrl}/horarios/${this.horarioEditando.id}`, this.horarioEditando, { headers })
      .subscribe({
        next: (horarioActualizado) => {
          const index = this.horarios.findIndex(h => h.id === horarioActualizado.id);
          if (index !== -1) {
            this.horarios[index] = horarioActualizado;
          }
          this.mostrarModalEditarHorario = false;
          this.horarioEditando = null;
          this.cdr.detectChanges();
          
          this.mostrarNotificacionFlotante('success', 'Horario actualizado', `"${horarioActualizado.actividad}" actualizado correctamente`);
        },
        error: (err) => {
          console.error('Error actualizando horario:', err);
          this.mostrarNotificacionFlotante('error', 'Error', 'No se pudo actualizar el horario');
        }
      });
  }

  eliminarHorario(horarioId: number): void {
    if (!confirm('¿Estás seguro de eliminar este horario?')) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

    // ✅ CAMBIADO: Usa environment.apiUrl
    this.http.delete(`${environment.apiUrl}/horarios/${horarioId}`, { headers })
      .subscribe({
        next: () => {
          this.horarios = this.horarios.filter(h => h.id !== horarioId);
          this.cdr.detectChanges();
          
          this.mostrarNotificacionFlotante('info', 'Horario eliminado', 'Horario eliminado correctamente');
        },
        error: (err) => {
          console.error('Error eliminando horario:', err);
          this.mostrarNotificacionFlotante('error', 'Error', 'No se pudo eliminar el horario');
        }
      });
  }

  // ========== NOTIFICACIONES FLOTANTES ==========
  mostrarNotificacionFlotante(tipo: 'success' | 'error' | 'info' | 'warning', titulo: string, mensaje: string): void {
    const notificacion = {
      id: Date.now(),
      tipo,
      titulo,
      mensaje,
      icono: this.getIconoNotificacion(tipo),
      visible: true
    };
    
    this.notificacionesFlotantes.unshift(notificacion);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
      this.eliminarNotificacionFlotante(notificacion.id);
    }, 5000);
    
    // Limitar a 5 notificaciones
    if (this.notificacionesFlotantes.length > 5) {
      this.notificacionesFlotantes.pop();
    }
    
    this.cdr.detectChanges();
  }

  eliminarNotificacionFlotante(id: number): void {
    const index = this.notificacionesFlotantes.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notificacionesFlotantes[index].visible = false;
      
      setTimeout(() => {
        this.notificacionesFlotantes = this.notificacionesFlotantes.filter(n => n.id !== id);
        this.cdr.detectChanges();
      }, 300);
    }
  }

  private getIconoNotificacion(tipo: string): string {
    switch (tipo) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }

  // ========== ALERTAS DEL SISTEMA ==========
  private generarAlertasAutomaticas(): void {
    this.alertas = []; // Limpiar alertas anteriores
    
    const hoy = new Date();
    
    // 1. Tareas próximas a vencer (próximas 24 horas)
    const tareasProximas = this.tareas.filter(tarea => {
      if (tarea.completada) return false;
      
      const fechaLimite = new Date(tarea.fechaLimite);
      const diferenciaHoras = (fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60);
      
      return diferenciaHoras > 0 && diferenciaHoras <= 24;
    });
    
    if (tareasProximas.length > 0) {
      this.agregarAlerta(
        'warning',
        'alert',
        'Tareas próximas a vencer',
        `Tienes ${tareasProximas.length} tarea(s) que vencen en las próximas 24 horas`
      );
    }
    
    // 2. Tareas de alta prioridad pendientes
    const tareasAltaPrioridad = this.tareas.filter(t => 
      !t.completada && t.prioridad === 'alta'
    );
    
    if (tareasAltaPrioridad.length > 0) {
      this.agregarAlerta(
        'warning',
        'priority_high',
        'Tareas de alta prioridad',
        `Tienes ${tareasAltaPrioridad.length} tarea(s) de alta prioridad pendientes`
      );
    }
    
    // 3. Tareas vencidas
    const tareasVencidas = this.tareas.filter(tarea => {
      if (tarea.completada) return false;
      
      const fechaLimite = new Date(tarea.fechaLimite);
      return fechaLimite < hoy;
    });
    
    if (tareasVencidas.length > 0) {
      this.agregarAlerta(
        'error',
        'error',
        'Tareas vencidas',
        `Tienes ${tareasVencidas.length} tarea(s) vencidas`
      );
    }
    
    // 4. Alerta informativa del sistema
    this.agregarAlerta(
      'info',
      'info',
      'Sistema activo',
      `Bienvenido ${this.usuario.nombre}, tienes ${this.tareasPendientes} tareas pendientes`
    );
    
    this.actualizarContadoresAlertas();
    this.cdr.detectChanges();
  }

  private agregarAlerta(tipo: 'warning' | 'info' | 'success' | 'error', icono: string, titulo: string, mensaje: string): void {
    const nuevaAlerta: Alert = {
      id: Date.now(),
      titulo,
      mensaje,
      tipo,
      fecha: new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit'
      }),
      leida: false,
      icono
    };
    
    this.alertas.unshift(nuevaAlerta);
    
    // Mantener máximo 10 alertas
    if (this.alertas.length > 10) {
      this.alertas.pop();
    }
  }

  eliminarAlerta(alertaId: number): void {
    this.alertas = this.alertas.filter(a => a.id !== alertaId);
    this.actualizarContadoresAlertas();
    this.cdr.detectChanges();
  }

  private actualizarContadoresAlertas(): void {
    this.alertasCriticas = this.alertas.filter(a => a.tipo === 'warning' || a.tipo === 'error').length;
    this.alertasInfo = this.alertas.filter(a => a.tipo === 'info' || a.tipo === 'success').length;
  }

  // ========== UTILIDADES ==========
  private actualizarEstadisticas(): void {
    this.totalTareas = this.tareas.length;
    this.tareasCompletadas = this.tareas.filter(t => t.completada).length;
    this.tareasPendientes = this.totalTareas - this.tareasCompletadas;
    this.porcentajeAvance = this.totalTareas > 0 
      ? Math.round((this.tareasCompletadas / this.totalTareas) * 100) 
      : 0;
  }

  get tareasFiltradas(): Task[] {
    let filtradas = [...this.tareas];
    
    // Filtrar por estado
    if (this.filtroTarea === 'pendientes') {
      filtradas = filtradas.filter(t => !t.completada);
    } else if (this.filtroTarea === 'completadas') {
      filtradas = filtradas.filter(t => t.completada);
    }
    
    // Filtrar por prioridad
    if (this.filtroPrioridad !== 'todas') {
      filtradas = filtradas.filter(t => t.prioridad === this.filtroPrioridad);
    }
    
    // Ordenar: primero pendientes, luego por fecha límite
    return filtradas.sort((a, b) => {
      if (a.completada !== b.completada) {
        return a.completada ? 1 : -1;
      }
      
      const fechaA = new Date(a.fechaLimite);
      const fechaB = new Date(b.fechaLimite);
      
      return fechaA.getTime() - fechaB.getTime();
    });
  }

  get horariosPorDia(): { [key: string]: Horario[] } {
    const agrupados: { [key: string]: Horario[] } = {};
    
    this.diasSemana.forEach(dia => {
      agrupados[dia] = this.horarios.filter(h => h.dia === dia)
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    });
    
    return agrupados;
  }

  getColorPrioridad(prioridad: string): string {
    switch (prioridad?.toLowerCase()) {
      case 'alta': return '#f56565';
      case 'media': return '#ed8936';
      case 'baja': return '#48bb78';
      default: return '#a0aec0';
    }
  }

  getNombreDia(dia: string): string {
    const diasMap: { [key: string]: string } = {
      'LUNES': 'Lunes',
      'MARTES': 'Martes',
      'MIERCOLES': 'Miércoles',
      'JUEVES': 'Jueves',
      'VIERNES': 'Viernes',
      'SABADO': 'Sábado',
      'DOMINGO': 'Domingo'
    };
    return diasMap[dia] || dia;
  }

  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      const hoy = new Date();
      const manana = new Date(hoy);
      manana.setDate(hoy.getDate() + 1);
      
      // Si es hoy
      if (date.toDateString() === hoy.toDateString()) {
        return 'Hoy ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      
      // Si es mañana
      if (date.toDateString() === manana.toDateString()) {
        return 'Mañana ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }

  getDuracionHorario(horaInicio: string, horaFin: string): string {
    const inicio = horaInicio.split(':');
    const fin = horaFin.split(':');
    
    const horasInicio = parseInt(inicio[0]);
    const minutosInicio = parseInt(inicio[1]);
    const horasFin = parseInt(fin[0]);
    const minutosFin = parseInt(fin[1]);
    
    const totalMinutosInicio = horasInicio * 60 + minutosInicio;
    const totalMinutosFin = horasFin * 60 + minutosFin;
    const diferenciaMinutos = totalMinutosFin - totalMinutosInicio;
    
    const horas = Math.floor(diferenciaMinutos / 60);
    const minutos = diferenciaMinutos % 60;
    
    if (horas > 0 && minutos > 0) {
      return `${horas}h ${minutos}m`;
    } else if (horas > 0) {
      return `${horas}h`;
    } else {
      return `${minutos}m`;
    }
  }

  // MÉTODOS PARA HORARIO VISUAL
  calcularPosicion(horaInicio: string): string {
    const [horas, minutos] = horaInicio.split(':').map(Number);
    // Asumimos que el horario comienza a las 7:00 AM
    const horaBase = 7;
    const posicion = ((horas - horaBase) * 60 + minutos) * 1.5; // 1.5px por minuto
    return `${posicion}px`;
  }

  calcularAltura(horaInicio: string, horaFin: string): string {
    const [inicioH, inicioM] = horaInicio.split(':').map(Number);
    const [finH, finM] = horaFin.split(':').map(Number);
    
    const inicioTotal = inicioH * 60 + inicioM;
    const finTotal = finH * 60 + finM;
    const duracion = finTotal - inicioTotal;
    
    return `${duracion * 1.5}px`; // 1.5px por minuto
  }

  resetearFormularioTarea(): void {
    this.nuevaTarea = {
      titulo: '',
      descripcion: '',
      fechaLimite: this.getTomorrowDate() + 'T09:00',
      prioridad: 'media',
      horarioId: null
    };
  }

  resetearFormularioHorario(): void {
    this.nuevoHorario = {
      actividad: '',
      dia: 'LUNES',
      horaInicio: '08:00',
      horaFin: '10:00'
    };
  }

  // ========== TIEMPO Y FECHA ==========
  private updateTiempoActivo(): void {
    const ahora = Date.now();
    const diff = ahora - this.sessionStartTime;
    
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);
    
    this.tiempoActivo = 
      `${horas.toString().padStart(2, '0')}:` +
      `${minutos.toString().padStart(2, '0')}:` +
      `${segundos.toString().padStart(2, '0')}`;
  }

  private updateFechaHora(): void {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    this.fechaActual = ahora.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // ========== HELPERS DE FECHAS ==========
  private getTomorrowDate(): string {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return manana.toISOString().split('T')[0];
  }

  // ========== ACTUALIZACIONES AUTOMÁTICAS ==========
  private iniciarActualizaciones(): void {
    // Actualizar tiempo cada segundo
    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateTiempoActivo();
      this.updateFechaHora();
    });

    // Actualizar dashboard cada 2 minutos
    this.updateSubscription = interval(120000).subscribe(() => {
      this.cargarDashboard();
    });
  }

  // ========== FUNCIONES PÚBLICAS ==========
  getEstadoSistema(): string {
    return this.backendOnline ? 'Conectado' : 'Desconectado';
  }

  getColorEstado(): string {
    return this.backendOnline ? '#48bb78' : '#f56565';
  }

  getTotalHorarios(): number {
    return this.horarios.length;
  }

  getDiaMasOcupado(): string {
    if (this.horarios.length === 0) return 'Sin horarios';
    
    const conteoDias: { [key: string]: number } = {};
    this.horarios.forEach(horario => {
      conteoDias[horario.dia] = (conteoDias[horario.dia] || 0) + 1;
    });
    
    const diaMasOcupado = Object.keys(conteoDias).reduce((a, b) => 
      conteoDias[a] > conteoDias[b] ? a : b
    );
    
    return this.getNombreDia(diaMasOcupado);
  }

  getHorasTotalesEstudio(): number {
    let totalHoras = 0;
    this.horarios.forEach(horario => {
      const inicio = parseInt(horario.horaInicio.split(':')[0]);
      const fin = parseInt(horario.horaFin.split(':')[0]);
      totalHoras += (fin - inicio);
    });
    return totalHoras;
  }

  getNombreCompleto(): string {
    const apellido = this.usuario.apellidos || '';
    return `${this.usuario.nombre} ${apellido}`.trim();
  }

  getPromedioDiario(): number {
    const tareasCompletadasUltimaSemana = this.tareas.filter(t => {
      if (!t.completada) return false;
      const fechaCompletada = new Date(t.fechaLimite);
      const hoy = new Date();
      const diferenciaDias = (hoy.getTime() - fechaCompletada.getTime()) / (1000 * 60 * 60 * 24);
      return diferenciaDias <= 7;
    }).length;
    
    return Math.round(tareasCompletadasUltimaSemana / 7 * 10) / 10;
  }
}