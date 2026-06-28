import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('api/public')
export class PublicHomeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('home')
  async home() {
    const [stats, news] = await Promise.all([
      this.prisma.cmsHomeStat.findMany({
        where: { visible: 1 },
        orderBy: [{ sort: 'asc' }, { id: 'asc' }]
      }),
      this.prisma.cmsNews.findMany({
        where: { status: 'published' },
        orderBy: [{ isTop: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }],
        take: 5
      })
    ])

    return {
      stats: stats.map(x => ({
        id: String(x.id),
        label: x.label,
        value: x.value,
        unit: x.unit,
        sort: x.sort
      })),
      featuredNews: news.map(x => ({
        id: String(x.id),
        title: x.title,
        summary: x.summary,
        views: String(x.views),
        publishedAt: x.publishedAt ? x.publishedAt.toISOString() : null
      }))
    }
  }
}

