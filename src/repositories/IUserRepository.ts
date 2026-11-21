import { UserRole } from '@/lib/getCurrentUser';

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string;
  created_at: Date;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<DbUser | null>;
  findById(id: string): Promise<DbUser | null>;
  createUser(data: {
    email: string;
    password_hash: string;
    role: UserRole;
    name: string;
  }): Promise<DbUser>;
}
