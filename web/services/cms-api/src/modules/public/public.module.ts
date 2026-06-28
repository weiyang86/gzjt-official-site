import { Module } from '@nestjs/common'
import { DirectusCmsService } from './directus-cms.service'
import { PublicCmsController } from './public-cms.controller'
import { PublicHomeController } from './public-home.controller'
import { PublicNewsController } from './public-news.controller'

@Module({
  controllers: [PublicHomeController, PublicNewsController, PublicCmsController],
  providers: [DirectusCmsService]
})
export class PublicModule {}

