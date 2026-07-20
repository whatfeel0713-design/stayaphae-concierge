import { NextResponse, type NextRequest } from "next/server";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";

/**
 * Next.js 16 프록시 (구 middleware 컨벤션). 지금은 라우트가 "/" 하나뿐이라
 * 사실상 통과시키지만, Phase B~C에서 서비스 신청·챗 라우트가 늘어나면 여기서
 * 세션 쿠키 없는 요청을 전부 "/"(코드 입력 화면)로 되돌리는 게이트 역할을 한다.
 * "/" 자체는 ?code= 검증·쿠키 발급 로직을 페이지 컴포넌트가 직접 처리한다.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/" || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = request.cookies.get(GUIDE_SESSION_COOKIE)?.value;
  const session = token ? await verifyGuideSession(token) : null;
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
