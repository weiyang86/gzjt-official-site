import { Module } from '@nestjs/common'
import { DirectusCmsService } from './directus-cms.service'
import { PublicCmsController } from './public-cms.controller'

@Module({
  controllers: [PublicCmsController],
  providers: [DirectusCmsService]
})
export class PublicModule {}
