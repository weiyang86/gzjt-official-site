// 项目类型主数据：后台表单与前台筛选共用，避免两处各写一份导致选项不一致。
export const projectTypeOptions = ['交通工程', '房建工程', '文旅开发', '产业投资'] as const;

export const isPresetProjectType = (value?: string | null): boolean => (
  Boolean(value && (projectTypeOptions as readonly string[]).includes(value))
);
