// 현재 추적 중인 도메인과 시작 시간
let currentDomain = null;
let startTime = null;
let isIdle = false;
let switchCount = 0;

// idle 감지 간격 설정 (60초)
chrome.idle.setDetectionInterval(60);

// 도메인 추출 함수
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    // chrome://, edge:// 등의 내부 주소 제외
    if (urlObj.protocol === 'chrome:' || 
        urlObj.protocol === 'edge:' || 
        urlObj.protocol === 'about:' ||
        urlObj.protocol === 'chrome-extension:') {
      return null;
    }
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// 시간 저장 함수
async function saveTime(domain, duration) {
  if (!domain || duration <= 0) return;
  
  const data = await chrome.storage.local.get(domain);
  const currentTime = data[domain] || 0;
  const newTime = currentTime + Math.floor(duration);
  
  await chrome.storage.local.set({ [domain]: newTime });
}

// 탭 전환 횟수 증가 및 저장
async function incrementSwitchCount() {
  switchCount++;
  const data = await chrome.storage.local.get('totalSwitchCount');
  const currentCount = data.totalSwitchCount || 0;
  await chrome.storage.local.set({ totalSwitchCount: currentCount + 1 });
}

// 현재 사이트의 시간 측정 중지 및 저장
async function stopTracking() {
  if (currentDomain && startTime && !isIdle) {
    const duration = (Date.now() - startTime) / 1000; // 초 단위
    await saveTime(currentDomain, duration);
  }
  currentDomain = null;
  startTime = null;
}

// 새 사이트의 시간 측정 시작
function startTracking(domain) {
  if (domain && !isIdle) {
    currentDomain = domain;
    startTime = Date.now();
  }
}

// 현재 활성 탭의 정보 가져오기
async function updateCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const domain = extractDomain(tab.url);
      
      // 도메인이 변경된 경우
      if (domain !== currentDomain) {
        await stopTracking();
        startTracking(domain);
      }
    }
  } catch (e) {
    console.error('Error updating current tab:', e);
  }
}

// 탭 활성화 이벤트
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await stopTracking();
  await incrementSwitchCount(); // 탭 전환 횟수 증가
  await updateCurrentTab();
});

// 탭 URL 변경 이벤트
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    await stopTracking();
    const domain = extractDomain(changeInfo.url);
    startTracking(domain);
  }
});

// 창 포커스 변경 이벤트
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // 브라우저가 포커스를 잃음
    await stopTracking();
  } else {
    // 브라우저가 포커스를 얻음
    await updateCurrentTab();
  }
});

// Idle 상태 변경 감지
chrome.idle.onStateChanged.addListener(async (newState) => {
  if (newState === 'idle' || newState === 'locked') {
    // 유휴 상태 또는 잠금 상태
    isIdle = true;
    await stopTracking();
  } else if (newState === 'active') {
    // 활성 상태
    isIdle = false;
    await updateCurrentTab();
  }
});

// 익스텐션 시작 시 초기화
chrome.runtime.onStartup.addListener(async () => {
  await updateCurrentTab();
});

// 익스텐션 설치 시 초기화
chrome.runtime.onInstalled.addListener(async () => {
  await updateCurrentTab();
});