
export enum UserRole {
  ADMIN = 'Администратор',
  CHIEF_MECHANIC = 'Главный механик',
  MECHANIC = 'Механик',
  PROCUREMENT = 'Снабженец',
  DIRECTOR = 'Директор'
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
}

export enum EquipStatus {
  ACTIVE = 'В работе',
  MAINTENANCE = 'На ТО',
  REPAIR = 'В ремонте',
  IDLE = 'Простой',
  WAITING_PARTS = 'Ожидание запчастей'
}

export interface MaintenanceRegulation {
  id: string;
  type: string;
  intervalHours: number;
  works: string[];
}

export interface Equipment {
  id: string;
  name: string;
  make: string;
  model: string;
  vin: string;
  license_plate?: string;
  status: EquipStatus;
  hours: number;
  mileage_km?: number;
  year?: number;
  image?: string;
  insurance_end?: string;
  insurance_policy?: string;
  insuranceCompany?: string;
  insuranceNumber?: string;
  insuranceStart?: string;
  supplier?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  regulations?: MaintenanceRegulation[];
  driver?: string;
  documents?: { name: string; url: string; type: string }[];
  photos?: string[];
}

export interface FluidRecord {
  name: string;
  amount: string;
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  date: string;
  type: string;
  hoursAtMaintenance: number;
  performedBy: string;
  checklistItems: { task: string; completed: boolean }[];
  cost?: number;
  fluids?: FluidRecord[];
}

// Added PlannedTO and PlannedTOStatus for maintenance tracking
export type PlannedTOStatus = 'planned' | 'completed';
export interface PlannedTO {
  id: string;
  equipmentId: string;
  type: string;
  date: string;
  status: PlannedTOStatus;
}

export type BreakdownStatus = 'Новая' | 'Запчасти заказаны' | 'Запчасти получены' | 'В работе' | 'Исправлено';
export type BreakdownSeverity = 'Критическая' | 'Средняя' | 'Низкая';

export interface BreakdownRecord {
  id: string;
  equipmentId: string;
  date: string;
  partName: string;
  node: string;
  description: string;
  status: BreakdownStatus;
  severity: BreakdownSeverity;
  fixedDate?: string;
  hoursAtBreakdown?: number;
  reportedBy?: string;
}

export type ProcurementStatus = 'Новая' | 'Поиск' | 'Оплачено' | 'В пути' | 'На складе';

export interface ProcurementRequest {
  id: string;
  title: string;
  status: ProcurementStatus;
  items: { id: string; name: string; quantity: string }[];
  cost?: number;
  createdAt: string;
  completedAt?: string;
  equipmentId: string;
  breakdownId?: string;
  priority?: number;
  createdBy?: string;
}

export interface FuelRecord {
  id: string;
  equipmentId: string;
  date: string;
  quantity: number;
  totalCost: number;
  currentHours: number;
  station: string;
  fuelType: string;
  pricePerLiter: number;
  currentMileage: number;
  paymentMethod: string;
  performedBy: string;
}

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
}