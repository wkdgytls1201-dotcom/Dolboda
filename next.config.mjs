/** @type {import('next').NextConfig} */

// 정식 도메인. 배포 기본 주소(*.vercel.app)로도 같은 페이지가 전부 열리면 검색엔진에는
// 같은 콘텐츠가 두 도메인에 복제된 상태로 보인다(실측: vercel.app에서 홈·지역 페이지 200).
// canonical 태그만으로는 약한 신호라, 구글이 가장 강한 통합 신호로 설명하는 리다이렉트를 건다.
const CANONICAL_HOST = "www.dolboda.kr";

// 여기 적힌 호스트로 들어온 모든 경로를 정식 도메인의 같은 경로로 영구 이동시킨다.
// 프리뷰 배포(dolboda-xxxx-*.vercel.app)는 호스트가 달라 걸리지 않으므로 그대로 열린다.
const LEGACY_HOSTS = ["dolboda-rho.vercel.app"];

const nextConfig = {
  async redirects() {
    return LEGACY_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host", value: host }],
      destination: `https://${CANONICAL_HOST}/:path*`,
      // permanent: true → 308. 구글은 301과 308을 색인 통합에서 동일하게 다루고,
      // 308은 메서드를 보존해 수신거부 원클릭(POST) 같은 요청이 GET으로 바뀌지 않는다.
      // 이미 걸려 있는 dolboda.kr → www 리다이렉트도 308이라 기준이 하나로 맞는다.
      permanent: true,
    }));
  },
};

export default nextConfig;
