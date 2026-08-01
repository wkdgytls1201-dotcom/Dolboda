// 구조화 데이터(JSON-LD)를 <script> 안에 안전하게 넣기 위한 직렬화.
//
// JSON.stringify는 `<`를 이스케이프하지 않는다. 그래서 값 안에 "</script>"가 들어오면
// 브라우저 HTML 파서가 거기서 스크립트를 끝내버린다 — 구조화 데이터가 통째로 깨지고,
// 뒤에 남은 문자열은 페이지 본문으로 튀어나온다.
//
// 시설명·주소는 공공데이터에서 오니 지금 그런 값이 있을 가능성은 낮다. 다만 28,000여 곳의
// 외부 데이터를 그대로 HTML에 싣는 자리이고, 데이터는 갱신될 때마다 바뀐다.
// `<`를 <로 바꾸면 JSON 의미는 그대로면서 파서가 태그로 오해할 여지가 사라진다.
// (`&`, `>`도 함께 막아 </script> 우회 표기까지 차단)
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
