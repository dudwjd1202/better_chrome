// 초를 시간 형식으로 변환
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${secs}초`;
  } else if (minutes > 0) {
    return `${minutes}분 ${secs}초`;
  } else {
    return `${secs}초`;
  }
}

// 비용 계산 함수
function calculateCost(seconds, hourlyWage) {
  if (!hourlyWage || hourlyWage <= 0) {
    return 0;
  }
  const hours = seconds / 3600;
  return Math.floor(hours * hourlyWage);
}

// 숫자를 천 단위 콤마로 포맷
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 시급 저장
async function saveHourlyWage() {
  const wageInput = document.getElementById('hourly-wage');
  const wage = parseInt(wageInput.value) || 0;
  
  if (wage < 0) {
    alert('시급은 0 이상이어야 합니다.');
    return;
  }
  
  await chrome.storage.local.set({ hourlyWage: wage });
  alert('시급이 저장되었습니다!');
  await loadAndDisplayData();
}

// 시급 로드
async function loadHourlyWage() {
  const data = await chrome.storage.local.get('hourlyWage');
  const wage = data.hourlyWage || 0;
  document.getElementById('hourly-wage').value = wage;
  return wage;
}

// 데이터 로드 및 표시
async function loadAndDisplayData() {
  const statsList = document.getElementById('stats-list');
  const noData = document.getElementById('no-data');
  
  // 기존 내용 초기화
  statsList.innerHTML = '';
  
  // 저장된 데이터 가져오기
  const allData = await chrome.storage.local.get(null);
  const hourlyWage = allData.hourlyWage || 0;
  const switchCount = allData.totalSwitchCount || 0;
  
  // 특수 키 제외하고 도메인 데이터만 필터링
  const domainData = Object.entries(allData)
    .filter(([key]) => key !== 'hourlyWage' && key !== 'totalSwitchCount')
    .map(([domain, time]) => ({ domain, time }))
    .sort((a, b) => b.time - a.time);
  
  // 총합 계산
  let totalSeconds = 0;
  let totalCost = 0;
  
  domainData.forEach(({ time }) => {
    totalSeconds += time;
    totalCost += calculateCost(time, hourlyWage);
  });
  
  // 대시보드 업데이트
  document.getElementById('total-time').textContent = formatTime(totalSeconds);
  document.getElementById('total-cost').textContent = hourlyWage > 0 
    ? `${formatNumber(totalCost)}원` 
    : '시급 설정 필요';
  document.getElementById('switch-count').textContent = `${formatNumber(switchCount)}회`;
  
  // 집중도 경고
  const focusAlert = document.getElementById('focus-alert');
  if (switchCount >= 50) {
    focusAlert.textContent = '⚠️ 산만함 경고!';
    focusAlert.style.display = 'block';
  } else {
    focusAlert.style.display = 'none';
  }
  
  // 데이터가 없으면 메시지 표시
  if (domainData.length === 0) {
    noData.style.display = 'block';
    return;
  }
  
  noData.style.display = 'none';
  
  // 정렬된 데이터를 화면에 표시
  domainData.forEach(({ domain, time }) => {
    const cost = calculateCost(time, hourlyWage);
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'stat-item';
    
    // 파비콘 추가
    const favicon = document.createElement('img');
    favicon.className = 'favicon';
    favicon.src = `https://www.google.com/s2/favicons?domain=${domain}`;
    favicon.alt = '';
    favicon.onerror = function() {
      this.style.display = 'none';
    };
    
    const domainContainer = document.createElement('div');
    domainContainer.className = 'domain-container';
    
    const domainDiv = document.createElement('div');
    domainDiv.className = 'domain';
    domainDiv.textContent = domain;
    
    domainContainer.appendChild(favicon);
    domainContainer.appendChild(domainDiv);
    
    const infoContainer = document.createElement('div');
    infoContainer.className = 'info-container';
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'time';
    timeDiv.textContent = formatTime(time);
    
    const costDiv = document.createElement('div');
    costDiv.className = 'cost';
    costDiv.textContent = hourlyWage > 0 
      ? `${formatNumber(cost)}원` 
      : '-';
    
    infoContainer.appendChild(timeDiv);
    infoContainer.appendChild(costDiv);
    
    itemDiv.appendChild(domainContainer);
    itemDiv.appendChild(infoContainer);
    statsList.appendChild(itemDiv);
  });
}

// 기록 삭제 함수
async function clearAllData() {
  if (confirm('모든 기록을 삭제하시겠습니까? (시급 설정은 유지됩니다)')) {
    // 시급 데이터 백업
    const data = await chrome.storage.local.get('hourlyWage');
    const hourlyWage = data.hourlyWage || 0;
    
    // 전체 삭제
    await chrome.storage.local.clear();
    
    // 시급 복원
    await chrome.storage.local.set({ hourlyWage: hourlyWage });
    
    // 탭 전환 횟수 초기화
    await chrome.storage.local.set({ totalSwitchCount: 0 });
    
    await loadAndDisplayData();
  }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async () => {
  await loadHourlyWage();
  await loadAndDisplayData();
  
  // 시급 저장 버튼 이벤트 리스너
  document.getElementById('save-wage-button').addEventListener('click', saveHourlyWage);
  
  // Enter 키로 시급 저장
  document.getElementById('hourly-wage').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveHourlyWage();
    }
  });
  
  // 기록 삭제 버튼 이벤트 리스너
  document.getElementById('clear-button').addEventListener('click', clearAllData);
  
  // storage 변경 감지하여 실시간 업데이트
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      loadAndDisplayData();
    }
  });
});