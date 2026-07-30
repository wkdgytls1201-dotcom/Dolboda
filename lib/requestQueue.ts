// 카카오 로드뷰 조회가 한 페이지에서 수십 개씩 한꺼번에 몰리면 응답이 조용히 멈추는 문제가 있어
// 동시 실행 개수를 제한하는 간단한 큐. 카드 여러 개가 이 큐 하나를 공유해서 순서대로 처리된다.
class ConcurrencyQueue {
  private running = 0;
  private waiting: (() => void)[] = [];

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.limit) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.waiting.shift();
      if (next) next();
    }
  }
}

export const roadviewQueue = new ConcurrencyQueue(2);
