(function () {
  'use strict';

  var collectPath = '/api/analytics/collect';
  var visitorKey = 'gzjt_site_visitor_id';
  var excludedPrefixes = ['/admin', '/admin-api', '/api', '/preview', '/_next'];
  var path = window.location.pathname || '/';

  if (excludedPrefixes.some(function (prefix) {
    return path === prefix || path.indexOf(prefix + '/') === 0;
  })) return;

  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  var visitorId = '';
  try {
    visitorId = window.localStorage.getItem(visitorKey) || '';
    if (!visitorId) {
      visitorId = createId();
      window.localStorage.setItem(visitorKey, visitorId);
    }
  } catch (error) {
    visitorId = '';
  }
  if (!visitorId) return;

  function send(payload) {
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(collectPath, new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch (error) {
      // 回退到 fetch
    }
    try {
      window.fetch(collectPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(function () {});
    } catch (error) {
      // 忽略采集失败
    }
  }

  function basePayload(type) {
    return {
      type: type,
      path: path,
      visitorId: visitorId,
      referrer: document.referrer || ''
    };
  }

  send(basePayload('pageview'));

  function track(name, detail) {
    var payload = basePayload('event');
    payload.name = name;
    payload.detail = detail || '';
    send(payload);
  }

  window.gzjtTrack = track;

  document.addEventListener('click', function (event) {
    var target = event.target;
    var anchor = target && target.closest ? target.closest('a') : null;
    if (!anchor) return;
    var href = anchor.getAttribute('href') || '';
    if (!href) return;

    if (href.indexOf('tel:') === 0) {
      track('tel-click', href.slice(4));
      return;
    }
    if (href.indexOf('mailto:') === 0) {
      track('mailto-click', href.slice(7).split('?')[0]);
      return;
    }

    var cleanHref = href.split('?')[0].split('#')[0];
    if (/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(cleanHref)) {
      track('download', cleanHref);
      return;
    }

    if (/^https?:\/\//i.test(href)) {
      try {
        var url = new URL(href);
        if (url.hostname && url.hostname !== window.location.hostname) track('external-link', url.hostname);
      } catch (error) {
        // 忽略无法解析的链接
      }
    }
  }, true);

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.querySelector) return;
    var input = form.querySelector('input[name="q"]');
    if (!input || typeof input.value !== 'string') return;
    var keyword = input.value.trim().slice(0, 40);
    if (keyword) track('search', keyword);
  }, true);
})();
