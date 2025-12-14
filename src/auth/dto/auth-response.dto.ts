import { Expose, Type } from 'class-transformer';

export class ProfileDto {
  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  displayName: string;

  @Expose()
  phone?: string;

  @Expose()
  bio?: string;

  // Teacher specific
  @Expose()
  title?: string;

  @Expose()
  joinDate?: string;

  // Student specific
  @Expose()
  studentId?: string;
}

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  emailVerified: boolean;

  @Expose()
  image?: string;

  @Expose()
  role?: string;

  @Expose()
  banned: boolean;

  @Expose()
  banReason?: string;

  @Expose()
  banExpires?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => ProfileDto)
  profile?: ProfileDto;
}

export class SessionDto {
  @Expose()
  id: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  userId: string;

  @Expose()
  expiresAt: Date;

  @Expose()
  ipAddress?: string;

  @Expose()
  userAgent?: string;

  @Expose()
  token: string;

  @Expose()
  impersonatedBy?: string;
}

export class AuthResponseDto {
  @Expose()
  @Type(() => SessionDto)
  session: SessionDto;

  @Expose()
  token: string;

  @Expose()
  redirect: boolean;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
