const http = require('http');
const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

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

http.createServer((req, res) => {
    const rawUrl = req.url || '/';
    const urlPath = rawUrl.split('?')[0].split('#')[0];
    const pathname = urlPath === '/' ? '/A版官网首页.html' : urlPath;
    let decodedPath = pathname;
    try { decodedPath = decodeURIComponent(pathname); } catch (e) {}
    const normalizedPath = path.posix.normalize(decodedPath.replace(/\\/g, '/'));
    const normalizedNoSlash = normalizedPath.replace(/\/+$/, '') || '/';

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

    if (normalizedPath === '/A版官网首页.html' || normalizedPath.startsWith('/pages/') || isAssetRequest) {
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
});
