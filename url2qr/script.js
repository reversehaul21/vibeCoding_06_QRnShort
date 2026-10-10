/**
 * URL2QR - 스마트 QR 코드 생성기
 * 
 * 기능:
 * 1. 로고 지원 및 초기화 기능
 * 2. 중앙 URL 입력창
 * 3. URL 입력 & 확인 시 -> 입력창 하단 이동 + 정중앙 QR 코드 생성
 * 4. QR 코드 클릭 시 -> 고화질 JPG 파일 다운로드
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 참조
  const app = document.getElementById('app');
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnClearInput = document.getElementById('btnClearInput');
  const btnPaste = document.getElementById('btnPaste');
  const errorMsg = document.getElementById('errorMsg');
  
  const urlInputSection = document.getElementById('urlInputSection');
  const qrDisplaySection = document.getElementById('qrDisplaySection');
  const qrClickTarget = document.getElementById('qrClickTarget');
  const qrcodeCanvas = document.getElementById('qrcodeCanvas');
  const targetUrlLabel = document.getElementById('targetUrlLabel');
  
  const btnDownloadJpg = document.getElementById('btnDownloadJpg');
  const btnCopyImage = document.getElementById('btnCopyImage');
  const btnReset = document.getElementById('btnReset');
  const logoBtn = document.getElementById('logoBtn');
  const toastContainer = document.getElementById('toastContainer');

  let currentQrInstance = null;
  let currentTargetUrl = '';

  // 1. 인풋 이벤트 (클리어 버튼 토글 및 에러 제거)
  urlInput.addEventListener('input', () => {
    btnClearInput.style.display = urlInput.value ? 'flex' : 'none';
    hideError();
  });

  btnClearInput.addEventListener('click', () => {
    urlInput.value = '';
    btnClearInput.style.display = 'none';
    urlInput.focus();
    hideError();
  });

  // 붙여넣기 버튼
  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        btnClearInput.style.display = 'flex';
        urlInput.focus();
        hideError();
        showToast('클립보드 내용을 붙여넣었습니다.');
      }
    } catch (e) {
      // 권한 거부 시 인풋 포커스
      urlInput.focus();
    }
  });

  // 2. 폼 제출 (확인 클릭 또는 엔터 키)
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processUrlSubmission();
  });

  function processUrlSubmission() {
    let url = urlInput.value.trim();

    if (!url) {
      showError('URL 또는 링크 주소를 입력해주세요.');
      urlInput.focus();
      return;
    }

    // 도메인 형태로만 입력한 경우(예: google.com, naver.com) 편의상 https:// 추가 권장 여부 검토
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ftp://') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
        urlInput.value = url;
      }
    }

    currentTargetUrl = url;
    generateQRCode(url);
    moveToGeneratedState();
  }

  // 3. QR 코드 생성 함수
  function generateQRCode(text) {
    qrcodeCanvas.innerHTML = ''; // 기존 QR 코드 초기화

    try {
      currentQrInstance = new QRCode(qrcodeCanvas, {
        text: text,
        width: 230,
        height: 230,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: (typeof QRCode !== 'undefined' && QRCode.CorrectLevel) ? QRCode.CorrectLevel.H : 2
      });

      // 텍스트 라벨 업데이트
      targetUrlLabel.textContent = text;
      targetUrlLabel.title = text;
    } catch (err) {
      console.error('QR 코드 생성 오류:', err);
      showError('QR 코드를 생성하는 중 오류가 발생했습니다.');
    }
  }

  // 상태 전환: 입력창 하단 이동 & QR 코드 정중앙 표시
  function moveToGeneratedState() {
    hideError();
    // 1. 입력창 섹션을 하단으로 전환
    urlInputSection.classList.remove('pos-center');
    urlInputSection.classList.add('pos-bottom');

    // 2. QR 코드 영역 활성화
    qrDisplaySection.classList.add('active');

    // 입력창 블러 해제 후 편의 유지
    urlInput.blur();
  }

  // 초기 상태로 리셋: 입력창 중앙 복귀 & QR 코드 숨김
  function resetToInitialState() {
    urlInputSection.classList.remove('pos-bottom');
    urlInputSection.classList.add('pos-center');
    qrDisplaySection.classList.remove('active');
    
    urlInput.value = '';
    btnClearInput.style.display = 'none';
    hideError();
    setTimeout(() => {
      urlInput.focus();
    }, 400);
  }

  // 로고 및 다시 만들기 클릭 이벤트
  logoBtn.addEventListener('click', resetToInitialState);
  btnReset.addEventListener('click', resetToInitialState);

  // 4. QR 코드 클릭 시 고화질 JPG 파일 다운로드 (핵심 요구사항)
  qrClickTarget.addEventListener('click', () => {
    downloadAsJpg();
  });

  btnDownloadJpg.addEventListener('click', () => {
    downloadAsJpg();
  });

  // 키보드로 엔터/스페이스 선택 시 다운로드 지원
  qrClickTarget.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      downloadAsJpg();
    }
  });

  /**
   * 고해상도 JPG 파일 생성 및 다운로드 함수
   * 배경을 순백색(#FFFFFF)으로 칠하여 JPG 변환 시 투명 영역이 검게 변하는 현상을 방지
   */
  async function downloadAsJpg() {
    if (!currentTargetUrl) return;

    try {
      const qrCanvas = qrcodeCanvas.querySelector('canvas');
      const qrImg = qrcodeCanvas.querySelector('img');
      let imageSource = null;

      if (qrCanvas && qrCanvas.width > 0) {
        imageSource = qrCanvas;
      } else if (qrImg) {
        if (!qrImg.complete || qrImg.naturalWidth === 0) {
          await new Promise((resolve, reject) => {
            qrImg.onload = resolve;
            qrImg.onerror = reject;
            setTimeout(resolve, 300); // 타임아웃 세이프티
          });
        }
        imageSource = qrImg;
      }

      if (!imageSource) {
        showToast('QR 코드를 준비 중입니다. 잠시 후 다시 클릭해주세요.');
        return;
      }

      // 고화질 JPG를 위한 오프스크린 캔버스 생성 (1000 x 1000)
      const exportCanvas = document.createElement('canvas');
      const size = 1000;
      const padding = 80;
      exportCanvas.width = size;
      exportCanvas.height = size;
      const ctx = exportCanvas.getContext('2d');

      // 1. 순백색(#FFFFFF) 배경 채우기 (JPG 필수)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // 2. 고화질 QR 코드 렌더링
      ctx.imageSmoothingEnabled = false;
      const qrDrawSize = size - (padding * 2);
      ctx.drawImage(imageSource, padding, padding, qrDrawSize, qrDrawSize);

      // 3. JPG Data URL 추출 (고품질 95%)
      const jpgDataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

      // 파일명 결정: 도메인 기반 or 타임스탬프
      let safeFilename = 'qrcode';
      try {
        const parsed = new URL(currentTargetUrl);
        safeFilename = parsed.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
      } catch (e) {
        safeFilename = 'URL2QR_' + Date.now();
      }

      const downloadLink = document.createElement('a');
      downloadLink.download = `${safeFilename}.jpg`;
      downloadLink.href = jpgDataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast('✨ JPG 파일로 다운로드되었습니다!');
    } catch (err) {
      console.error('JPG 다운로드 오류:', err);
      showToast('다운로드 중 오류가 발생했습니다.');
    }
  }

  // 캔버스 또는 이미지 태그로부터 이미지 객체 확보
  function getResolvedImageSource(sourceElement) {
    return new Promise((resolve, reject) => {
      if (sourceElement.tagName.toLowerCase() === 'canvas') {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = sourceElement.toDataURL('image/png');
      } else if (sourceElement.tagName.toLowerCase() === 'img') {
        if (sourceElement.complete && sourceElement.naturalWidth > 0) {
          resolve(sourceElement);
        } else {
          sourceElement.onload = () => resolve(sourceElement);
          sourceElement.onerror = reject;
        }
      } else {
        reject(new Error('유효한 QR 소스가 없습니다.'));
      }
    });
  }

  // 클립보드로 이미지 복사
  btnCopyImage.addEventListener('click', async () => {
    try {
      const qrSource = qrcodeCanvas.querySelector('canvas') || qrcodeCanvas.querySelector('img');
      if (!qrSource) return;

      const imgElement = await getResolvedImageSource(qrSource);
      const copyCanvas = document.createElement('canvas');
      copyCanvas.width = 500;
      copyCanvas.height = 500;
      const ctx = copyCanvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 500, 500);
      ctx.drawImage(imgElement, 30, 30, 440, 440);

      copyCanvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('이미지 변환에 실패했습니다.');
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('📋 클립보드에 이미지가 복사되었습니다!');
        } catch (clipErr) {
          showToast('클립보드 복사를 지원하지 않는 브라우저입니다.');
        }
      });
    } catch (err) {
      showToast('이미지 복사 중 오류가 발생했습니다.');
    }
  });

  // 에러 메시지 표시
  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }

  function hideError() {
    errorMsg.style.display = 'none';
  }

  // 토스트 메시지 함수
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f8b803" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 2800);
  }

  // 페이지 진입 시 인풋 자동 포커스
  urlInput.focus();
});
