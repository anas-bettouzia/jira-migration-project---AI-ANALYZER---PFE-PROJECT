export interface AuthResponse {
  token: string;
  user?: {
    email: string;
    name?: string;
    picture?: string;
    role?: string;
    auth_provider?: string;
  };
}
