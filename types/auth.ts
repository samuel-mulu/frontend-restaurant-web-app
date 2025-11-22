// User roles as defined in backend
export type Role = "owner" | "cashier" | "waiter";

// User interface matching backend structure
export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: Role;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Login request
export interface LoginRequest {
  phone: string;
  password: string;
}

// Login API response
export interface ApiLoginResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    user: User;
  };
}

// Profile API response (backend returns user directly)
export interface ApiProfileResponse {
  success: boolean;
  message?: string;
  data?: User;
}
