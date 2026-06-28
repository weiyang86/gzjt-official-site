import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERM_KEY } from '../decorators/perm.decorator'

@Injectable()
export class PermGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const perm = this.reflector.getAllAndOverride<string>(PERM_KEY, [
      context.getHandler(),
      context.getClass()
    ])
    if (!perm) return true
    const req = context.switchToHttp().getRequest()
    const user = req.user as { perms?: string[] } | undefined
    if (!user?.perms?.includes(perm)) {
      throw new ForbiddenException('无权限')
    }
    return true
  }
}

