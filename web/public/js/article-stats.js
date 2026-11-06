(function () {
  if (window.__gzjtArticleClickTracked) return;
  window.__gzjtArticleClickTracked = true;

  var pattern = /^\/news\/([A-Za-z0-9_-]{6,64})(?:[?#]|$)/;

  function report(id) {
    var url = '/api/public/article-stats/click?id=' + encodeURIComponent(id);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
        return;
      }
      fetch(url, { method: 'POST', keepalive: true, credentials: 'same-origin' });
    } catch (error) {
      // 忽略统计失败
    }
  }

  document.addEventListener('click', function (event) {
    var element = event.target;
    while (element && element !== document.body) {
      if (element.tagName === 'A') break;
      element = element.parentElement;
    }
    if (!element || element.tagName !== 'A') return;
    var href = element.getAttribute('href') || '';
    var matched = href.match(pattern);
    if (!matched) return;
    report(matched[1]);
  }, true);
})();
