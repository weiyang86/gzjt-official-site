#!/usr/bin/env node
/**
 * 内容管理后台模块种子脚本（幂等）
 *
 * 作用：
 * 1. 在 page_modules 中补充“集团概况 → 荣誉资质（honors）”和“信息公开 → 资料下载（downloads）”模块定义；
 * 2. 人才招聘继续复用任务 18 的岗位管理（page_content_items，module_code = recruitment、item_type = job），本脚本不创建公告栏目。
 *
 * 默认只打印将要执行的操作（dry run），加 --apply 才会写入数据 API。
 * 可通过 CMS_DATA_API_URL 指定数据 API 地址。
 */

const baseUrl = (process.env.CMS_DATA_API_URL || 'https://portal.gzjtjt.cn/_plugins/gw/curd').replace(/\/+$/, '');
const apply = process.argv.includes('--apply');

const pageModules = [
  {
    parent_title: '集团概况',
    parent_code: 'group-overview',
    module_title: '荣誉资质',
    module_code: 'honors',
    route_path: '/about',
    content_type: 'image_text',
    admin_enabled: true,
    dev_status: 'enabled',
    placeholder_text: '',
    status_: 'enabled',
    remark: '荣誉资质页面主体与条目维护。',
    sort: 106,
  },
  {
    parent_title: '信息公开',
    parent_code: 'information',
    module_title: '资料下载',
    module_code: 'downloads',
    route_path: '/disclosure/downloads',
    content_type: 'file_list',
    admin_enabled: true,
    dev_status: 'enabled',
    placeholder_text: '',
    status_: 'enabled',
    remark: '资料下载条目与文件维护。',
    sort: 804,
  },
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
  return result.rowIds?.[0] || '';
}

async function main() {
  console.log(`数据 API：${baseUrl}`);
  console.log(`模式：${apply ? '写入' : '预览（dry run）'}`);

  const modules = await readAll('page_modules');
  for (const module of pageModules) {
    const existing = modules.find((row) => row.module_code === module.module_code);
    if (existing) {
      console.log(`- page_modules 已存在 ${module.module_code}，跳过。`);
      continue;
    }
    console.log(`- 将创建 page_modules：${module.module_title}（${module.module_code}）`);
    if (apply) {
      const rowId = await create('page_modules', module);
      console.log(`  已创建，rowId=${rowId}`);
    }
  }

  if (!apply) console.log('\n未写入任何数据。确认后执行：node scripts/migrate/seed-content-admin-modules.mjs --apply');
}

main().catch((error) => {
  console.error('执行失败：', error.message);
  process.exitCode = 1;
});
