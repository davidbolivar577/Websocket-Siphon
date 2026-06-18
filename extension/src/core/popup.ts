// extension/src/core/popup.ts

// Helper to get the active browser tab
async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// 1. Initialize & Check Status
async function initPopup() {
  const tab = await getActiveTab();
  const statusBadge = document.getElementById('tab-status')!;
  const lockBtn = document.getElementById('lock-tab-btn')!;

  if (!tab || !tab.id || !tab.url || tab.url.startsWith('chrome://')) {
    statusBadge.innerText = 'Unsupported Tab';
    lockBtn.setAttribute('disabled', 'true');
    return;
  }

  // Ask background script if this tab is currently being monitored
  chrome.runtime.sendMessage({ type: 'CHECK_TAB_STATUS', tabId: tab.id }, (response) => {
    if (response && response.isHooked) {
      statusBadge.innerText = 'HOOKED & RECORDING';
      statusBadge.className = 'badge active';
      lockBtn.innerText = '🔄 Force Re-Hook Tab';
    } else {
      statusBadge.innerText = 'IDLE (Not Intercepting)';
      statusBadge.className = 'badge inactive';
    }
  });
}

// 2. Action: Hook and Reload the Target Site (Domain A Management)
document.getElementById('lock-tab-btn')!.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (tab && tab.id) {
    // Send message to background script to prime and reload this specific tab
    chrome.runtime.sendMessage({ type: 'LOCK_AND_HOOK_TAB', tabId: tab.id });
    window.close(); // Close the popup menu automatically so the user sees the reload happen
  }
});

// 3. Action: Launch Dashboard in New Tab (Domain B Management)
document.getElementById('open-dashboard-btn')!.addEventListener('click', () => {
  // CRXJS resolves index.html automatically inside the extension bundle
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  window.close();
});

initPopup();