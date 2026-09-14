import { Controller, Get, Param, Query } from '@nestjs/common'
import { DirectusCmsService } from './directus-cms.service'

@Controller('api/public/cms')
export class PublicCmsController {
  constructor(private readonly cms: DirectusCmsService) {}

  @Get('banners')
  getBanners(@Query('position') position = 'home') {
    return this.cms.getBanners(position)
  }

  @Get('channels')
  getChannels(@Query('type') type = '') {
    return this.cms.getChannels(type)
  }

  @Get('home-sections')
  getHomeSections() {
    return this.cms.getHomeSections()
  }

  @Get('quick-links')
  getQuickLinks(@Query('position') position = 'home') {
    return this.cms.getQuickLinks(position)
  }

  @Get('site-settings')
  getSiteSettings() {
    return this.cms.getSiteSettings()
  }

  @Get('articles/by-channel/:channelSlug')
  getArticlesByChannel(@Param('channelSlug') channelSlug: string, @Query('limit') limit = '10') {
    return this.cms.getArticlesByChannel(channelSlug, Number(limit) || 10)
  }

  @Get('articles')
  getArticles(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('scope') scope = 'news',
    @Query('channelSlug') channelSlug = '',
    @Query('newsSubcategory') newsSubcategory = '',
    @Query('keyword') keyword = '',
    @Query('excludeId') excludeId = ''
  ) {
    return this.cms.listArticles({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      scope,
      channelSlug,
      newsSubcategory,
      keyword,
      excludeId
    })
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
