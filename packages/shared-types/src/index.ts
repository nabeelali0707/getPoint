export type UserRole = "student" | "driver" | "admin";
export type UserStatus = "active" | "suspended";
export type DriverApprovalStatus = "pending" | "approved" | "rejected";
export type PointStatus = "active" | "inactive" | "delayed" | "signal_lost";
export type TripStatus = "started" | "paused" | "ended";
export type ReportStatus = "open" | "resolved";
export type NotificationReadStatus = "unread" | "read";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
  status: UserStatus;
}

export interface StudentSignupDto {
  email: string;
  password: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface DriverRegisterDto {
  email: string;
  password: string;
  fullName: string;
  licenseNo: string;
  vehicleNo: string;
  phone: string;
  requestedPointId?: string;
}

export interface StartTripDto {
  pointId?: string;
}

export interface LocationPingDto {
  tripId: string;
  lat: number;
  lng: number;
  speed?: number;
  timestamp?: string;
}

export interface LiveDriverSummary {
  firstName: string;
  vehicleNo: string;
}

export interface LiveLocationUpdate {
  tripId: string;
  pointId: string;
  pointCode: string;
  lat: number;
  lng: number;
  speed: number | null;
  timestamp: string;
  etaSeconds: number | null;
  driver: LiveDriverSummary;
}
