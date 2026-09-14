import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'

type MenuNode = {
  id: string
  parentId: string | null
  name: string
  path: string
  icon?: string | null
  sort: number
  children: MenuNode[]
}

@Injectable()
export class AdminMenusService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenuTreeForPerms(perms: string[]) {
    const all = await this.prisma.adminMenu.findMany({
      where: { visible: 1 },
      include: { perms: { include: { perm: true } } },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }]
    })

    const allowed = all.filter(m => {
      const p = m.perms.map(x => x.perm.code)
      if (p.length === 0) return true
      return p.some(code => perms.includes(code))
    })

    const nodes: MenuNode[] = allowed.map(m => ({
      id: String(m.id),
      parentId: m.parentId ? String(m.parentId) : null,
      name: m.name,
      path: m.path,
      icon: m.icon,
      sort: m.sort,
      children: []
    }))

    const byId = new Map(nodes.map(n => [n.id, n]))
    const roots: MenuNode[] = []
    nodes.forEach(n => {
      if (n.parentId && byId.has(n.parentId)) {
        byId.get(n.parentId)!.children.push(n)
      } else {
        roots.push(n)
      }
    })
    const sortTree = (arr: MenuNode[]) => {
      arr.sort((a, b) => a.sort - b.sort)
      arr.forEach(x => sortTree(x.children))
    }
    sortTree(roots)
    return roots
  }
}

