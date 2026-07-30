// 두 좌표 사이의 나침반 방위각(0~360, 북쪽 기준 시계방향)을 계산한다.
export function bearingDegrees(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(fromLat);
  const phi2 = toRad(toLat);
  const deltaLambda = toRad(toLng - fromLng);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
