import { Module } from '@nestjs/common'
import { PublicHomeController } from './public-home.controller'
import { PublicNewsController } from './public-news.controller'

@Module({
  controllers: [PublicHomeController, PublicNewsController]
})
export class PublicModule {}

