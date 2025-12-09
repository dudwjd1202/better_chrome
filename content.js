// 컨텐츠 스크립트 - 웹페이지에 주입됨
// 현재는 기본 기능만 구현, 필요시 추가 기능 확장 가능

console.log('Better-Chrome 익스텐션이 실행 중입니다.');

// 페이지 가시성 변경 감지
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('페이지가 백그라운드로 이동했습니다.');
  } else {
    console.log('페이지가 다시 활성화되었습니다.');
  }
});

// 필요시 추가 기능:
// - 페이지 스크롤 이벤트 감지
// - 사용자 상호작용 감지
// - 특정 웹사이트에 대한 알림 표시