import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { AdminMenusService } from '../services/admin-menus.service'

@Controller('api/admin')
export class AdminMenusController {
  constructor(private readonly menus: AdminMenusService) {}

  @UseGuards(JwtAuthGuard)
  @Get('menus')
  async getMenus(@Req() req: Request) {
    const user = (req as any).user as { perms?: string[] }
    const tree = await this.menus.getMenuTreeForPerms(user?.perms || [])
    return { menus: tree }
  }
}

