const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const baseDir = __dirname;
const directusUrl = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/+$/, '');
const sessionSecret = process.env.ADMIN_SESSION_SECRET || 'local-dev-admin-session-secret-change-before-production';
const sessionCookieName = 'gzjt_admin_session';
const sessionMaxAgeSeconds = 60 * 60 * 8;
const adminSessions = new Map();

if (!process.env.ADMIN_SESSION_SECRET) {
    console.warn('[admin-api] ADMIN_SESSION_SECRET is using a local development default. Set a strong secret in production.');
}

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const readFileIfExists = (absPath) => new Promise((resolve) => {
    fs.stat(absPath, (err, stat) => {
        if (err || !stat.isFile()) return resolve(null);
        fs.readFile(absPath, (err2, data) => {
            if (err2) return resolve(null);
            resolve(data);
        });
    });
});

const send = (res, absPath, data) => {
    const ext = path.extname(absPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
};

const sendJson = (res, statusCode, payload, headers = {}) => {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...headers
    });
    res.end(JSON.stringify(payload));
};

const readJsonBody = (req, limitBytes = 1024 * 1024) => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
        raw += chunk;
        if (Buffer.byteLength(raw) > limitBytes) {
            reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
            req.destroy();
        }
    });
    req.on('end', () => {
        if (!raw) return resolve({});
        try {
            resolve(JSON.parse(raw));
        } catch (err) {
            reject(Object.assign(new Error('Invalid JSON request body'), { statusCode: 400 }));
        }
    });
    req.on('error', reject);
});

const parseCookies = (req) => {
    const header = req.headers.cookie || '';
    return header.split(';').reduce((cookies, pair) => {
        const index = pair.indexOf('=');
        if (index < 0) return cookies;
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        if (!key) return cookies;
        cookies[key] = decodeURIComponent(value);
        return cookies;
    }, {});
};

const signSessionId = (sessionId) => crypto
    .createHmac('sha256', sessionSecret)
    .update(sessionId)
    .digest('base64url');

const encodeSessionCookie = (sessionId) => `${sessionId}.${signSessionId(sessionId)}`;

const decodeSessionCookie = (cookieValue) => {
    if (!cookieValue || !cookieValue.includes('.')) return null;
    const [sessionId, signature] = cookieValue.split('.');
    if (!sessionId || !signature) return null;
    const expected = signSessionId(sessionId);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
    return sessionId;
};

const cookieOptions = (maxAgeSeconds) => {
    const parts = [
        `${sessionCookieName}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${maxAgeSeconds}`
    ];
    if (process.env.NODE_ENV === 'production') parts.push('Secure');
    return parts;
};

const createSessionCookie = (sessionId) => {
    const parts = cookieOptions(sessionMaxAgeSeconds);
    parts[0] = `${sessionCookieName}=${encodeURIComponent(encodeSessionCookie(sessionId))}`;
    return parts.join('; ');
};

const clearSessionCookie = () => cookieOptions(0).join('; ');

const createAdminSession = (directusAuth) => {
    const sessionId = crypto.randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + sessionMaxAgeSeconds * 1000;
    adminSessions.set(sessionId, {
        accessToken: directusAuth.access_token,
        refreshToken: directusAuth.refresh_token,
        expiresAt
    });
    return sessionId;
};

const getAdminSession = (req) => {
    const sessionId = decodeSessionCookie(parseCookies(req)[sessionCookieName]);
    if (!sessionId) return null;
    const session = adminSessions.get(sessionId);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
        adminSessions.delete(sessionId);
        return null;
    }
    return { sessionId, ...session };
};

const deleteAdminSession = (req) => {
    const sessionId = decodeSessionCookie(parseCookies(req)[sessionCookieName]);
    if (sessionId) adminSessions.delete(sessionId);
};

const normalizeDirectusError = async (response) => {
    let body = null;
    try { body = await response.json(); } catch (err) {}
    const message = body?.errors?.[0]?.message || body?.message || response.statusText || 'Directus request failed';
    return { message, details: body || null };
};

const directusRequest = async (pathname, options = {}) => {
    const url = `${directusUrl}${pathname}`;
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const directusError = await normalizeDirectusError(response);
            const err = Object.assign(new Error(directusError.message), {
                statusCode: response.status,
                code: 'DIRECTUS_ERROR',
                details: directusError.details
            });
            throw err;
        }
        if (response.status === 204) return null;
        return response.json();
    } catch (err) {
        if (err.code === 'DIRECTUS_ERROR') throw err;
        throw Object.assign(new Error(`Directus is unavailable at ${directusUrl}`), {
            statusCode: 500,
            code: 'DIRECTUS_UNAVAILABLE',
            cause: err
        });
    }
};

