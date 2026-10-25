#!/usr/bin/env node
/**
 * 群团工作模块启用脚本（幂等）
 *
 * 作用：
 * 1. 启用 page_modules 中的群团工作模块：mass-work、union-work、youth-work；
 * 2. 核对 channels 中的工会工作、青年工作、统战工作分类，缺失时按党建群团子栏目创建。
 *
 * 默认只打印将要执行的操作（dry run），加 --apply 才会写入数据 API。
 * 可通过 CMS_DATA_API_URL 指定数据 API 地址。
 */

const baseUrl = (process.env.CMS_DATA_API_URL || 'https://portal.gzjtjt.cn/_plugins/gw/curd').replace(/\/+$/, '');
const apply = process.argv.includes('--apply');

const targetModuleCodes = ['mass-work', 'union-work', 'youth-work'];
const enabledModuleFields = [
  { id: 'admin_enabled', value: true },
  { id: 'dev_status', value: 'enabled' },
  { id: 'placeholder_text', value: '' },
  { id: 'remark', value: '群团工作分类发布与浏览已接入新闻管理。' },
];

const channelSeeds = [
  { name: '工会工作', slug: 'party-union-work', path: '/party-union-work', sort: 5 },
  { name: '青年工作', slug: 'party-youth-work', path: '/party-youth-work', sort: 6 },
  { name: '统战工作', slug: 'party-united-front-work', path: '/party-united-front-work', sort: 7 },
];

async function call(table, method, data) {
  const response = await fetch(baseUrl, {
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
  const rows = [];
  for (let pageIndex = 1; ; pageIndex += 1) {
    const result = await call(table, 'read', { pageSize: 1000, pageIndex, includeTotalCount: true });
    const page = result.rows || [];
    rows.push(...page);
    if (page.length < 1000 || rows.length >= Number(result.total || 0)) return rows;
  }
}

const toFields = (record) => Object.entries(record).map(([id, value]) => ({ id, value }));

async function create(table, record) {
  const result = await call(table, 'create', { rows: [{ fields: toFields(record) }], triggerWorkflow: false });
  const rowId = result.rowIds?.[0];
  if (!rowId) throw new Error(`Data API 未返回 ${table} 的新记录 ID`);
  return rowId;
}

async function update(table, rowIds, fields) {
  const result = await call(table, 'update', { rowIds, fields, triggerWorkflow: false });
  const failed = result.failedRowIds || [];
  if (failed.length) throw new Error(`${table} 更新失败：${failed.join(', ')}`);
  return result;
}

async function main() {
  console.log(`数据 API：${baseUrl}`);
  console.log(`模式：${apply ? '写入' : '预览（dry run）'}`);

  const isModuleEnabled = (row) => {
    const flag = String(row.admin_enabled ?? '').trim().toLowerCase();
    return flag === 'true' || flag === '1';
  };

  const modules = await readAll('page_modules');
  const pendingModules = targetModuleCodes
    .map((code) => modules.find((row) => row.module_code === code))
    .filter(Boolean)
    .filter((row) => !isModuleEnabled(row) || row.dev_status !== 'enabled' || String(row.placeholder_text || '').trim());

  if (!pendingModules.length) {
    console.log('- page_modules 的群团工作模块均已启用，跳过更新。');
  } else {
    pendingModules.forEach((row) => console.log(`- 将启用 page_modules：${row.module_title}（${row.module_code}）`));
    if (apply) {
      const result = await update('page_modules', pendingModules.map((row) => row.rowId), enabledModuleFields);
      console.log(`  已启用 ${pendingModules.length} 个模块，successfulRowIds=${(result.succeededRowIds || result.successfulRowIds || []).length}`);
    }
  }

  const channels = await readAll('channels');
  const parentChannel = channels.find((row) => row.slug === 'party-mass');
  if (!parentChannel) {
    throw new Error('未找到党建群团栏（slug=party-mass），请先确认栏目数据。');
  }

  const existingSlugs = new Set(channels.map((row) => row.slug));
  const pendingChannels = channelSeeds.filter((seed) => !existingSlugs.has(seed.slug));
  if (!pendingChannels.length) {
    console.log('- channels 的工会工作、青年工作、统战工作分类已存在，跳过创建。');
  } else {
    pendingChannels.forEach((seed) => console.log(`- 将创建 channels 分类：${seed.name}（${seed.slug}）`));
    if (apply) {
      for (const seed of pendingChannels) {
        const rowId = await create('channels', {
          name: seed.name,
          slug: seed.slug,
          parent: parentChannel.rowId,
          type: 'list',
          path: seed.path,
          sort: seed.sort,
          visible: true,
          status_: 'enabled',
          is_news_category: true,
          description: '',
          source_file: '',
        });
        console.log(`  已创建 ${seed.name}，rowId=${rowId}`);
      }
    }
  }

  if (!apply) console.log('\n未写入任何数据。确认后执行：node scripts/migrate/seed-mass-work.mjs --apply');
}

main().catch((error) => {
  console.error('执行失败：', error.message);
  process.exitCode = 1;
});
