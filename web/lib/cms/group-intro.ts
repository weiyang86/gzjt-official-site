export type GroupIntroStat = { value: string; label: string };
export type GroupIntroAchievement = {
  value: string;
  label: string;
  accent: string;
  target?: number;
  decimals?: number;
  suffix?: string;
};
export type GroupIntroConfig = {
  profileMarker: string;
  profileBadges: string[];
  heroStats: GroupIntroStat[];
  principleLabel: string;
  principleTitle: string;
  principleEnglish: string[];
  principleImage: string;
  performanceTitle: string;
  performanceLead: string;
  achievements: GroupIntroAchievement[];
  performanceParagraphs: string[];
  missionTitle: string;
  missionParagraphs: string[];
};

// 后台初始表单值源自原 /about 页面现有文案；只有管理员保存后才会写入 API。
export const defaultGroupIntroConfig: GroupIntroConfig = {
  profileMarker: '州属一级国有企业',
  profileBadges: ['投融资', '建设开发', '资产经营', '工程服务'],
  heroStats: [
    { value: '10亿元', label: '注册资本' },
    { value: '85.56亿元', label: '总资产' },
    { value: '9家', label: '二级子公司' },
    { value: '17个', label: '专业资质' },
  ],
  principleLabel: '企业宗旨',
  principleTitle: '匠心筑路 畅通甘孜\n建者无疆 善作善成',
  principleEnglish: ['INGENUITY BUILDS ROADS, SMOOTH GANZI', 'BUILDERS ARE BOUNDLESS, GOOD DEEDS'],
  principleImage: '',
  performanceTitle: '建设与经营成果',
  performanceLead: '集团自组建以来，在州委、州政府的坚强领导下，在州国资委、州交通运输局、州住房和城乡建设局的精心指导下，紧绕“交通先行”“城乡提升”“乡村振兴”战略，全力抓好重点交通和城建项目建设及企业经营发展等工作。',
  achievements: [
    { value: '50个', label: '近5年承担国省公路改扩建项目', accent: '项目集群', target: 50, suffix: '个' },
    { value: '2248.4公里', label: '建设里程', accent: '通达里程', target: 2248.4, decimals: 1, suffix: '公里' },
    { value: '175.6亿元', label: '完成投资', accent: '投资强度', target: 175.6, decimals: 1, suffix: '亿元' },
    { value: '13.38亿元', label: '累计营业收入', accent: '经营质效', target: 13.38, decimals: 2, suffix: '亿元' },
    { value: '1.74亿元', label: '累计利润总额', accent: '价值创造', target: 1.74, decimals: 2, suffix: '亿元' },
    { value: '27% / 19%', label: '营收与利润年均增长率', accent: '年均增长' },
  ],
  performanceParagraphs: [
    '近5年来，集团共承担CZ铁路配套公路、“9.5”泸定灾后重建、大香格里拉交旅融合等50个2248.4公里的国省公路改扩建项目，完成投资175.6亿元，以万里通途托起沿线百姓的团结梦、致富梦、发展梦。',
    '集团累计实现营业收入13.38亿元、实现利润总额1.74亿元，年均增长率分别为27%、19%。',
  ],
  missionTitle: '铺筑人民幸福之路，建造甘孜发展之基',
  missionParagraphs: [
    '近年来，集团公司紧扣州委“12345”总体工作格局，紧紧围绕集团“1344”发展战略目标，秉承“铺筑人民幸福之路、建造甘孜发展之基”的企业使命，以“赤诚奉献、克难奋进、求实求精、创新有为”的企业精神，按照“科学发展，诚实守信，质效至上，价值创造，守法合规，行稳致远”的经营理念，全力打造涉藏地区交通产业为引领的一流综合性投资运营商。',
    '集团将持续为建设和谐美丽现代化新甘孜、加快涉藏地区交通基础设施建设步伐、筑牢中华民族共同体意识贡献建投力量。',
  ],
};

export function getGroupIntroConfig(extraJson: unknown): Partial<GroupIntroConfig> {
  if (!extraJson || typeof extraJson !== 'object' || Array.isArray(extraJson)) return {};
  const groupIntro = (extraJson as Record<string, unknown>).groupIntro;
  return groupIntro && typeof groupIntro === 'object' && !Array.isArray(groupIntro)
    ? groupIntro as Partial<GroupIntroConfig>
    : {};
}