const directusJsonRequest = (pathname, token, method = 'GET', body) => directusRequest(pathname, {
    method,
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    },
    ...(body ? { body: JSON.stringify(body) } : {})
});

const articleStatuses = new Set(['draft', 'published', 'archived']);

const buildDirectusPath = (pathname, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
};

const getArticleIdFromPath = (normalizedPath) => {
    const match = normalizedPath.match(/^\/admin-api\/articles\/([^/]+)(?:\/(archive|publish|draft))?$/);
    if (!match) return null;
    return {
        id: decodeURIComponent(match[1]),
        action: match[2] || null
    };
};

const normalizePagination = (rawPage, rawLimit) => {
    const page = Math.max(1, Number.parseInt(rawPage || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(rawLimit || '10', 10) || 10));
    return { page, limit };
};

const normalizeChannelRecord = (channel) => ({
    id: String(channel?.id ?? ''),
    name: channel?.name || '',
    slug: channel?.slug || '',
    status: channel?.status || '',
    sort: Number(channel?.sort) || 0
});

const loadNewsChannels = async (token) => {
    const channels = await directusJsonRequest(buildDirectusPath('/items/channels', {
        fields: 'id,name,slug,status,sort,type',
        sort: 'sort,name',
        limit: 100,
        'filter[status][_eq]': 'enabled',
        'filter[type][_eq]': 'news'
    }), token);
    return (channels?.data || []).map(normalizeChannelRecord);
};

const buildChannelMaps = (channels) => {
    const byId = new Map();
    const bySlug = new Map();
    channels.forEach((channel) => {
        byId.set(String(channel.id), channel);
        if (channel.slug) bySlug.set(channel.slug, channel);
    });
    return { byId, bySlug };
};

const mapArticleRecord = (article, channelMap) => {
    const rawChannel = article?.main_channel;
    const channelId = rawChannel && typeof rawChannel === 'object'
        ? String(rawChannel.id || '')
        : (rawChannel === null || rawChannel === undefined ? '' : String(rawChannel));
    const fallbackChannel = channelMap.get(channelId) || null;
    return {
        ...article,
        main_channel: channelId
            ? {
                id: channelId,
                name: rawChannel?.name || fallbackChannel?.name || '',
                slug: rawChannel?.slug || fallbackChannel?.slug || ''
            }
            : null
    };
};

const buildArticleListPath = (req, channelId) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const { page, limit } = normalizePagination(parsedUrl.searchParams.get('page'), parsedUrl.searchParams.get('limit'));
    const keyword = (parsedUrl.searchParams.get('keyword') || '').trim();
    const status = (parsedUrl.searchParams.get('status') || '').trim();
    const params = {
        fields: 'id,title,subtitle,summary,main_channel,status,publish_at,source,author',
        sort: '-publish_at,-id',
        page,
        limit,
        meta: 'filter_count'
    };

    if (keyword) {
        params['filter[_or][0][title][_contains]'] = keyword;
        params['filter[_or][1][summary][_contains]'] = keyword;
        params['filter[_or][2][subtitle][_contains]'] = keyword;
    }
    if (channelId) params['filter[main_channel][_eq]'] = channelId;
    if (status && articleStatuses.has(status)) params['filter[status][_eq]'] = status;

    return buildDirectusPath('/items/articles', params);
};

const getArticleDetailPath = (id) => buildDirectusPath(`/items/articles/${encodeURIComponent(id)}`, {
    fields: 'id,title,subtitle,summary,content,main_channel,status,publish_at,source,author,is_top,is_home_recommend'
});

