function patchEodLabels() {
  const label = document.querySelector('#dataModeLabel');
  if (label?.textContent === '실시간 기술지표') label.textContent = '무료 일봉 분석';

  const sourceMode = document.querySelector('#sourceMode');
  if (sourceMode?.textContent === '실시간') sourceMode.textContent = '일봉';

  const expertSource = document.querySelector('#expertSourceMode');
  if (expertSource?.textContent === 'LIVE') expertSource.textContent = 'EOD';

  const footer = document.querySelector('#footerSource');
  if (footer?.textContent?.includes('Massive')) footer.textContent = 'Stooq 무료 일봉 · 기술지표 계산';

  const system = document.querySelector('#systemMessage');
  if (system?.textContent?.startsWith('실제 가격·거래량 기반 기술지표입니다.')) {
    system.textContent = 'Stooq 무료 일봉 가격·거래량 기반 기술지표입니다. 장중 실시간 시세가 아니며, 기업가치·실적 데이터는 아직 중립값으로 처리됩니다.';
  }

  const customMessage = document.querySelector('#customStockMessage');
  if (customMessage?.textContent?.includes('LIVE 가격으로 분석합니다.')) {
    customMessage.textContent = customMessage.textContent.replace('LIVE 가격으로 분석합니다.', '무료 일봉 데이터로 분석합니다.');
  }

  document.querySelectorAll('.custom-stock-card.is-loading p').forEach((node) => {
    if (node.textContent === '실제 가격 데이터를 불러와 분석 중…') node.textContent = '무료 일봉 데이터를 불러와 분석 중…';
  });
}

const observer = new MutationObserver(patchEodLabels);
observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', patchEodLabels, { once: true });
} else {
  patchEodLabels();
}
