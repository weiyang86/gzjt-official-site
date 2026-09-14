import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { PermGuard } from '../../auth/guards/perm.guard'
import { Perm } from '../../auth/decorators/perm.decorator'
import { NewsCreateDto, NewsUpdateDto } from '../dto/news.dto'
import { AdminNewsService } from '../services/admin-news.service'

@Controller('api/admin/news')
@UseGuards(JwtAuthGuard, PermGuard)
export class AdminNewsController {
  constructor(private readonly news: AdminNewsService) {}

  @Get()
  @Perm('api:news:read')
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string
  ) {
    return this.news.list({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 20, 100),
      keyword: keyword || undefined,
      status: status || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined
    })
  }

  @Get(':id')
  @Perm('api:news:read')
  async detail(@Param('id') id: string) {
    return this.news.detail(id)
  }

  @Post()
  @Perm('api:news:create')
  async create(@Body() dto: NewsCreateDto, @Req() req: Request) {
    const user = (req as any).user as { sub: string }
    return this.news.create(dto, user.sub)
  }

  @Patch(':id')
  @Perm('api:news:update')
  async update(@Param('id') id: string, @Body() dto: NewsUpdateDto) {
    return this.news.update(id, dto)
  }

  @Post(':id/publish')
  @Perm('api:news:publish')
  async publish(@Param('id') id: string) {
    return this.news.publish(id)
  }

  @Post(':id/unpublish')
  @Perm('api:news:publish')
  async unpublish(@Param('id') id: string) {
    return this.news.unpublish(id)
  }
}
