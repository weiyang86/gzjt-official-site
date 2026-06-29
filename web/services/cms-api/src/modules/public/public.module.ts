import { Module } from '@nestjs/common'
import { DirectusCmsService } from './directus-cms.service'
import { PublicCmsController } from './public-cms.controller'
import { PublicHomeController } from './public-home.controller'
import { PublicNewsController } from './public-news.controller'

const publicOnly = process.env.CMS_API_PUBLIC_ONLY !== 'false'
const controllers = publicOnly
  ? [PublicCmsController]
  : [PublicHomeController, PublicNewsController, PublicCmsController]

@Module({
  controllers,
  providers: [DirectusCmsService]
})
export class PublicModule {}
