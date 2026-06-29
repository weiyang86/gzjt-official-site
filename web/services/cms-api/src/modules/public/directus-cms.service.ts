import { Injectable, Logger } from '@nestjs/common'

type DirectusListResponse<T> = { data?: T[] }
type DirectusItemResponse<T> = { data?: T }

@Injectable()
export class DirectusCmsService {
  private readonly logger = new Logger(DirectusCmsService.name)
  private readonly baseUrl = (process.env.CMS_BASE_URL || process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')
  private readonly directusToken = process.env.DIRECTUS_TOKEN || ''
  private readonly directusEmail = process.env.DIRECTUS_EMAIL || process.env.ADMIN_EMAIL || ''
  private readonly directusPassword = process.env.DIRECTUS_PASSWORD || process.env.ADMIN_PASSWORD || ''
  private accessToken: string | null = this.directusToken || null

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
      sort: 'sort,-id',
      fields: 'id,title,subtitle,image,image_url,link_url,position,sort,status'
    }, item => ({
      id: String(item.id),
      title: item.title || '',
      subtitle: item.subtitle || '',
      image: this.assetUrl(item.image, item.image_url),
      linkUrl: item.link_url || '',
      position: item.position || position,
      sort: item.sort ?? 0
    }))
  }

  async getChannels(type = '') {
    const params: Record<string, string> = {
      'filter[status][_eq]': 'enabled',
      'filter[visible][_eq]': 'true',
      sort: 'sort,id',
      fields: 'id,name,slug,type,path,sort,status,visible'
    }
    if (type) params['filter[type][_eq]'] = type
    return this.safeList<any>('channels', params, item => ({
      id: String(item.id),
      name: item.name || '',
      slug: item.slug || '',
      type: item.type || '',
      path: item.path || '',
      sort: item.sort ?? 0,
      status: item.status || '',
      visible: item.visible !== false
    }))
  }

  async listArticles(options: {
    page?: number
    pageSize?: number
    channelSlug?: string
    newsSubcategory?: string
    keyword?: string
    excludeId?: string
  }) {
    const page = Math.max(1, Number(options.page) || 1)
    const pageSize = Math.min(Math.max(1, Number(options.pageSize) || 10), 100)
    const channelMap = await this.getChannelMap()
    const channelId = options.channelSlug && options.channelSlug !== 'all'
      ? this.findChannelIdBySlug(channelMap, options.channelSlug)
      : null
    const params: Record<string, string> = {
      'filter[status][_eq]': 'published',
      page: String(page),
      limit: String(pageSize),
      meta: 'filter_count',
      sort: '-is_top,sort,-publish_at,-id',
      fields: 'id,title,subtitle,cover,cover_url,summary,source,author,publish_at,status,is_top,is_home_recommend,sort,news_subcategory,main_channel,related_company,related_sector'
    }
    if (options.channelSlug && options.channelSlug !== 'all') {
      if (!channelId) return { page, pageSize, total: 0, availableSubcategories: [], items: [] }
      params['filter[main_channel][_eq]'] = channelId
    }
    if (options.newsSubcategory) params['filter[news_subcategory][_eq]'] = options.newsSubcategory
    if (options.excludeId) params['filter[id][_neq]'] = options.excludeId
    if (options.keyword) params.search = options.keyword

    try {
      const result = await this.fetchDirectus<{ data?: any[]; meta?: { filter_count?: number } }>('/items/articles', params)
      const items = Array.isArray(result.data) ? result.data.map(item => this.mapArticleSummary(item, channelMap)) : []
      const availableSubcategories = options.channelSlug ? await this.getArticleSubcategories(options.channelSlug) : []
      return {
        page,
        pageSize,
        total: result.meta?.filter_count ?? items.length,
        availableSubcategories,
        items
      }
    } catch (error) {
      this.warnFailure('articles', error)
      return { page, pageSize, total: 0, availableSubcategories: [], items: [] }
    }
  }

  async getArticlesByChannel(channelSlug: string, limit = 10) {
    const channelMap = await this.getChannelMap()
    const channelId = this.findChannelIdBySlug(channelMap, channelSlug)
    if (!channelId) return []
    return this.safeList<any>('articles', {
      'filter[status][_eq]': 'published',
      'filter[main_channel][_eq]': channelId,
      limit: String(Math.min(Number(limit) || 10, 50)),
      sort: '-is_top,sort,-publish_at,-id',
      fields: 'id,title,subtitle,cover,cover_url,summary,source,author,publish_at,status,is_top,is_home_recommend,sort,news_subcategory,main_channel,related_company,related_sector'
    }, item => this.mapArticleSummary(item, channelMap))
  }

  async getArticleDetail(id: string) {
    if (!id) return null
    const channelMap = await this.getChannelMap()
    const item = await this.safeItem<any>(`articles/${encodeURIComponent(id)}`, {
      fields: '*,main_channel,related_company,related_sector'
    })
    if (!item || item.status !== 'published') return null
    return this.mapArticleDetail(item, channelMap)
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
    const channelMap = await this.getChannelMap()
    return this.safeList<any>('articles', {
      'filter[status][_eq]': 'published',
      'filter[related_company][id][_eq]': companyId,
      limit: String(Math.min(Number(limit) || 10, 50)),
      sort: '-publish_at,-id',
      fields: 'id,title,subtitle,cover,cover_url,summary,source,author,publish_at,status,is_top,is_home_recommend,sort,news_subcategory,main_channel,related_company'
    }, item => this.mapArticleSummary(item, channelMap))
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

  async getHomeSections() {
    return this.safeList<any>('home_sections', {
      'filter[status][_eq]': 'enabled',
      sort: 'sort,id',
      fields: 'id,title,slug,subtitle,description,collection_key,channel_slug,limit,sort,status'
    }, item => ({
      id: String(item.id),
      title: item.title || '',
      slug: item.slug || '',
      subtitle: item.subtitle || '',
      description: item.description || '',
      collectionKey: item.collection_key || '',
      channelSlug: item.channel_slug || '',
      limit: item.limit ?? null,
      sort: item.sort ?? 0,
      status: item.status || ''
    }))
  }

  async getQuickLinks(position = 'home') {
    return this.safeList<any>('quick_links', {
      'filter[position][_eq]': position,
      'filter[status][_eq]': 'enabled',
      sort: 'sort,id',
      fields: 'id,title,slug,url,position,summary,icon,sort,status'
    }, item => ({
      id: String(item.id),
      title: item.title || '',
      slug: item.slug || '',
      url: item.url || '',
      position: item.position || position,
      summary: item.summary || '',
      icon: this.fileUrl(item.icon),
      sort: item.sort ?? 0,
      status: item.status || ''
    }))
  }

  async getSiteSettings() {
    const items = await this.safeList<any>('site_settings', {
      limit: '1',
      fields: 'id,site_name,logo,footer_text,address,phone,email,icp,copyright'
    }, item => ({
      id: String(item.id),
      siteName: item.site_name || '',
      logo: this.fileUrl(item.logo),
      footerText: item.footer_text || '',
      address: item.address || '',
      phone: item.phone || '',
      email: item.email || '',
      icp: item.icp || '',
      copyright: item.copyright || ''
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
    const response = await this.fetchWithAuth(url)
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return response.json() as Promise<T>
  }

  private async fetchWithAuth(url: URL) {
    const requestOnce = async () => {
      const token = await this.ensureAccessToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      return fetch(url, { headers })
    }
    let response = await requestOnce()
    if (response.status === 401 && this.accessToken && this.directusEmail && this.directusPassword) {
      this.accessToken = null
      response = await requestOnce()
    }
    return response
  }

  private async ensureAccessToken() {
    if (this.accessToken) return this.accessToken
    if (!this.directusEmail || !this.directusPassword) return null
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.directusEmail, password: this.directusPassword })
    })
    if (!response.ok) throw new Error(`Directus login failed (${response.status})`)
    const data = await response.json() as { data?: { access_token?: string } }
    this.accessToken = data?.data?.access_token || null
    return this.accessToken
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

  private staticAssetUrl(value: any) {
    const raw = String(value || '').trim()
    if (!raw) return null
    if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
    if (raw.startsWith('/')) return raw
    return `/${raw.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '')}`
  }

  private assetUrl(fileValue: any, staticValue?: any) {
    return this.fileUrl(fileValue) || this.staticAssetUrl(staticValue)
  }

  private async getArticleSubcategories(channelSlug: string) {
    if (!channelSlug) return []
    const channelMap = await this.getChannelMap()
    const channelId = this.findChannelIdBySlug(channelMap, channelSlug)
    if (!channelId) return []
    const subcategories = await this.safeList<any>('articles', {
      'filter[status][_eq]': 'published',
      'filter[main_channel][_eq]': channelId,
      limit: '-1',
      sort: 'news_subcategory',
      fields: 'news_subcategory'
    }, item => String(item.news_subcategory || '').trim())
    return Array.from(new Set(subcategories.filter(Boolean)))
  }

  private async getChannelMap() {
    const channels = await this.safeList<any>('channels', {
      'filter[status][_eq]': 'enabled',
      'filter[visible][_eq]': 'true',
      limit: '-1',
      sort: 'sort,id',
      fields: 'id,name,slug,type,path,sort,status,visible'
    }, item => ({
      id: String(item.id),
      name: item.name || '',
      slug: item.slug || '',
      type: item.type || '',
      path: item.path || '',
      sort: item.sort ?? 0,
      status: item.status || '',
      visible: item.visible !== false
    }))
    const map = new Map<string, any>()
    channels.forEach(channel => map.set(String(channel.id), channel))
    return map
  }

  private findChannelIdBySlug(channelMap: Map<string, any>, slug: string) {
    for (const [id, channel] of channelMap.entries()) {
      if (channel?.slug === slug) return id
    }
    return null
  }

  private normalizeChannel(value: any, channelMap: Map<string, any>) {
    if (!value) return null
    if (typeof value === 'object') {
      const id = String(value.id || '')
      const fallback = channelMap.get(id)
      return {
        id,
        name: value.name || fallback?.name || '',
        slug: value.slug || fallback?.slug || '',
        type: value.type || fallback?.type || '',
        path: value.path || fallback?.path || ''
      }
    }
    const id = String(value)
    const channel = channelMap.get(id)
    return channel ? { ...channel } : { id, name: '', slug: '', type: '', path: '' }
  }

  private mapArticleSummary(item: any, channelMap: Map<string, any>) {
    return {
      id: String(item.id),
      title: item.title || '',
      subtitle: item.subtitle || '',
      cover: this.assetUrl(item.cover, item.cover_url),
      summary: item.summary || '',
      source: item.source || '',
      author: item.author || '',
      publishAt: item.publish_at || null,
      publishDate: this.formatDate(item.publish_at),
      isTop: Boolean(item.is_top),
      isHomeRecommend: Boolean(item.is_home_recommend),
      sort: item.sort ?? 0,
      newsSubcategory: item.news_subcategory || '',
      mainChannel: this.normalizeChannel(item.main_channel, channelMap),
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

  private mapArticleDetail(item: any, channelMap: Map<string, any>) {
    return {
      ...this.mapArticleSummary(item, channelMap),
      content: item.content || '',
      attachments: Array.isArray(item.attachments)
        ? item.attachments.map((entry: any, index: number) => {
            const fileId = typeof entry === 'string'
              ? entry
              : String(entry?.directus_files_id?.id || entry?.id || entry?.file || '')
            const title = entry?.title || entry?.filename_download || entry?.name || `附件${index + 1}`
            return fileId ? { id: fileId, title, url: this.cmsAsset(fileId) } : null
          }).filter(Boolean)
        : []
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
