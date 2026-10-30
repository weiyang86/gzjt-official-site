export type AdminScope = 'news' | 'notice';

export type Channel = {
  id: string;
  name?: string;
  slug?: string;
  parent?: string | { id?: string; name?: string } | null;
  status?: string;
  sort?: number;
};

export type ArticleRow = {
  id: string;
  title?: string;
  cover?: string | { id?: string };
  main_channel?: Channel;
  main_channels?: Channel[];
  status?: 'draft' | 'published' | 'archived' | string;
  publish_at?: string;
  is_top?: boolean;
  is_home_recommend?: boolean;
  sort?: number;
};

export type CategoryRow = {
  id: string;
  name?: string;
  slug?: string;
  parent?: string | { id?: string; name?: string } | null;
  type?: string;
  path?: string;
  sort?: number;
  visible?: boolean;
  status?: 'enabled' | 'disabled' | string;
  description?: string;
};

export type MessageState = {
  text: string;
  type?: 'success' | 'error';
};
