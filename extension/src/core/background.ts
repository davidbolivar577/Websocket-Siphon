import { generateFingerprint } from './fingerprint';

// State tracking class
class SessionManager {

  private primedTabs: Set<number> = new Set();
  private hookedTabs: Set<number> = new Set();

  public primeTab(tabId: number): void {
    this.primedTabs.add(tabId);
  }

  // Injection support functions

  public verifyAndAuthorizeInjection(tabId: number): boolean {
    if (this.primedTabs.has(tabId)) {
      this.primedTabs.delete(tabId);
      this.hookedTabs.add(tabId);
      return true;
    }
    return false;
  }

  public clearTab(tabId: number): void {
    this.primedTabs.delete(tabId);
    this.hookedTabs.delete(tabId);
  }

  public isTabActivelyHooked(tabId: number): boolean {
    return this.hookedTabs.has(tabId);
  }

  public isAllowedUrl(url: string | undefined): boolean {
    if (!url) return false;
    return !url.startsWith('chrome://') && !url.startsWith('edge://');
  }
}

const session = new SessionManager();


chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
   
    
    if (session.verifyAndAuthorizeInjection(tabId)) {
      console.log(`[Background] Authorized injection engine for Tab: ${tabId}`);
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: injectProxyScript,
        injectImmediately: true
      });
    } else {
      session.clearTab(tabId);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  session.clearTab(tabId);
});


chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'LOCK_AND_HOOK_TAB') {
    session.primeTab(message.tabId);
    chrome.tabs.reload(message.tabId, { bypassCache: true });
    return true;
  }

  if (message.type === 'CHECK_TAB_STATUS') {
    const isHooked = session.isTabActivelyHooked(message.tabId);
    sendResponse({ isHooked });
    return true;
  }

  if (message.type === 'JSON_PAYLOAD') {
    // Normalize payload
    const payloads: unknown[] = Array.isArray(message.data) ? message.data : [message.data];

    // Process each item
    for (const item of payloads) {
      // Prevent non JSONs
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const signature = generateFingerprint(item);
      
      // Logging
      console.group(`[TypeScript Pipeline] Processed Intercepted Object`);
      console.log("1. Raw Object Extracted:", item);
      console.log("2. Tuple-Mapped Fingerprint Array:", signature);
      console.groupEnd();



      fetch('http://localhost:5001/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawData: item,
          fingerprint: signature,
          sourceType: message.sourceType,
          url: message.url
        }),
      }).catch(err => console.error('[Bridge Server Error]', err));
    }
    return true;
  }
});

// Injector
function injectProxyScript() {
  const targetWindow = window as Window & { __WS_HOOKED__?: boolean };
  
  if (targetWindow.__WS_HOOKED__) return;
  targetWindow.__WS_HOOKED__ = true;

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/core/proxy.js');
  
  script.onload = () => {
    script.remove(); 
  };
  
  (document.head || document.documentElement).appendChild(script);

  window.addEventListener('message', (event) => {
    if (event.data && (event.data.source === 'WS_INTERCEPTOR' || event.data.source === 'FETCH_INTERCEPTOR')) {
      chrome.runtime.sendMessage({
        type: 'JSON_PAYLOAD',
        data: event.data.payload,
        url: event.data.url,
        sourceType: event.data.source === 'WS_INTERCEPTOR' ? 'WebSocket' : 'Fetch API'
      });
    }
  });
  console.log("WS & Fetch Interceptor Injector: Page reloaded, main-world hooked successfully!");
}