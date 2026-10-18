export type Role = 'ADMIN' | 'VETERINARIO';

export type Category = 'ALIMENTOS' | 'MEDICAMENTOS' | 'ACCESORIOS';

export type AttentionStatus = 'BORRADOR' | 'CERRADA' | 'ANULADA';

export type StockReason = 'CIERRE_ATENCION' | 'ANULACION_ATENCION';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AttentionItemInput {
  productId: string;
  quantity: number;
  dosis: string;
}
