import { User } from '../entities/User';

export interface FindAllOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  exists(email: string): Promise<boolean>;
  findAll(options: FindAllOptions): Promise<User[]>;
  count(search?: string): Promise<number>;
}
