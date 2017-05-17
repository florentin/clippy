let storage = chrome.storage.local;

function getDomain(url) {
  let anchor = document.createElement ('a');
  anchor.href = url;
  return anchor.hostname.replace('www.', '');
}

function markElement(anchor, tag) {
  anchor.classList.add("tooltiptarget");

  var text = document.createElement('span');
  //text.innerHTML = '&nbsp;';
  text.style.backgroundColor = tag;
  text.classList.add('tooltiptext');

  anchor.appendChild(text);
}

function highlightLink(url_key, tag) {
  let anchor = document.createElement('a');
  anchor.href = url_key;
  //console.log('pathname + search', anchor.pathname, anchor.search);
  var matching_anchors = document.querySelectorAll("a[href*='"+anchor.pathname+anchor.search+"']");
  //console.log('matching_anchors', matching_anchors);
  for (let index in matching_anchors) {
    if (matching_anchors[index].style) {
      markElement(matching_anchors[index], tag);
    }
  }
  return matching_anchors;
}

function highlightPage(url_key, tag) {
  let page_url = window.location.href;
  if (url_key == page_url.split('#')[0]) {
    var text = document.createElement('span');
    text.style.backgroundColor = tag;
    text.classList.add('tooltippage');
    document.body.appendChild(text);
  }
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.action === "highlight" ) {
      highlightPage(request.url_key, request.tag);
      highlightLink(request.url_key, request.tag);
      sendResponse({'success': 1});
    }
  }
);  

storage.get(
  { 'marks': new Object() },
  function(items) {
    let page_url = window.location.href;
    let domain = getDomain(page_url);    
    for(let url_key in items['marks'][domain]) {
      let tag = items['marks'][domain][url_key]['tag'];
      highlightPage(url_key, tag);
      highlightLink(url_key, tag);
    }  
  }
);