const normalizeArticleInput = (body, fallbackStatus) => {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const rawMainChannel = body.main_channel || body.channel || null;
    const mainChannel = rawMainChannel === '' || rawMainChannel === undefined || rawMainChannel === null
        ? null
        : Number.parseInt(String(rawMainChannel), 10);
    const status = articleStatuses.has(body.status) ? body.status : fallbackStatus;
    const content = typeof body.content === 'string' ? body.content : '';
    const payload = {
        title,
        subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim() : '',
        summary: typeof body.summary === 'string' ? body.summary.trim() : '',
        content,
        main_channel: mainChannel,
        source: typeof body.source === 'string' ? body.source.trim() : '',
        author: typeof body.author === 'string' ? body.author.trim() : '',
        publish_at: body.publish_at || (status === 'published' ? new Date().toISOString() : null),
        status
    };

    if (!payload.title) {
        throw Object.assign(new Error('title is required'), { statusCode: 400 });
    }
    if (rawMainChannel !== '' && rawMainChannel !== undefined && rawMainChannel !== null && !Number.isFinite(mainChannel)) {
        throw Object.assign(new Error('main_channel is invalid'), { statusCode: 400 });
    }
    if (status === 'published' && !payload.main_channel) {
        throw Object.assign(new Error('main_channel is required'), { statusCode: 400 });
    }
    if (status === 'published' && !payload.content.trim()) {
        throw Object.assign(new Error('content is required'), { statusCode: 400 });
    }
    return payload;
};

const updateArticleStatus = (id, status, token) => directusJsonRequest(`/items/articles/${encodeURIComponent(id)}`, token, 'PATCH', {
    status,
    ...(status === 'published' ? { publish_at: new Date().toISOString() } : {})
});

const requireAdminAuth = (req, res) => {
    const session = getAdminSession(req);
    if (!session) {
        sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Admin login required' } });
        return null;
    }
    return session;
};

const sendAdminError = (res, err) => {
    if (err.statusCode === 401) {
        return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Admin login required' } });
    }
    if (err.statusCode === 403) {
        return sendJson(res, 403, { error: { code: 'FORBIDDEN', message: 'Directus denied this operation' } });
    }
    if (err.code === 'DIRECTUS_UNAVAILABLE') {
        return sendJson(res, 500, { error: { code: 'DIRECTUS_UNAVAILABLE', message: err.message } });
    }
    if (err.statusCode === 400 || err.statusCode === 413) {
        return sendJson(res, err.statusCode, { error: { code: 'BAD_REQUEST', message: err.message } });
    }
    return sendJson(res, 500, { error: { code: 'SERVER_ERROR', message: 'Admin API service error' } });
};

