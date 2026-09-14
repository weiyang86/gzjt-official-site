import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { NewsCreateDto, NewsUpdateDto } from '../dto/news.dto'

@Injectable()
export class AdminNewsService {
  constructor(private readonly prisma: PrismaService) {}

  async detail(id: string) {
    const cur = await this.prisma.cmsNews.findFirst({
      where: { id: BigInt(id) }
    })
    if (!cur) return { notFound: true }
    return {
      id: String(cur.id),
      title: cur.title,
      summary: cur.summary,
      contentHtml: cur.contentHtml,
      status: cur.status,
      categoryId: cur.categoryId ? String(cur.categoryId) : null,
      coverFileId: cur.coverFileId ? String(cur.coverFileId) : null,
      isTop: cur.isTop,
      isRecommend: cur.isRecommend,
      views: String(cur.views),
      publishedAt: cur.publishedAt ? cur.publishedAt.toISOString() : null,
      createdAt: cur.createdAt.toISOString(),
      updatedAt: cur.updatedAt.toISOString()
    }
  }

  async list(query: { page: number; pageSize: number; keyword?: string; status?: string; categoryId?: number }) {
    const where: any = {}
    if (query.status) where.status = query.status
    if (query.categoryId) where.categoryId = BigInt(query.categoryId)
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { summary: { contains: query.keyword } }
      ]
    }

    const [total, items] = await Promise.all([
      this.prisma.cmsNews.count({ where }),
      this.prisma.cmsNews.findMany({
        where,
        orderBy: [{ isTop: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ])

    return {
      total,
      items: items.map(x => ({
        id: String(x.id),
        title: x.title,
        summary: x.summary,
        status: x.status,
        views: String(x.views),
        isTop: x.isTop,
        isRecommend: x.isRecommend,
        publishedAt: x.publishedAt ? x.publishedAt.toISOString() : null,
        createdAt: x.createdAt.toISOString(),
        updatedAt: x.updatedAt.toISOString()
      }))
    }
  }

  async create(dto: NewsCreateDto, userId: string) {
    const created = await this.prisma.cmsNews.create({
      data: {
        title: dto.title,
        summary: dto.summary,
        categoryId: dto.categoryId ? BigInt(dto.categoryId) : null,
        coverFileId: dto.coverFileId ? BigInt(dto.coverFileId) : null,
        contentHtml: dto.contentHtml,
        createdBy: BigInt(userId),
        status: 'draft'
      }
    })
    return { id: String(created.id) }
  }

  async update(id: string, dto: NewsUpdateDto) {
    await this.prisma.cmsNews.update({
      where: { id: BigInt(id) },
      data: {
        title: dto.title,
        summary: dto.summary,
        categoryId: dto.categoryId ? BigInt(dto.categoryId) : undefined,
        coverFileId: dto.coverFileId ? BigInt(dto.coverFileId) : undefined,
        contentHtml: dto.contentHtml,
        status: dto.status,
        isTop: dto.isTop,
        isRecommend: dto.isRecommend
      }
    })
    return { ok: true }
  }

  async publish(id: string) {
    await this.prisma.cmsNews.update({
      where: { id: BigInt(id) },
      data: { status: 'published', publishedAt: new Date() }
    })
    return { ok: true }
  }

  async unpublish(id: string) {
    await this.prisma.cmsNews.update({
      where: { id: BigInt(id) },
      data: { status: 'offline' }
    })
    return { ok: true }
  }
}
