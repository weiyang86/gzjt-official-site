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
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxUploadBytes = 10 * 1024 * 1024;
const maxMultipartBytes = 12 * 1024 * 1024;

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

const buildArticleListPath = (req) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const { page, limit } = normalizePagination(parsedUrl.searchParams.get('page'), parsedUrl.searchParams.get('limit'));
    const keyword = (parsedUrl.searchParams.get('keyword') || '').trim();
    const channel = (parsedUrl.searchParams.get('channel') || '').trim();
    const status = (parsedUrl.searchParams.get('status') || '').trim();
    const params = {
        fields: 'id,title,subtitle,summary,cover,main_channel.id,main_channel.name,main_channel.slug,status,publish_at,source,author',
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
    if (channel) params['filter[main_channel][slug][_eq]'] = channel;
    if (status && articleStatuses.has(status)) params['filter[status][_eq]'] = status;

    return buildDirectusPath('/items/articles', params);
};

const getChannelsPath = () => buildDirectusPath('/items/channels', {
    fields: 'id,name,slug,type,path,sort,status,visible',
    sort: 'sort,id',
    limit: 100,
    'filter[status][_eq]': 'enabled',
    'filter[visible][_eq]': 'true',
    'filter[type][_eq]': 'news'
});

const getArticleDetailPath = (id) => buildDirectusPath(`/items/articles/${encodeURIComponent(id)}`, {
    fields: 'id,title,subtitle,summary,content,cover,main_channel.id,main_channel.name,main_channel.slug,status,publish_at,source,author,is_top,is_home_recommend'
});

const normalizeArticleInput = (body, fallbackStatus) => {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const mainChannel = body.main_channel || body.channel || null;
    const status = articleStatuses.has(body.status) ? body.status : fallbackStatus;
    const payload = {
        title,
        subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim() : '',
        summary: typeof body.summary === 'string' ? body.summary.trim() : '',
        content: typeof body.content === 'string' ? body.content : '',
        cover: body.cover || null,
        main_channel: mainChannel,
        source: typeof body.source === 'string' ? body.source.trim() : '',
        author: typeof body.author === 'string' ? body.author.trim() : '',
        publish_at: body.publish_at || new Date().toISOString(),
        status
    };

    if (!payload.title) {
        throw Object.assign(new Error('title is required'), { statusCode: 400 });
    }
    if (!payload.main_channel) {
        throw Object.assign(new Error('main_channel is required'), { statusCode: 400 });
    }
    return payload;
};

const updateArticleStatus = (id, status, token) => directusJsonRequest(`/items/articles/${encodeURIComponent(id)}`, token, 'PATCH', {
    status,
    ...(status === 'published' ? { publish_at: new Date().toISOString() } : {})
});

const readRawBody = (req, limitBytes = maxMultipartBytes) => new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
        total += chunk.length;
        if (total > limitBytes) {
            reject(Object.assign(new Error('File upload is too large. Maximum size is 10MB.'), { statusCode: 413 }));
            req.destroy();
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
});

const getMultipartBoundary = (contentType) => {
    const match = String(contentType || '').match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i);
    return match ? (match[1] || match[2] || '').trim() : '';
};

const parseMultipartFileInfo = (bodyBuffer, boundary) => {
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    let searchFrom = 0;
    while (searchFrom < bodyBuffer.length) {
        const partStart = bodyBuffer.indexOf(boundaryBuffer, searchFrom);
        if (partStart < 0) break;
        const headerStart = partStart + boundaryBuffer.length + 2;
        const headerEnd = bodyBuffer.indexOf('\r\n\r\n', headerStart, 'latin1');
        if (headerEnd < 0) break;
        const headersText = bodyBuffer.slice(headerStart, headerEnd).toString('utf8');
        const contentStart = headerEnd + 4;
        const nextBoundary = bodyBuffer.indexOf(Buffer.from(`\r\n--${boundary}`), contentStart);
        if (nextBoundary < 0) break;
        searchFrom = nextBoundary + 2;

        if (!/filename=/i.test(headersText)) continue;
        const nameMatch = headersText.match(/name="([^"]+)"/i);
        const filenameMatch = headersText.match(/filename="([^"]*)"/i);
        const typeMatch = headersText.match(/content-type:\s*([^\r\n]+)/i);
        const filename = filenameMatch ? filenameMatch[1] : '';
        const type = typeMatch ? typeMatch[1].trim().toLowerCase() : '';
        const size = Math.max(0, nextBoundary - contentStart);
        return { fieldName: nameMatch ? nameMatch[1] : '', filename, type, size };
    }
    return null;
};