const handleAdminApi = async (req, res, normalizedPath) => {
    try {
        if (normalizedPath === '/admin-api/login' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const email = typeof body.email === 'string' ? body.email.trim() : '';
            const password = typeof body.password === 'string' ? body.password : '';
            if (!email || !password) {
                return sendJson(res, 400, { error: { code: 'BAD_REQUEST', message: 'email and password are required' } });
            }

            const loginResult = await directusRequest('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const authData = loginResult?.data;
            if (!authData?.access_token) {
                return sendJson(res, 500, { error: { code: 'DIRECTUS_LOGIN_ERROR', message: 'Directus login response did not include an access token' } });
            }

            const sessionId = createAdminSession(authData);
            return sendJson(res, 200, { ok: true }, { 'Set-Cookie': createSessionCookie(sessionId) });
        }

        if (normalizedPath === '/admin-api/logout' && req.method === 'POST') {
            deleteAdminSession(req);
            return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
        }

        if (normalizedPath === '/admin-api/me' && req.method === 'GET') {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            const me = await directusJsonRequest('/users/me?fields=id,email,first_name,last_name,role.id,role.name,role.description', session.accessToken);
            return sendJson(res, 200, { data: me?.data || null });
        }

        if (normalizedPath === '/admin-api/channels' && req.method === 'GET') {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            const channels = await loadNewsChannels(session.accessToken);
            return sendJson(res, 200, { data: channels });
        }

        if (normalizedPath === '/admin-api/articles' && req.method === 'GET') {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            const channels = await loadNewsChannels(session.accessToken);
            const { byId, bySlug } = buildChannelMaps(channels);
            const parsedUrl = new URL(req.url, 'http://localhost');
            const channelSlug = (parsedUrl.searchParams.get('channel') || '').trim();
            const channelId = channelSlug ? bySlug.get(channelSlug)?.id || null : null;
            if (channelSlug && !channelId) {
                return sendJson(res, 200, { data: [], meta: { filter_count: 0 } });
            }
            const articles = await directusJsonRequest(buildArticleListPath(req, channelId), session.accessToken);
            return sendJson(res, 200, {
                data: (articles?.data || []).map((item) => mapArticleRecord(item, byId)),
                meta: articles?.meta || null
            });
        }

        if (normalizedPath === '/admin-api/articles' && req.method === 'POST') {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            const body = await readJsonBody(req);
            const articlePayload = normalizeArticleInput(body, 'draft');
            const article = await directusJsonRequest('/items/articles', session.accessToken, 'POST', articlePayload);
            return sendJson(res, 201, { data: article?.data || null });
        }

        const articleRoute = getArticleIdFromPath(normalizedPath);
        if (articleRoute) {
            const session = requireAdminAuth(req, res);
            if (!session) return;

            if (!articleRoute.action && req.method === 'GET') {
                const channels = await loadNewsChannels(session.accessToken);
                const { byId } = buildChannelMaps(channels);
                const article = await directusJsonRequest(getArticleDetailPath(articleRoute.id), session.accessToken);
                return sendJson(res, 200, { data: article?.data ? mapArticleRecord(article.data, byId) : null });
            }

            if (!articleRoute.action && req.method === 'PATCH') {
                const body = await readJsonBody(req);
                const articlePayload = normalizeArticleInput(body, body.status || 'draft');
                const article = await directusJsonRequest(`/items/articles/${encodeURIComponent(articleRoute.id)}`, session.accessToken, 'PATCH', articlePayload);
                return sendJson(res, 200, { data: article?.data || null });
            }

            if (articleRoute.action && req.method === 'PATCH') {
                const statusMap = { archive: 'archived', publish: 'published', draft: 'draft' };
                const nextStatus = statusMap[articleRoute.action];
                const article = await updateArticleStatus(articleRoute.id, nextStatus, session.accessToken);
                return sendJson(res, 200, { data: article?.data || null });
            }
        }

        if (normalizedPath.startsWith('/admin-api/files')) {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            return sendJson(res, 501, { error: { code: 'NOT_IMPLEMENTED', message: 'File upload will be implemented in a later task' } });
        }

        return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Admin API endpoint not found' } });
    } catch (err) {
        return sendAdminError(res, err);
    }
};

const homeEntry = '/index.html';

http.createServer((req, res) => {
    const rawUrl = req.url || '/';
    const urlPath = rawUrl.split('?')[0].split('#')[0];
    const pathname = urlPath === '/' ? homeEntry : urlPath;
    let decodedPath = pathname;
    try { decodedPath = decodeURIComponent(pathname); } catch (e) {}
    const normalizedPath = path.posix.normalize(decodedPath.replace(/\\/g, '/'));
    const normalizedNoSlash = normalizedPath.replace(/\/+$/, '') || '/';

    if (normalizedPath === '/admin-api' || normalizedPath.startsWith('/admin-api/')) {
        handleAdminApi(req, res, normalizedPath);
        return;
    }

    const redirectMap = {
        '/group': '/pages/about/index.html',
        '/news-center': '/pages/news/index.html',
        '/business-dev': '/pages/business/index.html',
        '/party-masses': '/pages/party/index.html',
        '/social-responsibility': '/pages/responsibility/index.html',
        '/contact-us': '/pages/contact/index.html'
    };

    const legacySubsidiaryMatch = normalizedNoSlash.match(/^\/subsidiaries\/([^/]+)\/news$/);
    if (legacySubsidiaryMatch) {
        res.writeHead(302, { Location: `/subsidiaries/${legacySubsidiaryMatch[1]}/dynamics` });
        res.end();
        return;
    }

    const redirectTo = redirectMap[normalizedNoSlash];
    if (redirectTo) {
        res.writeHead(302, { Location: redirectTo });
        res.end();
        return;
    }

    const isAssetRequest = path.posix.extname(normalizedPath) !== '';
    const candidates = [];

    if (normalizedPath === homeEntry || normalizedPath.startsWith('/pages/') || isAssetRequest) {
        candidates.push(normalizedPath);
    } else {
        const clean = normalizedNoSlash;
        const heroListRoots = new Set(['/business-dynamics', '/clean-gov', '/subsidiaries', '/disclosure']);
        candidates.push(`/pages${clean}/index.html`);
        if (heroListRoots.has(clean)) candidates.push('/pages/_hero-list/index.html');
        candidates.push('/pages/_list/index.html');
        candidates.push('/pages/_placeholder/index.html');
    }

    const tryNext = async (idx) => {
        if (idx >= candidates.length) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const safePath = path.posix.normalize(candidates[idx]).replace(/^(\.\.(\/|\\|$))+/, '');
        const absPath = path.join(baseDir, safePath);
        if (!absPath.startsWith(baseDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        const data = await readFileIfExists(absPath);
        if (!data) return tryNext(idx + 1);
        send(res, absPath, data);
    };

    tryNext(0);
}).listen(Number(process.env.PORT) || 3010, () => {
    const port = Number(process.env.PORT) || 3010;
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Admin API proxy target: ${directusUrl}`);
});
