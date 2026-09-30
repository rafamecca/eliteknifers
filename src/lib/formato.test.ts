import { describe, expect, it } from "vitest";
import { fimDoPeriodo, formatarVariacao } from "./formato";

describe("fimDoPeriodo", () => {
  it("termina na véspera do mesmo dia, N meses depois", () => {
    expect(fimDoPeriodo("2026-10-01", 3)).toBe("2026-12-31");
    expect(fimDoPeriodo("2026-11-15", 3)).toBe("2027-02-14");
  });
});

describe("formatarVariacao", () => {
  it("usa sinal de mais e menos tipográfico", () => {
    expect(formatarVariacao(21)).toBe("+21");
    expect(formatarVariacao(-21)).toBe("−21");
    expect(formatarVariacao(0)).toBe("0");
  });
});
