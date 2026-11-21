import { Pool } from 'pg';
import { IUserRepository, DbUser } from './IUserRepository';

export class UserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async findByEmail(email: string): Promise<DbUser | null> {
    const res = await this.pool.query<DbUser>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<DbUser | null> {
    const res = await this.pool.query<DbUser>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async createUser(data: {
    email: string;
    password_hash: string;
    role: DbUser['role'];
    name: string;
  }): Promise<DbUser> {
    const res = await this.pool.query<DbUser>(
      `INSERT INTO users (email, password_hash, role, name)
       VALUES (LOWER($1), $2, $3, $4)
       RETURNING *`,
      [data.email, data.password_hash, data.role, data.name]
    );
    return res.rows[0];
  }
}
