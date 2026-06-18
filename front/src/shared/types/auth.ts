export interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
  role?: string;
  auth_provider?: string;
}

export interface AuthResponse {
  token: string;
  user?: AuthUser;
}

export interface ProfileUpdateResponse {
  message: string;
  user: AuthUser;
  token?: string;
}
