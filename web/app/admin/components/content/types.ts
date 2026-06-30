export type MessageState = {
  text: string;
  type?: 'success' | 'error' | 'info';
};

export type PageModule = {
  id: string;
  module_title?: string;
  module_code?: string;
  parent_title?: string;
  parent_code?: string;
  route_path?: string;
  content_type?: string;
  admin_enabled?: boolean;
  dev_status?: 'developing' | 'enabled' | 'disabled' | string;
  placeholder_text?: string;
  remark?: string;
  sort?: number | string;
  status?: 'enabled' | 'disabled' | string;
  date_updated?: string;
};

export type PageModuleGroup = {
  parent_title?: string;
  parent_code?: string;
  modules?: PageModule[];
  children?: PageModule[];
};

export type PageContent = {
  id?: string;
  module_code?: string;
  title?: string;
  subtitle?: string;
  cover?: string | null;
  summary?: string;
  content?: string;
  extra_json?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'archived' | string;
};

export type PageContentItem = {
  id: string;
  module_code?: string;
  item_type?: string;
  title?: string;
  subtitle?: string;
  date_label?: string;
  image?: string | null;
  content?: string;
  link_url?: string;
  sort?: number | string;
  status?: 'enabled' | 'disabled' | string;
  extra_json?: Record<string, unknown>;
};

export type UploadPayload = {
  id?: string;
  filename?: string;
  preview_url?: string;
};
