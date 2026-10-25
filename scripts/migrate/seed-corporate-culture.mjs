#!/usr/bin/env node
/**
 * 企业文化模块种子脚本（幂等）
 *
 * 作用：
 * 1. 在 page_modules 中创建 corporate-culture 模块定义（集团概况 → 企业文化）；
 * 2. 在 page_contents 中创建企业文化栏目基础内容；
 * 3. 在 page_content_items 中创建使命、愿景、企业精神、企业宗旨、廉洁理念、经营理念卡片。
 *
 * 默认只打印将要执行的操作（dry run），加 --apply 才会写入数据 API。
 * 可通过 CMS_DATA_API_URL 指定数据 API 地址。
 */

const MODULE_CODE = 'corporate-culture';
const ITEM_TYPE = 'culture';

const baseUrl = (process.env.CMS_DATA_API_URL || 'https://portal.gzjtjt.cn/_plugins/gw/curd').replace(/\/+$/, '');
const apply = process.argv.includes('--apply');

const pageModule = {
  parent_title: '集团概况',
  parent_code: 'group-overview',
  module_title: '企业文化',
  module_code: MODULE_CODE,
  route_path: '/about',
  content_type: 'culture',
  admin_enabled: true,
  dev_status: 'enabled',
  placeholder_text: '',
  status_: 'enabled',
  remark: '企业文化栏目基础信息与图文卡片维护。',
  sort: 105,
};

const pageContent = {
  module_code: MODULE_CODE,
  title: '企业文化',
  subtitle: '以使命凝聚方向、以愿景校准目标、以精神塑造作风、以理念规范经营，让建设者文化转化为推动高质量发展的组织动力。',
  summary: '',
  content: '企业文化是集团在长期建设实践中形成的共同价值追求和行为准则，覆盖使命、愿景、企业精神、企业宗旨、廉洁理念和经营理念，为集团高质量发展提供持久的精神动力。',
  extra_json: '{}',
  status_: 'published',
};

const cultureItems = [
  {
    title: '使命',
    subtitle: '铺筑人民幸福之路 建造甘孜发展之基',
    content: '把项目建设成果转化为群众出行便利、城乡品质提升和区域发展动能，让每一项工程都成为支撑民生、服务大局的坚实底盘。',
  },
  {
    title: '愿景',
    subtitle: '打造涉藏地区建设领域一流综合性投资运营商',
    content: '围绕“投资、建设、运营、服务”全链条能力建设，持续增强区域竞争力、专业化服务能力与国企品牌影响力。',
  },
  {
    title: '企业精神',
    subtitle: '赤诚奉献 克难奋进 求实求精 创新有为',
    content: '以共同的价值追求凝聚队伍，在急难险重任务中锤炼作风，把精神力量转化为攻坚克难的行动力。',
  },
  {
    title: '企业宗旨',
    subtitle: '匠心筑路 畅通甘孜 建者无疆 善作善成',
    content: '把工程品质、履约效率和区域价值创造放在同等重要的位置，以建设者担当回应时代与发展需求。',
  },
  {
    title: '廉洁理念',
    subtitle: '守住道德底线 不触法纪红线',
    content: '把廉洁从业贯穿投资决策、工程建设、经营管理全过程，以清正作风护航企业持续健康发展。',
  },
  {
    title: '经营理念',
    subtitle: '科学发展，诚实守信，质效至上，价值创造，守法合规，行稳致远',
    content: '以规范经营和长期主义为导向，统筹发展质量、经营效益与风险防控。',
  },
].map((item, index) => ({
  module_code: MODULE_CODE,
  item_type: ITEM_TYPE,
  title: item.title,
  subtitle: item.subtitle,
  content: item.content,
  image: '',
  sort: index + 1,
  status_: 'enabled',
  extra_json: '{}',
}));

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

async function main() {
  console.log(`数据 API：${baseUrl}`);
  console.log(`模式：${apply ? '写入' : '预览（dry run）'}`);

  const modules = await readAll('page_modules');
  const existingModule = modules.find((row) => row.module_code === MODULE_CODE);
  if (existingModule) {
    console.log(`- page_modules 已存在 ${MODULE_CODE}，跳过创建。`);
  } else {
    console.log(`- 将创建 page_modules：${pageModule.module_title}（${MODULE_CODE}）`);
    if (apply) {
      const rowId = await create('page_modules', pageModule);
      console.log(`  已创建，rowId=${rowId}`);
    }
  }

  const contents = await readAll('page_contents');
  const existingContent = contents.find((row) => row.module_code === MODULE_CODE);
  if (existingContent) {
    console.log(`- page_contents 已存在 ${MODULE_CODE}，跳过创建。`);
  } else {
    console.log('- 将创建 page_contents：企业文化栏目基础信息');
    if (apply) {
      const rowId = await create('page_contents', pageContent);
      console.log(`  已创建，rowId=${rowId}`);
    }
  }

  const items = await readAll('page_content_items');
  const existingTitles = new Set(
    items.filter((row) => row.module_code === MODULE_CODE && row.item_type === ITEM_TYPE).map((row) => row.title),
  );
  const pendingItems = cultureItems.filter((item) => !existingTitles.has(item.title));
  if (!pendingItems.length) {
    console.log(`- page_content_items 的 ${ITEM_TYPE} 卡片已存在，跳过创建。`);
  } else {
    pendingItems.forEach((item) => console.log(`- 将创建文化卡片：${item.title} / ${item.subtitle}`));
    if (apply) {
      for (const item of pendingItems) {
        const rowId = await create('page_content_items', item);
        console.log(`  已创建 ${item.title}，rowId=${rowId}`);
      }
    }
  }

  if (!apply) console.log('\n未写入任何数据。确认后执行：node scripts/migrate/seed-corporate-culture.mjs --apply');
}

main().catch((error) => {
  console.error('执行失败：', error.message);
  process.exitCode = 1;
});
