export type RegisterBody = { email: string; password: string };
export type RegisterResponse = { id: number; email: string };

export type LoginBody = { email: string; password: string };
export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer" | string;
};

export type MeResponse = { id: number; email: string };