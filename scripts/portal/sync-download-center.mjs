#!/usr/bin/env node
/**
 * 在门户数据源中补齐“资料下载”导航入口：
 *   - 优先挂到“信息公开”栏目下；
 *   - 若“信息公开”不存在，则创建顶级“资料下载”栏目；
 *   - 已存在 slug=downloads 或 path=/downloads 的栏目时复用，不重复创建。
 *
 * 默认只输出计划，不写数据；确认后追加 --apply 才会更新门户数据 API。
 *
 * 用法（PowerShell）：
 *   $env:CMS_DATA_API_URL='https://portal.gzjtjt.cn/_plugins/gw/curd'
 *   node scripts/portal/sync-download-center.mjs
 *   node scripts/portal/sync-download-center.mjs --apply
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

function buildPlan(channels) {
  const parent = channels.find((row) => row.slug === 'information-disclosure');
  const existing = channels.find((row) => row.slug === 'downloads')
    || channels.find((row) => String(row.path || '').split('?')[0] === '/downloads');
  const parentId = parent?.rowId || '';
  const siblings = parentId
    ? channels.filter((row) => String(row.parent || '') === parentId)
    : channels.filter((row) => !row.parent);
  const highestSort = siblings.reduce((max, row) => Math.max(max, Number(row.sort) || 0), -1);
  const nextSort = existing ? Number(existing.sort) || 0 : highestSort + 1;
  return { parent, existing, parentId, nextSort };
}

async function main() {
  console.log(`数据 API：${endpoint}`);
  console.log(apply ? '模式：APPLY（写入数据）' : '模式：DRY-RUN（仅预览，追加 --apply 后写入）');

  const channels = await readAll('channels');
  const plan = buildPlan(channels);

  console.log('\n导航调整：');
  console.log(`- ${plan.existing ? '复用' : '新建'}栏目：资料下载（downloads，/downloads）`);
  console.log(`- 父级：${plan.parent ? `${plan.parent.name}（${plan.parent.slug}）` : '无（创建为顶级栏目）'}`);
  console.log(`- 排序：${plan.nextSort}，状态：enabled，前台可见：true`);

  if (!apply) {
    console.log('\n预览完成，未写入任何数据。');
    return;
  }

  const fields = [
    field('name', '资料下载'),
    field('slug', 'downloads'),
    field('parent', plan.parentId),
    field('type', 'page'),
    field('path', '/downloads'),
    field('sort', plan.nextSort),
    field('visible', true),
    field('status_', 'enabled'),
    field('is_news_category', false),
    field('description', '资料下载中心，按分类展示可公开下载的文件。'),
  ];

  if (plan.existing) {
    await call('channels', 'update', { rowIds: [plan.existing.rowId], fields });
  } else {
    await call('channels', 'create', { rows: [{ fields }] });
  }

  console.log('\n写入完成。请刷新前台导航与后台“资料下载”确认。');
}

main().catch((error) => {
  console.error(`执行失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
