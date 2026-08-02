// 한글 조사 처리 — "요양원이" / "주야간보호가"처럼 앞 글자 받침에 따라 달라진다.
// FAQ 질문이나 제목처럼 검색 결과에 그대로 노출되는 문장에서 틀리면 눈에 띈다.

export function hasFinalConsonant(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  // 한글 음절 영역(가~힣) 안에서만 판단한다. 영문·숫자로 끝나면 받침 없음으로 본다.
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/** withParticle("요양원", "이", "가") → "요양원이" */
export function withParticle(word: string, afterJong: string, afterVowel: string): string {
  return word + (hasFinalConsonant(word) ? afterJong : afterVowel);
}
