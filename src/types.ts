
export enum UserRole {
  // Супер-админ (владелец платформы)
  SUPER_ADMIN = 'super_admin',

  // Админ компании (владелец компании)
  OWNER = 'owner',
  COMPANY_ADMIN = 'company_admin',

  // Пользователи компании с разными правами
  USER = 'user',           // Полный доступ (кроме настроек компании)
  MECHANIC = 'mechanic',   // Механик: ТО, ремонты, заявки
  DRIVER = 'driver',       // Водитель: заправки, акты поломок
  PROCUREMENT = 'procurement', // Снабженец: заявки, закупки
  ACCOUNTANT = 'accountant' // Бухгалтер: документы, отчеты
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
  ACTIVE_WITH_RESTRICTIONS = 'В работе с ограничениями',
  WAITING_PARTS = 'Ожидание запчастей'
}

export interface MaintenanceRegulation {
  id: string;
  type: string;
  intervalHours?: number;
  intervalKm?: number;
  works: string[];
  fluids?: { name: string; quantity: string }[];
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
  insuranceHistory?: { insuranceCompany: string; insuranceNumber: string; insuranceStart: string; insuranceEnd: string }[];
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
  mileageAtMaintenance?: number;
  performedBy: string;
  checklistItems: { text: string; done: boolean; note?: string }[];
  cost?: number;
  fluids?: FluidRecord[];
  isEarlyService?: boolean;
  plannedTOId?: string;
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
  actNumber?: string;
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
  photos?: string[];
  hoursAtFix?: number;
  mileageAtFix?: number;
  fixNotes?: string;
  items?: { sku: string; name: string; quantity: string; unitPriceWithVAT?: number }[];
}

export type ProcurementStatus = 'Новая' | 'Поиск' | 'Оплачено' | 'В пути' | 'На складе';

export interface ProcurementRequest {
  id: string;
  title: string;
  status: ProcurementStatus;
  items: { id: string; name: string; quantity: string; unitPriceWithVAT?: number; total?: number }[];
  cost?: number;
  contractorName?: string;
  invoiceNumber?: string;
  carrierName?: string;
  trackingNumber?: string;
  responsible?: string;
  breakdownPhotos?: { id: string; name: string; url: string; type?: string }[];
  invoiceFiles?: { id: string; name: string; url: string; type?: string }[];
  attachments?: { id: string; name: string; url: string; type?: string }[];
  createdAt: string;
  completedAt?: string;
  equipmentId: string;
  breakdownId?: string;
  breakdownActNumber?: string;
  breakdownName?: string;
  breakdownDescription?: string;
  breakdownNode?: string;
  priority?: number;
  createdBy?: string;
  statusHistory?: { status: ProcurementStatus; date: string; user?: string }[];
}

export interface FuelRecord {
  id: string;
  equipmentId: string;
  date: string;
  time?: string;
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