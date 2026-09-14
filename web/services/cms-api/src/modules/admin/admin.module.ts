import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminMeController } from './controllers/admin-me.controller'
import { AdminMenusController } from './controllers/admin-menus.controller'
import { AdminNewsController } from './controllers/admin-news.controller'
import { AdminMenusService } from './services/admin-menus.service'
import { AdminNewsService } from './services/admin-news.service'

@Module({
  imports: [AuthModule],
  controllers: [AdminMeController, AdminMenusController, AdminNewsController],
  providers: [AdminMenusService, AdminNewsService]
})
export class AdminModule {}

