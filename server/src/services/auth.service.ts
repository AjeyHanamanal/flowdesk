import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';
import { AppError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(authUser, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });

    return { accessToken: token, user: authUser };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) throw AppError.notFound('User not found');
    return user;
  }

  static hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }
}

export const authService = new AuthService();

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ['dashboard', 'customers', 'inventory', 'challans', 'activity', 'reports', 'settings'],
  SALES: ['dashboard', 'customers', 'challans', 'activity'],
  WAREHOUSE: ['dashboard', 'inventory', 'challans', 'activity'],
  ACCOUNTS: ['dashboard', 'customers', 'challans', 'activity', 'reports'],
};
