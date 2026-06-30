import { IUserRepository, FindAllOptions } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserMapper } from '../mappers/UserMapper';
import { prisma } from '../../../../shared/infrastructure/config/Database';

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async save(user: User): Promise<User> {
    const prismaUser = UserMapper.toPrisma(user);
    const saved = await prisma.user.upsert({
      where: { id: prismaUser.id },
      create: prismaUser,
      update: prismaUser,
    });
    return UserMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async exists(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
  }

  async findAll(options: FindAllOptions): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: options.search
        ? {
            OR: [
              { email: { contains: options.search } },
              { name: { contains: options.search } },
            ],
          }
        : undefined,
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(UserMapper.toDomain);
  }

  async count(search?: string): Promise<number> {
    return prisma.user.count({
      where: search
        ? {
            OR: [
              { email: { contains: search } },
              { name: { contains: search } },
            ],
          }
        : undefined,
    });
  }
}
