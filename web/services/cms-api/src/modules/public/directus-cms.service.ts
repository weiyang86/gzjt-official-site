import { Injectable, Logger } from '@nestjs/common'

type DirectusListResponse<T> = { data?: T[] }
type DirectusItemResponse<T> = { data?: T }

@Injectable()
export class DirectusCmsService {
  private readonly logger = new Logger(DirectusCmsService.name)
  private readonly baseUrl = (process.env.CMS_BASE_URL || process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')

  cmsAsset(fileId?: string | null) {
    if (!fileId) return null
    if (/^https?:\/\//i.test(fileId)) return fileId
    return `${this.baseUrl}/assets/${encodeURIComponent(fileId)}`
  }

  formatDate(value?: string | Date | null) {
    if (!value) return ''
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
  }

  async getBanners(position = 'home') {
    return this.safeList<any>('banners', {
      'filter[position][_eq]': position,
      'filter[status][_eq]': 'published',
      sort: 'sort,-date_created',
      fields: 'id,title,subtitle,image,link_url,position,sort,status'
    }, item => ({
      id: String(item.id),
      title: item.title || '',
      subtitle: item.subtitle || '',
      image: this.fileUrl(item.image),
      linkUrl: item.link_url || '',
      position: item.position || position,
      sort: item.sort ?? 0
    }))
  }

  async getArticlesByChannel(channelSlug: string, limit = 10) {
    return this.safeList<any>('articles', {
      'filter[status][_eq]': 'published',
      'filter[main_channel][slug][_eq]': channelSlug,
      limit: String(Math.min(Number(limit) || 10, 50)),
      sort: '-is_top,sort,-publish_at,-date_created',
      fields: 'id,title,subtitle,cover,summary,source,author,publish_at,status,is_top,is_home_recommend,sort,main_channel.id,main_channel.name,main_channel.slug,related_company.id,related_company.name,related_company.slug,related_sector.id,related_sector.name,related_sector.slug'
    }, item => this.mapArticleSummary(item))
  }

  async getArticleDetail(id: string) {
    if (!id) return null
    const item = await this.safeItem<any>(`articles/${encodeURIComponent(id)}`, {
      fields: '*,main_channel.*,related_company.*,related_sector.*'
    })
    if (!item || item.status !== 'published') return null
    return this.mapArticleDetail(item)
  }

  async getCompanies() {
    return this.safeList<any>('companies', {
      'filter[status][_eq]': 'enabled',
      sort: 'sort,id',
      fields: 'id,name,short_name,slug,logo,cover,intro,address,main_business,registered_capital,sort,status'
    }, item => this.mapCompany(item))
  }

  async getCompanyDetail(slug: string) {
    if (!slug) return null
    const items = await this.safeList<any>('companies', {
      'filter[slug][_eq]': slug,
      'filter[status][_eq]': 'enabled',
      limit: '1',
      fields: 'id,name,short_name,slug,logo,cover,intro,address,main_business,registered_capital,sort,status'
    }, item => this.mapCompany(item))
    return items[0] || null
  }

  async getCompanyArticles(companyId: string, limit = 10) {
    if (!companyId) return []
    return this.safeList<any>('articles', {
      'filter[status][_eq]': 'published',
      'filter[related_company][id][_eq]': companyId,
      limit: String(Math.min(Number(limit) || 10, 50)),
      sort: '-publish_at,-date_created',
      fields: 'id,title,subtitle,cover,summary,source,author,publish_at,status,is_top,is_home_recommend,sort,main_channel.id,main_channel.name,main_channel.slug,related_company.id,related_company.name,related_company.slug'
    }, item => this.mapArticleSummary(item))
  }

  async getBusinessSectors() {
    return this.safeList<any>('business_sectors', {
      'filter[status][_eq]': 'enabled',
      sort: 'sort,id',
      fields: 'id,name,slug,cover,intro,sort,status'
    }, item => ({
      id: String(item.id),
      name: item.name || '',
      slug: item.slug || '',
      cover: this.fileUrl(item.cover),
      intro: item.intro || '',
      sort: item.sort ?? 0,
      status: item.status || ''
    }))
  }

  async getPageBySlug(slug: string) {
    if (!slug) return null
    const items = await this.safeList<any>('pages', {
      'filter[slug][_eq]': slug,
      'filter[status][_eq]': 'published',
      limit: '1',
      fields: 'id,title,slug,cover,content,status'
    }, item => ({
      id: String(item.id),
      title: item.title || '',
      slug: item.slug || '',
      cover: this.fileUrl(item.cover),
      content: item.content || '',
      status: item.status || ''
    }))
    return items[0] || null
  }

  private async safeList<T>(collection: string, params: Record<string, string>, mapper: (item: any) => T): Promise<T[]> {
    try {
      const result = await this.fetchDirectus<DirectusListResponse<any>>(`/items/${collection}`, params)
      return Array.isArray(result.data) ? result.data.map(mapper) : []
    } catch (error) {
      this.warnFailure(collection, error)
      return []
    }
  }

  private async safeItem<T>(path: string, params: Record<string, string>): Promise<T | null> {
    try {
      const result = await this.fetchDirectus<DirectusItemResponse<T>>(`/items/${path}`, params)
      return result.data || null
    } catch (error) {
      this.warnFailure(path, error)
      return null
    }
  }

  private async fetchDirectus<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return response.json() as Promise<T>
  }

  private warnFailure(scope: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    this.logger.warn(`Directus request failed for ${scope}: ${message}. Returning fallback data.`)
  }

  private fileUrl(value: any) {
    if (!value) return null
    if (typeof value === 'string') return this.cmsAsset(value)
    if (value.id) return this.cmsAsset(String(value.id))
    return null
  }

  private mapArticleSummary(item: any) {
    return {
      id: String(item.id),
      title: item.title || '',
      subtitle: item.subtitle || '',
      cover: this.fileUrl(item.cover),
      summary: item.summary || '',
      source: item.source || '',
      author: item.author || '',
      publishAt: item.publish_at || null,
      publishDate: this.formatDate(item.publish_at),
      isTop: Boolean(item.is_top),
      isHomeRecommend: Boolean(item.is_home_recommend),
      sort: item.sort ?? 0,
      mainChannel: item.main_channel ? {
        id: String(item.main_channel.id),
        name: item.main_channel.name || '',
        slug: item.main_channel.slug || ''
      } : null,
      relatedCompany: item.related_company ? {
        id: String(item.related_company.id),
        name: item.related_company.name || '',
        slug: item.related_company.slug || ''
      } : null,
      relatedSector: item.related_sector ? {
        id: String(item.related_sector.id),
        name: item.related_sector.name || '',
        slug: item.related_sector.slug || ''
      } : null
    }
  }

  private mapArticleDetail(item: any) {
    return {
      ...this.mapArticleSummary(item),
      content: item.content || '',
      attachments: Array.isArray(item.attachments) ? item.attachments : []
    }
  }

  private mapCompany(item: any) {
    return {
      id: String(item.id),
      name: item.name || '',
      shortName: item.short_name || '',
      slug: item.slug || '',
      logo: this.fileUrl(item.logo),
      cover: this.fileUrl(item.cover),
      intro: item.intro || '',
      address: item.address || '',
      mainBusiness: item.main_business || '',
      registeredCapital: item.registered_capital || '',
      sort: item.sort ?? 0,
      status: item.status || ''
    }
  }
}
