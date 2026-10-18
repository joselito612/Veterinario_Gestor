export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function forbidden(message = 'No tiene permiso para realizar esta acción.') {
  return new AppError(message, 403);
}

export function unauthorized(message = 'Credenciales inválidas.') {
  return new AppError(message, 401);
}

export function notFound(message = 'Registro no encontrado.') {
  return new AppError(message, 404);
}

export function conflict(message: string) {
  return new AppError(message, 409);
}

export function unprocessable(message: string, details?: unknown) {
  return new AppError(message, 422, details);
}
