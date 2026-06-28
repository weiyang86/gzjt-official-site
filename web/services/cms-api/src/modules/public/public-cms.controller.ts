import { Controller, Get, Param, Query } from '@nestjs/common'
import { DirectusCmsService } from './directus-cms.service'

@Controller('api/public/cms')
export class PublicCmsController {
  constructor(private readonly cms: DirectusCmsService) {}

  @Get('banners')
  getBanners(@Query('position') position = 'home') {
    return this.cms.getBanners(position)
  }

  @Get('articles/by-channel/:channelSlug')
  getArticlesByChannel(@Param('channelSlug') channelSlug: string, @Query('limit') limit = '10') {
    return this.cms.getArticlesByChannel(channelSlug, Number(limit) || 10)
  }

  @Get('articles/:id')
  getArticleDetail(@Param('id') id: string) {
    return this.cms.getArticleDetail(id)
  }

  @Get('companies')
  getCompanies() {
    return this.cms.getCompanies()
  }

  @Get('companies/:slug')
  getCompanyDetail(@Param('slug') slug: string) {
    return this.cms.getCompanyDetail(slug)
  }

  @Get('companies/:id/articles')
  getCompanyArticles(@Param('id') id: string, @Query('limit') limit = '10') {
    return this.cms.getCompanyArticles(id, Number(limit) || 10)
  }

  @Get('business-sectors')
  getBusinessSectors() {
    return this.cms.getBusinessSectors()
  }

  @Get('pages/:slug')
  getPageBySlug(@Param('slug') slug: string) {
    return this.cms.getPageBySlug(slug)
  }
}
