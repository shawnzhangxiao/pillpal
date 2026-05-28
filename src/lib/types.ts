export interface User {
  id: string;
  phone: string;
  push_subscription: string | null;
  created_at: string;
}

export interface TodayStatus {
  coq10: { taken: boolean; time: string | null; pills: number };
  folic_acid: { taken: boolean; time: string | null; pills: number };
}

export interface JwtPayload {
  sub: string;
  phone: string;
}
