import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function upsertPerm(code: string, name: string) {
  return prisma.adminPerm.upsert({
    where: { code },
    update: { name },
    create: { code, name, type: 'api' }
  })
}

async function main() {
  const perms = await Promise.all([
    upsertPerm('api:menus:read', '读取菜单'),
    upsertPerm('api:news:read', '读取新闻'),
    upsertPerm('api:news:create', '创建新闻'),
    upsertPerm('api:news:update', '更新新闻'),
    upsertPerm('api:news:publish', '发布新闻')
  ])

  const superRole = await prisma.adminRole.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: { name: '超级管理员' },
    create: { code: 'SUPER_ADMIN', name: '超级管理员' }
  })

  await Promise.all(
    perms.map(p =>
      prisma.adminRolePerm.upsert({
        where: { uk_role_perm: { roleId: superRole.id, permId: p.id } },
        update: {},
        create: { roleId: superRole.id, permId: p.id }
      })
    )
  )

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123456'
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin'
  const admin = await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: { displayName: '系统管理员' },
    create: {
      username: adminUsername,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      displayName: '系统管理员',
      status: 1
    }
  })

  await prisma.adminUserRole.upsert({
    where: { uk_user_role: { userId: admin.id, roleId: superRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superRole.id }
  })

  const menuNews = await prisma.adminMenu.upsert({
    where: { path: '/cms/news' },
    update: { name: '新闻中心', sort: 40, visible: 1 },
    create: { parentId: null, path: '/cms/news', name: '新闻中心', icon: 'Document', sort: 40, visible: 1 }
  })
  const menuSettings = await prisma.adminMenu.upsert({
    where: { path: '/cms/settings' },
    update: { name: '系统设置', sort: 90, visible: 1 },
    create: { parentId: null, path: '/cms/settings', name: '系统设置', icon: 'Setting', sort: 90, visible: 1 }
  })

  const menuPermNews = await prisma.adminPerm.upsert({
    where: { code: 'menu:news:view' },
    update: { name: '查看新闻菜单', type: 'menu' },
    create: { code: 'menu:news:view', name: '查看新闻菜单', type: 'menu' }
  })
  const menuPermSettings = await prisma.adminPerm.upsert({
    where: { code: 'menu:settings:view' },
    update: { name: '查看系统设置菜单', type: 'menu' },
    create: { code: 'menu:settings:view', name: '查看系统设置菜单', type: 'menu' }
  })

  await prisma.adminMenuPerm.upsert({
    where: { uk_menu_perm: { menuId: menuNews.id, permId: menuPermNews.id } },
    update: {},
    create: { menuId: menuNews.id, permId: menuPermNews.id }
  })
  await prisma.adminMenuPerm.upsert({
    where: { uk_menu_perm: { menuId: menuSettings.id, permId: menuPermSettings.id } },
    update: {},
    create: { menuId: menuSettings.id, permId: menuPermSettings.id }
  })

  await prisma.adminRolePerm.upsert({
    where: { uk_role_perm: { roleId: superRole.id, permId: menuPermNews.id } },
    update: {},
    create: { roleId: superRole.id, permId: menuPermNews.id }
  })
  await prisma.adminRolePerm.upsert({
    where: { uk_role_perm: { roleId: superRole.id, permId: menuPermSettings.id } },
    update: {},
    create: { roleId: superRole.id, permId: menuPermSettings.id }
  })

  await prisma.cmsCategory.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: { type: 'news', name: '集团新闻', code: 'group', sort: 10, status: 1 }
  })

  await prisma.cmsHomeStat.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: { label: '新闻总数', value: '1520', unit: '', sort: 10, visible: 1 }
  })

  console.log('seed done')
  console.log(`admin username: ${adminUsername}`)
  console.log(`admin password: ${adminPassword}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