const validateUpload = (req, bodyBuffer) => {
    const contentType = req.headers['content-type'] || '';
    if (!String(contentType).toLowerCase().startsWith('multipart/form-data')) {
        throw Object.assign(new Error('multipart/form-data is required'), { statusCode: 400 });
    }
    const boundary = getMultipartBoundary(contentType);
    if (!boundary) throw Object.assign(new Error('multipart boundary is missing'), { statusCode: 400 });
    const fileInfo = parseMultipartFileInfo(bodyBuffer, boundary);
    if (!fileInfo || !fileInfo.filename) {
        throw Object.assign(new Error('image file is required'), { statusCode: 400 });
    }
    if (!allowedImageTypes.has(fileInfo.type)) {
        throw Object.assign(new Error('Only JPG, PNG, and WEBP images are allowed'), { statusCode: 400 });
    }
    if (fileInfo.size > maxUploadBytes) {
        throw Object.assign(new Error('File upload is too large. Maximum size is 10MB.'), { statusCode: 413 });
    }
    return fileInfo;
};

const directusUploadRequest = async (req, token) => {
    const bodyBuffer = await readRawBody(req);
    const fileInfo = validateUpload(req, bodyBuffer);
    const uploadResult = await directusRequest('/files', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': req.headers['content-type']
        },
        body: bodyBuffer
    });
    const fileData = uploadResult?.data;
    if (!fileData?.id) {
        throw Object.assign(new Error('Directus upload response did not include a file id'), { statusCode: 500 });
    }
    return {
        id: fileData.id,
        filename: fileData.filename_download || fileData.filename_disk || fileInfo.filename,
        type: fileData.type || fileInfo.type,
        filesize: fileData.filesize || fileInfo.size,
        preview_url: `/admin-api/assets/${encodeURIComponent(fileData.id)}`
    };
};

const proxyDirectusAsset = async (id, token, res) => {
    try {
        const response = await fetch(`${directusUrl}/assets/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
            const err = Object.assign(new Error('Directus asset request failed'), { statusCode: response.status, code: 'DIRECTUS_ERROR' });
            throw err;
        }
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const cacheControl = response.headers.get('cache-control') || 'private, max-age=300';
        const arrayBuffer = await response.arrayBuffer();
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cacheControl });
        res.end(Buffer.from(arrayBuffer));
    } catch (err) {
        sendAdminError(res, err);
    }
};

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
            const channels = await directusJsonRequest(getChannelsPath(), session.accessToken);
            return sendJson(res, 200, { data: channels?.data || [] });
        }

        if (normalizedPath === '/admin-api/articles' && req.method === 'GET') {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            const articles = await directusJsonRequest(buildArticleListPath(req), session.accessToken);
            return sendJson(res, 200, {
                data: articles?.data || [],
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
                const article = await directusJsonRequest(getArticleDetailPath(articleRoute.id), session.accessToken);
                return sendJson(res, 200, { data: article?.data || null });
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

        if (normalizedPath === '/admin-api/files' && req.method === 'POST') {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            const file = await directusUploadRequest(req, session.accessToken);
            return sendJson(res, 201, { data: file });
        }

        const assetMatch = normalizedPath.match(/^\/admin-api\/assets\/([^/]+)$/);
        if (assetMatch && req.method === 'GET') {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            await proxyDirectusAsset(decodeURIComponent(assetMatch[1]), session.accessToken, res);
            return;
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
