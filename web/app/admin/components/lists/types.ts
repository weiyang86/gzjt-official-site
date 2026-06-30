export type AdminScope = 'news' | 'notice';

export type Channel = {
  id: string;
  name?: string;
  slug?: string;
};

export type ArticleRow = {
  id: string;
  title?: string;
  cover?: string | { id?: string };
  main_channel?: Channel;
  status?: 'draft' | 'published' | 'archived' | string;
  publish_at?: string;
};

export type CategoryRow = {
  id: string;
  name?: string;
  slug?: string;
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
