# 압해 컨시어지 (stayaphae-concierge)

스테이 압해 예약 확정 고객 전용 컨시어지 웹앱. 설계 배경과 단계별 로드맵은
메인 리포(`staysoom`)의 `concierge-app-design.md`를 참고 — 이 리포는 그 문서의
Phase A(리포 뼈대 + 정적 콘텐츠 이식) 결과물이다.

## 지금까지(Phase A) 한 것

- Next.js 16 (App Router) + Tailwind v4 스캐폴드, 메인 사이트와 동일한 브랜드
  팔레트·폰트(Noto Sans/Serif KR) 적용.
- 메인 사이트 `/guide`의 정적 콘텐츠(이용 안내·오시는 길·로컬 맛집·추천
  코스·시크릿 쿠폰 안내)를 그대로 이식.
- `verify_guide_access` RPC(메인 사이트와 동일 Supabase 프로젝트, anon key만
  사용)로 예약 코드를 검증하고, 성공 시 서명된 httpOnly 쿠키(JWT, `jose`)를
  발급해 이후 페이지 이동에 `?code=`가 계속 노출되지 않도록 함.
- `src/proxy.ts`에 쿠키 게이트 뼈대 마련 — 지금은 라우트가 `/` 하나뿐이라
  통과만 시키지만, Phase B~C에서 라우트가 늘어나면 여기서 미인증 요청을
  `/`(코드 입력 화면)로 되돌리는 역할을 한다.

## 알려진 단순화 (다음 단계에서 정교화 필요)

- **세션 만료**: `verify_guide_access` RPC가 boolean만 반환해 정확한 체크아웃
  날짜를 알 수 없다. 지금은 고정 TTL(5일)로 쿠키를 발급한다. 체크아웃 자정
  만료로 정교화하려면 메인 리포 쪽에 RPC가 checkout을 함께 반환하도록 하는
  마이그레이션이 필요하다(`src/lib/session.ts` 주석 참고).
- **홈 화면의 체크인/체크아웃 D-day**: 설계 문서 IA표에 있는 항목이지만 같은
  이유(RPC가 예약 상세를 반환하지 않음)로 이번 단계에서는 넣지 않았다. 위
  RPC 확장과 함께 Phase B에서 추가하는 게 자연스럽다.

## 로컬 개발

```bash
npm install
cp .env.local.example .env.local   # 값 채우기 — 메인 사이트와 같은 Supabase 프로젝트
npm run dev
```

`GUIDE_SESSION_SECRET`은 메인 사이트의 어떤 값과도 무관한 이 앱 전용 서명
비밀값이다 (`openssl rand -hex 32`로 생성).

## 아직 안 한 것

- Vercel 프로젝트 연결·서브도메인(`concierge.stayaphae.com`) 연결 — 메인
  사이트가 실제 도메인에서 안정화된 뒤(Phase 0 이후) 진행하기로 확정됨.
- Phase B(서비스 신청 `concierge_logs`), Phase C(AI 챗), Phase D(컷오버),
  Phase E(IoT) — `concierge-app-design.md` 참고.
