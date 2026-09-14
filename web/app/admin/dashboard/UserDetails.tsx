'use client';

import { useEffect, useState } from 'react';
import { AdminApi, type AdminUser } from '@/lib/admin/admin-api';
import { getAdminDisplayName } from '../components/admin-user';

const valueOrDash = (value?: string) => value || '-';

export function UserDetails() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    AdminApi.me()
      .then((result) => {
        if (!isMounted) return;
        if (!result.data) {
          AdminApi.redirectToLogin();
          return;
        }
        setUser(result.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        const status = typeof err === 'object' && err && 'status' in err ? err.status : undefined;
        if (status !== 401) setError(err instanceof Error ? err.message : '账号信息加载失败');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <dl className="user-details">
        <div>
          <dt>状态</dt>
          <dd>{error}</dd>
        </div>
      </dl>
    );
  }

  if (!user) {
    return (
      <dl className="user-details">
        <div>
          <dt>状态</dt>
          <dd>正在加载...</dd>
        </div>
      </dl>
    );
  }

  return (
    <dl className="user-details">
      <div>
        <dt>邮箱</dt>
        <dd>{valueOrDash(user.email)}</dd>
      </div>
      <div>
        <dt>姓名</dt>
        <dd>{getAdminDisplayName(user)}</dd>
      </div>
      <div>
        <dt>角色</dt>
        <dd>{valueOrDash(user.role?.name)}</dd>
      </div>
    </dl>
  );
}
