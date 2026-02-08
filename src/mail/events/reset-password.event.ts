export class ResetPasswordEvent {
  static readonly signature = 'auth.reset-password';

  constructor(
    public readonly user: {
      id: string;
      email: string;
      emailVerified: boolean;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    },
    public readonly url: string,
    public readonly token: string,
  ) {}
}
