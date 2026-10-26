import Swal from 'sweetalert2';

export class SweetAlert {
  /**
   * Muestra una ventana de confirmación con texto dinámico y botones Sí/No.
   * Devuelve true si el usuario confirma, false si cancela o cierra.
   */
  static async confirmar(texto: string, titulo = '¿Estás seguro?'): Promise<boolean> {
    const result = await Swal.fire({
      title: titulo,
      text: texto,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      allowOutsideClick: false,
      customClass: this.customClass(),   // <-- AGREGADO
    });
    return result.isConfirmed;
  }

  static customClass() {
    return {
      confirmButton: 'vet-swal-btn-si',
      cancelButton: 'vet-swal-btn-no',
    };
  }

  /**
   * Muestra una ventana de aviso/información con texto dinámico y botón Aceptar.
   */
  static async avisar(texto: string, titulo = 'Aviso'): Promise<void> {
    await Swal.fire({
      title: titulo,
      text: texto,
      icon: 'info',
      confirmButtonText: 'Aceptar',
      allowOutsideClick: false,
    });
  }

  /**
   * Muestra una ventana de éxito con texto dinámico y botón Aceptar.
   */
  static async exito(texto: string, titulo = 'Éxito'): Promise<void> {
    await Swal.fire({
      title: titulo,
      text: texto,
      icon: 'success',
      confirmButtonText: 'Aceptar',
      allowOutsideClick: false,
    });
  }

  /**
   * Muestra una ventana de error con texto dinámico y botón Aceptar.
   */
  static async error(texto: string, titulo = 'Error'): Promise<void> {
    await Swal.fire({
      title: titulo,
      text: texto,
      icon: 'error',
      confirmButtonText: 'Aceptar',
      allowOutsideClick: false,
    });
  }

  /**
   * Muestra una ventana de confirmación de cierre de sesión con fondo negro (overlay oscuro)
   * que bloquea toda interacción hasta que el usuario elija Sí o No.
   */
  static async confirmarCerrarSesion(): Promise<boolean> {
    const result = await Swal.fire({
      title: '¿Desea cerrar sesión?',
      text: 'Se cerrará la sesión actual y volverá al login.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      allowOutsideClick: false,
      backdrop: true,
      background: '#ffffff',
      customClass: {
        container: 'vet-swal-negro-overlay',
        popup: 'vet-swal-negro-popup',
        ...this.customClass(),           // <-- AGREGADO (spread para unir con container/popup)
      },
    });
    return result.isConfirmed;
  }
}
