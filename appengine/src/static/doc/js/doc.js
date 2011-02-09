/**
 * Naive method to find the current document in the TOC and highlight it.
 */
function findCurrentDoc(el_id) {
  var el = document.getElementById(el_id);
  if (typeof(el.querySelectorAll) != 'function') {
    return;
  }
  var matches = el.querySelectorAll('ul>li>a');
  var curDocument = document.location.href;
  if (curDocument.indexOf('.html') == -1) {
    curDocument = 'index.html';
  }
  for (var i = 0; i < matches.length; i++) {
    if (curDocument.indexOf(matches[i].getAttribute('href')) != -1) {
      matches[i].parentNode.className = 'current';
    }
  }
}

function trackScrollingForToc(toc_id) {
  var toc = document.getElementById(toc_id);
  var tocTop = toc.offsetTop;
  if (toc.offsetHeight < window.innerHeight) {
    window.onscroll = function() {
      var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
      var toc = document.getElementById(toc_id);
      if (scrollTop >= tocTop) {
        toc.style.position = 'fixed';
        toc.style.top = 0;
      } else {
        toc.style.position = 'relative';
        toc.style.top = '';
      }
    }
  }
}