import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'

export type AuthUserPayload = {
  sub: string
  username: string
  displayName: string
  roles: string[]
  perms: string[]
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(input: { username: string; password: string }) {
    const user = await this.prisma.adminUser.findFirst({
      where: { username: input.username, status: 1 },
      include: {
        roles: {
          include: {
            role: {
              include: {
                perms: {
                  include: {
                    perm: true
                  }
                }
              }
            }
          }
        }
      }
    })
    if (!user) throw new UnauthorizedException('账号或密码错误')
    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('账号或密码错误')

    const roleCodes = user.roles.map(x => x.role.code)
    const permCodes = Array.from(
      new Set(
        user.roles.flatMap(x => x.role.perms.map(rp => rp.perm.code))
      )
    )

    const payload: AuthUserPayload = {
      sub: String(user.id),
      username: user.username,
      displayName: user.displayName,
      roles: roleCodes,
      perms: permCodes
    }

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    })
    const refreshToken = await this.jwt.signAsync(
      { sub: payload.sub },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
      }
    )

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10)
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        lastLoginAt: new Date()
      }
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: String(user.id),
        username: user.username,
        displayName: user.displayName,
        roles: roleCodes
      }
    }
  }

  async refresh(input: { refreshToken: string }) {
    const decoded = await this.jwt.verifyAsync<{ sub: string }>(input.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET
    })
    const user = await this.prisma.adminUser.findFirst({
      where: { id: BigInt(decoded.sub), status: 1 },
      include: {
        roles: {
          include: {
            role: {
              include: {
                perms: {
                  include: {
                    perm: true
                  }
                }
              }
            }
          }
        }
      }
    })
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('登录已失效')
    const ok = await bcrypt.compare(input.refreshToken, user.refreshTokenHash)
    if (!ok) throw new UnauthorizedException('登录已失效')

    const roleCodes = user.roles.map(x => x.role.code)
    const permCodes = Array.from(
      new Set(
        user.roles.flatMap(x => x.role.perms.map(rp => rp.perm.code))
      )
    )

    const payload: AuthUserPayload = {
      sub: String(user.id),
      username: user.username,
      displayName: user.displayName,
      roles: roleCodes,
      perms: permCodes
    }

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    })

    return {
      accessToken,
      user: {
        id: String(user.id),
        username: user.username,
        displayName: user.displayName,
        roles: roleCodes
      }
    }
  }

  async logout(userId: string) {
    await this.prisma.adminUser.update({
      where: { id: BigInt(userId) },
      data: { refreshTokenHash: null }
    })
    return { ok: true }
  }
}

