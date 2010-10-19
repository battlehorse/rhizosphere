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
  for (var i = 0; i < matches.length; i++) {
    if (curDocument.indexOf(matches[i].href) != -1) {
      matches[i].parentNode.className = 'current';
    }
  }
}