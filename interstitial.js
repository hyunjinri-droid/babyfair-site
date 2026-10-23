/**
 * Interstitial ad overlay
 * Shows a brief ad when users click external links.
 * Uses AdSense ca-pub-2284090720087182, slot 8862749299.
 * Call initInterstitial() once per page after DOM is ready.
 */
(function () {
  'use strict';

  var SKIP_DELAY = 5; // seconds before skip button appears
  var AD_CLIENT = 'ca-pub-2284090720087182';
  var AD_SLOT = '8862749299';
  var HOST = 'babyfairschedule.co.kr';

  function isExternal(href) {
    try {
      var url = new URL(href, location.href);
      return url.hostname !== location.hostname &&
             !url.hostname.endsWith('.' + HOST);
    } catch (e) {
      return false;
    }
  }

  function createOverlay() {
    var el = document.createElement('div');
    el.id = 'interstl-overlay';
    el.innerHTML =
      '<div id="interstl-box">' +
        '<div id="interstl-header">' +
          '<span id="interstl-label">광고</span>' +
          '<span id="interstl-timer"></span>' +
        '</div>' +
        '<div id="interstl-ad"></div>' +
        '<button id="interstl-skip" style="display:none">건너뛰기 →</button>' +
        '<p id="interstl-dest">잠시 후 페이지로 이동합니다…</p>' +
      '</div>';
    var style = document.createElement('style');
    style.textContent =
      '#interstl-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif}' +
      '#interstl-box{background:#fff;border-radius:12px;padding:20px;max-width:360px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3)}' +
      '#interstl-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:12px;color:#666}' +
      '#interstl-timer{font-weight:bold;color:#ff6b6b;font-size:14px}' +
      '#interstl-ad{min-height:120px;margin:8px 0}' +
      '#interstl-skip{margin-top:12px;padding:8px 24px;background:#ff6b6b;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer}' +
      '#interstl-dest{font-size:11px;color:#999;margin-top:8px}';
    document.head.appendChild(style);
    return el;
  }

  function loadAd(container) {
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.cssText = 'display:block;min-height:100px';
    ins.setAttribute('data-ad-client', AD_CLIENT);
    ins.setAttribute('data-ad-slot', AD_SLOT);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    container.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }

  function showInterstitial(href) {
    var overlay = document.getElementById('interstl-overlay') || createOverlay();
    if (!overlay.parentNode) document.body.appendChild(overlay);
    overlay.style.display = 'flex';

    var timerEl = overlay.querySelector('#interstl-timer');
    var skipBtn = overlay.querySelector('#interstl-skip');
    var adContainer = overlay.querySelector('#interstl-ad');

    adContainer.innerHTML = '';
    skipBtn.style.display = 'none';
    loadAd(adContainer);

    var remaining = SKIP_DELAY;
    timerEl.textContent = remaining + '초';
    var iv = setInterval(function () {
      remaining--;
      timerEl.textContent = remaining + '초';
      if (remaining <= 0) {
        clearInterval(iv);
        overlay.style.display = 'none';
        location.href = href;
      } else if (remaining <= 2) {
        skipBtn.style.display = 'inline-block';
      }
    }, 1000);

    skipBtn.onclick = function () {
      clearInterval(iv);
      overlay.style.display = 'none';
      location.href = href;
    };
  }

  function initInterstitial() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
      if (!isExternal(href)) return;
      e.preventDefault();
      showInterstitial(a.href);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', initInterstitial);
})();
