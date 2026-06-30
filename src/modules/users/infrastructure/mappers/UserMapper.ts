import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { UserName } from '../../domain/value-objects/UserName';
import { User as PrismaUser } from '@prisma/client';

export class UserMapper {
  static toDomain(prismaUser: PrismaUser): User {
    return User.reconstitute(
      prismaUser.id,
      Email.reconstitute(prismaUser.email),
      UserName.reconstitute(prismaUser.name),
      prismaUser.createdAt
    );
  }

  static toPrisma(user: User): PrismaUser {
    return {
      id: user.id,
      email: user.getEmail(),
      name: user.getName(),
      createdAt: user.createdAt,
    };
  }
}
