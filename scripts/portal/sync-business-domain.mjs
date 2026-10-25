#!/usr/bin/env node
/**
 * 将“产业布局”从“集团概况”迁出，整理为：
 *   一级栏目：业务领域
 *   二级栏目：产业布局
 *   后台模块：产业布局栏目（content_type = sector_list）
 *
 * 默认只输出计划，不写数据；确认后追加 --apply 才会更新门户数据 API。
 *
 * 用法（PowerShell）：
 *   $env:CMS_DATA_API_URL='https://portal.gzjtjt.cn/_plugins/gw/curd'
 *   node scripts/portal/sync-business-domain.mjs
 *   node scripts/portal/sync-business-domain.mjs --apply
 */
const rawEndpoint = process.env.PORTAL_DATA_API_URL || process.env.CMS_DATA_API_URL || '';
const endpoint = rawEndpoint.trim().replace(/\/+$/, '').replace(/\/_plugins$/, '/_plugins/gw/curd');
const apply = process.argv.includes('--apply');

if (!endpoint) {
  console.error('缺少 CMS_DATA_API_URL，例如：https://portal.gzjtjt.cn/_plugins/gw/curd');
  process.exit(1);
}

const field = (id, value) => ({ id, value });

async function call(table, method, data) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, method, data }),
  });
  const payload = await response.json();
  if (!response.ok || payload.success !== true) {
    throw new Error(payload.error_msg || payload.err || `Data API ${method} failed`);
  }
  return payload.data || {};
}

async function readAll(table) {
  const result = await call(table, 'read', { pageSize: 1000, pageIndex: 1, includeTotalCount: true });
  return result.rows || [];
}

function buildChannelPlan(channels) {
  const root = channels.find((row) => row.slug === 'business-domain');
  const layout = channels.find((row) => row.slug === 'business-layout')
    || channels.find((row) => row.slug === 'group-business-sectors')
    || channels.find((row) => row.name === '业务板块' && row.type === 'page');
  if (!layout) throw new Error('未找到原“业务板块/产业布局”栏目记录。');
  return {
    rootId: root?.rowId || '',
    rootExists: Boolean(root),
    layout,
  };
}

function buildModulePlan(modules) {
  const existing = modules.find((row) => row.module_code === 'business-layout');
  const legacy = modules.filter((row) => (
    row.parent_code === 'business'
    || row.module_code === 'project-construction'
    || row.module_code === 'operation-management'
    || row.module_code === 'transport-tourism'
    || row.module_code === 'franchise-service'
    || row.module_code === 'emerging-industry'
  ));
  const target = existing || legacy.find((row) => row.module_code === 'project-construction') || legacy[0];
  if (!target) throw new Error('未找到可升级的产业模块记录。');
  return {
    target,
    existing: Boolean(existing),
    legacy: legacy.filter((row) => row.rowId !== target.rowId),
  };
}

async function main() {
  console.log(`数据 API：${endpoint}`);
  console.log(apply ? '模式：APPLY（写入数据）' : '模式：DRY-RUN（仅预览，追加 --apply 后写入）');

  const [channels, modules] = await Promise.all([readAll('channels'), readAll('page_modules')]);
  const channelPlan = buildChannelPlan(channels);
  const modulePlan = buildModulePlan(modules);

  console.log('\n栏目调整：');
  console.log(`- ${channelPlan.rootExists ? '复用' : '新建'}一级栏目：业务领域（business-domain，/business，sort=2）`);
  console.log(`- 迁移二级栏目：${channelPlan.layout.name}（${channelPlan.layout.slug}）→ 产业布局（business-layout），父级改为业务领域`);
  console.log('\n后台模块调整：');
  console.log(`- ${modulePlan.existing ? '复用' : '升级'}模块：${modulePlan.target.module_title}（${modulePlan.target.module_code}）→ 产业布局栏目（business-layout）`);
  console.log(`- 停用历史模块：${modulePlan.legacy.map((row) => row.module_code).join('、') || '无'}`);

  if (!apply) {
    console.log('\n预览完成，未写入任何数据。');
    return;
  }

  let rootId = channelPlan.rootId;
  if (!rootId) {
    const created = await call('channels', 'create', {
      rows: [{ fields: [
        field('name', '业务领域'),
        field('slug', 'business-domain'),
        field('parent', ''),
        field('type', 'page'),
        field('path', '/business'),
        field('sort', 2),
        field('visible', true),
        field('status_', 'enabled'),
        field('is_news_category', false),
        field('description', '业务领域一级栏目'),
      ] }],
    });
    rootId = created.rowIds?.[0];
    if (!rootId) throw new Error('新建“业务领域”栏目未返回 rowId。');
  }

  await call('channels', 'update', {
    rowIds: [channelPlan.layout.rowId],
    fields: [
      field('name', '产业布局'),
      field('slug', 'business-layout'),
      field('parent', rootId),
      field('type', 'page'),
      field('path', '/business'),
      field('sort', 0),
      field('visible', true),
      field('status_', 'enabled'),
      field('is_news_category', false),
    ],
  });

  await call('page_modules', 'update', {
    rowIds: [modulePlan.target.rowId],
    fields: [
      field('parent_title', '业务领域'),
      field('parent_code', 'business-domain'),
      field('module_title', '产业布局栏目'),
      field('module_code', 'business-layout'),
      field('route_path', '/business'),
      field('content_type', 'sector_list'),
      field('admin_enabled', true),
      field('dev_status', 'enabled'),
      field('placeholder_text', ''),
      field('remark', '产业布局栏目：维护产业体系宏观介绍和产业板块内容。'),
      field('sort', 301),
      field('status_', 'enabled'),
    ],
  });

  for (const row of modulePlan.legacy) {
    await call('page_modules', 'update', {
      rowIds: [row.rowId],
      fields: [
        field('parent_title', '业务领域'),
        field('parent_code', 'business-domain'),
        field('admin_enabled', false),
        field('dev_status', 'disabled'),
        field('status_', 'disabled'),
        field('remark', '已合并至“产业布局栏目”。'),
      ],
    });
  }

  console.log('\n写入完成。请刷新前台导航与后台“页面内容管理”确认。');
}

main().catch((error) => {
  console.error(`执行失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
