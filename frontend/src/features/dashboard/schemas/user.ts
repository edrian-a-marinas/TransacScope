// schemas/user.ts

type ReadUser = {
  id: number;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone_number: string | null;
  role_id: 1 | 2;
  is_active: boolean;
  created_at: string;
  request_admin: boolean;
};

export type ReadUserWithCount = ReadUser & {
  transaction_count?: number; 
};

export type ViewMode = "all" | "admin" | "standard";

export type PromoteUserPayload = {
  role_id: 1 | 2;
};

export type PromoteUserResponse = {
  message: string;
};

export type PromoteViewMode = "all" | "admin" | "standard";

