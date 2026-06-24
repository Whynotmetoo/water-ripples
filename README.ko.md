<div align="center">
  <img src="public/favicon.svg" alt="Water Ripples Icon" width="96" height="96">
  <h1>Water Ripples</h1>
</div>

<p align="center">
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-8.1.0-646cff?logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API"><img src="https://img.shields.io/badge/WebGL-1.0-red?logo=webgl&logoColor=white" alt="WebGL"></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/Vanilla%20JS-ES6-f7df1e?logo=javascript&logoColor=black" alt="Vanilla JS"></a>
  <a href="https://www.npmjs.com/"><img src="https://img.shields.io/badge/npm-%3E%3D10-cb3837?logo=npm&logoColor=white" alt="npm >=10"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.es.md">Español</a> · <b>한국어</b>
</p>

사실적인 WebGL 수면 파동 물리 시뮬레이션, 파도 위에 떠다니는 선명한 노란색 플루메리아 꽃, 그리고 실시간으로 수면을 굴절·왜곡시키는 프리미엄 무테 리퀴드 글라스 설정 패널을 갖춘 고도의 인터랙티브 웹 페이지입니다.
![demo](./public/demo.gif)

<p align="center">
  <a href="#주요-기능">주요 기능</a> • <a href="#개발-가이드">개발 가이드</a>
</p>

## 라이브 데모
데모 보기: [https://ripple.carsonye.com/](https://ripple.carsonye.com/)

## 주요 기능

- **사실적인 수면 시뮬레이션**: CPU 저해상도 그리드 시뮬레이션을 WebGL 셰이더 패스에 매핑하여 확산 조명, 스페큘러 하이라이트, 자동 환경 수면 호흡 애니메이션을 구현.
- **리퀴드 글라스 인터페이스**: 투명한 액체 유리로 스타일링된 프리미엄 설정 패널. WebGL 렌즈 굴절로 배경 파도를 실시간 왜곡하며, 패널 블러 시 부드럽게 페이드 아웃.
- **프로시저럴 플루메리아**: Canvas에 동적으로 그려지는 5장 꽃잎 플루메리아. 선명한 달걀노른자 오렌지 그라데이션 중심과 깔끔한 흰색 외곽선.
- **반응형 원형 커서**: 클릭 및 이동 시 파문을 생성하는 부드러운 스케일링 포인터.
- **자동 로컬라이제이션**: 브라우저 로케일을 감지하여 UI 컨트롤을 중국어와 영어로 동적 전환.
- **모바일 최적화**: 반응형 패널 크기와 모바일 Safari/Chrome 주소창 토글로 인한 미세한 높이 변화를 무시하는 스마트 리사이즈 리스너로 물리 시뮬레이션 리셋 방지.

## 개발 가이드

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
```
