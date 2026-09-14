import { Controller, Get, Param, Query } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('api/public/news')
export class PublicNewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('keyword') keyword?: string,
    @Query('categoryId') categoryId?: string
  ) {
    const take = Math.min(Number(pageSize) || 10, 50)
    const skip = (Number(page) - 1) * take

    const where: any = { status: 'published' }
    if (categoryId) where.categoryId = BigInt(Number(categoryId))
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { summary: { contains: keyword } }
      ]
    }

    const [total, items] = await Promise.all([
      this.prisma.cmsNews.count({ where }),
      this.prisma.cmsNews.findMany({
        where,
        orderBy: [{ isTop: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }],
        skip,
        take
      })
    ])

    return {
      total,
      items: items.map(x => ({
        id: String(x.id),
        title: x.title,
        summary: x.summary,
        views: String(x.views),
        publishedAt: x.publishedAt ? x.publishedAt.toISOString() : null
      }))
    }
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const cur = await this.prisma.cmsNews.findFirst({
      where: { id: BigInt(id), status: 'published' }
    })
    if (!cur) return { notFound: true }

    await this.prisma.cmsNews.update({
      where: { id: cur.id },
      data: { views: { increment: 1 } }
    })

    return {
      id: String(cur.id),
      title: cur.title,
      summary: cur.summary,
      contentHtml: cur.contentHtml,
      views: String(cur.views),
      publishedAt: cur.publishedAt ? cur.publishedAt.toISOString() : null
    }
  }
}

