#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outFile = path.join(root, 'scripts/directus/seed-from-web.generated.json')
const force = process.argv.includes('--force') || process.env.FORCE_REGENERATE === 'true'

if (fs.existsSync(outFile) && !force) {
  console.error(`Refusing to overwrite ${outFile}. Re-run with --force or FORCE_REGENERATE=true.`)
  process.exit(1)
}

const scanRoots = [
  'web/index.html',
  'web/A版官网首页.html',
  'web/pages/about',
  'web/pages/news',
  'web/pages/business',
  'web/pages/company',
  'web/pages/contact',
  'web/pages/detail',
  'web/pages/org',
  'web/pages/party',
  'web/pages/projects',
  'web/pages/responsibility',
]

const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
const rel = (file) => path.relative(root, file).replace(/\\/g, '/')

function walk(target) {
  const abs = path.join(root, target)
  if (!fs.existsSync(abs)) return []
  const stat = fs.statSync(abs)
  if (stat.isFile()) return abs.endsWith('.html') ? [abs] : []
  return fs.readdirSync(abs).flatMap(name => walk(path.join(target, name)))
}

const files = scanRoots.flatMap(walk)
const seed = {
  generated_at: new Date().toISOString(),
  note: 'Generated from existing web HTML. Review uncertain=true records before importing.',
  channels: [],
  pages: [],
  banners: [],
  articles: [],
  companies: [],
  business_sectors: [],
  quick_links: [],
  friend_links: []
}

const channelMap = new Map([
  ['web/A版官网首页.html', ['home', '首页']],
  ['web/pages/news/index.html', ['group-news', '新闻中心']],
  ['web/pages/business/index.html', ['business-news', '业务板块']],
  ['web/pages/party/index.html', ['party-mass', '党建群团']],
  ['web/pages/responsibility/index.html', ['social-responsibility', '社会责任']],
])

for (const file of files) {
  const source_file = rel(file)
  const raw = fs.readFileSync(file, 'utf8')
  const body = strip(raw)
  const title = text((body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '')
  const h1 = text((body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '')
  const headings = [...body.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].map(m => text(m[1])).filter(Boolean)
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => text(m[1])).filter(Boolean).filter(v => v.length >= 8)
  const links = [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(m => ({
    title: text(m[2]),
    url: ((m[1].match(/href=["']([^"']+)["']/i) || [])[1] || '').trim()
  })).filter(x => x.title && x.url && !x.url.startsWith('#'))
  const images = [...body.matchAll(/<img\b([^>]*)>/gi)].map(m => ({
    src: ((m[1].match(/src=["']([^"']+)["']/i) || [])[1] || '').trim(),
    alt: ((m[1].match(/alt=["']([^"']*)["']/i) || [])[1] || '').trim()
  })).filter(x => x.src)

  const [channelSlug, channelName] = channelMap.get(source_file) || [slugify(h1 || title || path.basename(path.dirname(file))), h1 || title]
  if (channelSlug && channelName && !seed.channels.some(x => x.slug === channelSlug)) {
    seed.channels.push({ name: channelName, slug: channelSlug, type: 'page', path: '/' + source_file.replace(/^web\//, ''), status: 'enabled', visible: true, source_file, uncertain: source_file.includes('/detail/') })
  }

  if (!source_file.includes('/detail/')) {
    seed.pages.push({ title: h1 || title || source_file, slug: slugify(h1 || title || source_file), content: paragraphs.slice(0, 6).map(p => `<p>${p}</p>`).join('\n'), cover: images[0]?.src || null, status: 'published', source_file, uncertain: paragraphs.length === 0 })
  }

  if (images.length) {
    seed.banners.push(...images.slice(0, source_file === 'web/A版官网首页.html' ? 1 : 3).map((img, index) => ({
      title: img.alt || h1 || title || '页面图片',
      subtitle: h1 || title || '',
      image_path: img.src,
      link_url: source_file === 'web/A版官网首页.html' ? '/' : '/' + source_file.replace(/^web\//, ''),
      position: source_file === 'web/A版官网首页.html' ? 'home' : slugify(h1 || title || 'page'),
      sort: index + 1,
      status: 'published',
      source_file,
      uncertain: !img.alt
    })))
  }

  for (const heading of headings.slice(0, 8)) {
    const isArticleLike = /新闻|动态|公告|党建|责任|项目|资讯|公示/.test(heading)
    if (isArticleLike) {
      seed.articles.push({ title: heading, summary: paragraphs[0] || '', content: paragraphs.slice(0, 3).map(p => `<p>${p}</p>`).join('\n'), channel_slug: channelSlug === 'home' ? 'group-news' : channelSlug, status: 'published', source_file, uncertain: true })
    }
  }

  for (const link of links.slice(0, 20)) {
    const entry = { title: link.title, slug: slugify(`${source_file}-${link.title}`), url: link.url, position: source_file === 'web/A版官网首页.html' ? 'home' : 'page', status: 'enabled', source_file, uncertain: /javascript:|^#$/.test(link.url) }
    if (/备案|ICP备|友情链接|外部|官网/.test(link.title)) seed.friend_links.push(entry)
    else seed.quick_links.push(entry)
  }

  if (source_file.includes('/org/')) {
    seed.companies.push({ name: h1 || title || path.basename(path.dirname(file)), slug: path.basename(path.dirname(file)), intro: paragraphs[0] || '', cover: images[0]?.src || null, status: 'enabled', source_file, uncertain: !h1 })
  }

  if (source_file.includes('/business/')) {
    for (const heading of headings.slice(0, 6)) {
      seed.business_sectors.push({ name: heading, slug: slugify(heading), intro: paragraphs[0] || '', cover: images[0]?.src || null, status: 'enabled', source_file, uncertain: true })
    }
  }
}

for (const key of ['channels','pages','banners','articles','companies','business_sectors','quick_links','friend_links']) {
  const seen = new Set()
  seed[key] = seed[key].filter(item => {
    const id = item.slug || item.title || item.name || item.url
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(seed, null, 2) + '\n')
console.log(`Generated ${outFile}`)
