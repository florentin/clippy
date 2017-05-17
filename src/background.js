let storage = chrome.storage.local;

chrome.contextMenus.create({
  "id": 'root',
  "title" : "X - Clippy",
  "contexts": ["link", "page"]
});


chrome.contextMenus.create({
  "id": 'link.red',
  "parentId" : "root",
  "type" : "normal",
  "title" : "Mark link: RED",
  "contexts" : ["link"]
});

chrome.contextMenus.create({
  "id": 'link.green',
  "parentId" : "root",
  "type" : "normal",
  "title" : "Mark link: GREEN",
  "contexts" : ["link"]
});

chrome.contextMenus.create(
  {
    "id": 'sep',
    "parentId" : "root",
    "type":'separator'
  }
);

chrome.contextMenus.create({
  "id": 'page.red',
  "parentId" : "root",
  "title" : "Mark page: RED",
  "type" : "normal",
  "contexts" : ["page"]
});

chrome.contextMenus.create({
  "id": 'page.green',
  "parentId" : "root",
  "title" : "Mark page: GREEN",
  "type" : "normal",
  "contexts" : ["page"]
});

function getDomain(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname.replace('www.', '');
}

function addNotification(title, message) {
  chrome.notifications.create('reminder', {
    type: 'basic',
    iconUrl: 'images/icon.png',
    title: title,
    message: message,
  }, function(notificationId) {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
    } else {
      let timer = setTimeout(function(){chrome.notifications.clear(notificationId);}, 2000);
    }
  });
}

function unpackParams(queryString) {
  let data = {}; 
  queryString.replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
      data[decodeURIComponent(key)] = decodeURIComponent(value);
  });
  return data
} 

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  //console.log('info', info);
  let tag = info.menuItemId.split('.')[1];
  let url = info.linkUrl || info.pageUrl;
  let domain = getDomain(url);
  // TODO: process url
  
  let anchor = document.createElement('a');
  anchor.href = url;
  
  let data = unpackParams(anchor.search.slice(1));
  // TODO: this is an exception for sites like emag.ro
  //console.log('data', data)
  if ('url' in data) {
    anchor.pathname = data['url'];
    anchor.search = '';
  }
  anchor.hash = ''; // remove the fragment (what comes after the hashtag)
  let url_key = anchor.href;
  
  if (anchor.pathname=='/' && anchor.search=="") {
    addNotification('Error', 'Homepage not allowed');
    return undefined;
  }
  
  storage.get(
    { 'marks': new Object() },
    function(items) {
      if (!(domain in items.marks)) {
        items['marks'][domain] = new Object();
      }
      // anchor.href becomes the key so i can easily check of duplicates
      items['marks'][domain][url_key] = {'tag': tag};

      storage.set(
        items, 
        function() {
          //console.log('saved', items);
          if (tab) {
            chrome.tabs.sendMessage(tab.id, {action: 'highlight', url_key: url_key, tag: tag}, function(response) {
              //console.log('highlighted', response);
            });
          }
          addNotification('Tagged '+ tag, url_key);
        }
      );
    }
  );
});

function inject_content(tabId) {
  chrome.tabs.insertCSS(
    tabId, 
    {
    file: "clippy.css",
    runAt: "document_idle"
    }
  );
  chrome.tabs.executeScript(
    tabId, 
    {
    file: "content.js",
    runAt: "document_idle"
    }
  );
}

function validate_permission(chrome_permissions, grant_alert, deny_alert, tab) {
  if (!tab.active) {
    console.log('not active', tab);
    return null;
  }
  let anchor = document.createElement('a');
  anchor.href = tab.url;
  
  chrome_permissions({
    permissions: ['tabs'],
    origins: [anchor.origin+"/"]
  }, function(granted) {   
    if (granted) {
      if (grant_alert)
        addNotification('Clippy enabled', anchor.origin);
      inject_content(tab.id);
    } else {
      if (deny_alert)
        addNotification('Clippy permission denied', anchor.origin);
    };
  });
}

chrome.browserAction.onClicked.addListener(validate_permission.bind(null, chrome.permissions.request, true, true));

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status=='complete') {
    return validate_permission(chrome.permissions.contains, false, false, tab);
  }
});

