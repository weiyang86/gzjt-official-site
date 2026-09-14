#!/usr/bin/env node
import { parseLegacyDate } from './legacy-site-crawler.mjs';

const samples = process.argv.slice(2);
const inputs = samples.length ? samples : [
  '2026-06-09',
  '2026/06/09',
  '2026年06月09日',
  '2026-06-09 09:34:20',
  '2026/06/09 09:34:20',
  '2026年06月09日 09:34:20',
  '2026-6-9',
  '甘孜建设投资集团召开会议 2026-06-09',
  '无日期文本'
];

for (const input of inputs) {
  console.log(JSON.stringify({ input, parsed: parseLegacyDate(input) }, null, 2));
}
