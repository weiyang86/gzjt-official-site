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

        if (normalizedPath.startsWith('/admin-api/articles') || normalizedPath.startsWith('/admin-api/files')) {
            const session = requireAdminAuth(req, res);
            if (!session) return;
            return sendJson(res, 501, { error: { code: 'NOT_IMPLEMENTED', message: 'This admin API endpoint is reserved for the next implementation task' } });
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
