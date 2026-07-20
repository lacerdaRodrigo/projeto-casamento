import { describe, it, expect } from "vitest";
import { destinoSeguro, urlComMensagem } from "./voltar-para";

describe("destinoSeguro — todo dado externo é hostil (§9)", () => {
  it("aceita caminho interno", () => {
    expect(destinoSeguro("/")).toBe("/");
    expect(destinoSeguro("/?situacao=pendentes")).toBe("/?situacao=pendentes");
  });

  it("bloqueia redirect pra fora do site", () => {
    expect(destinoSeguro("//evil.com")).toBe("/");
    expect(destinoSeguro("https://evil.com")).toBe("/");
    expect(destinoSeguro("http://evil.com")).toBe("/");
  });

  it("bloqueia lixo e ausência", () => {
    expect(destinoSeguro(null)).toBe("/");
    expect(destinoSeguro(undefined)).toBe("/");
    expect(destinoSeguro(42)).toBe("/");
    expect(destinoSeguro("javascript:alert(1)")).toBe("/");
  });
});

describe("urlComMensagem", () => {
  it("anexa a mensagem de sucesso", () => {
    expect(urlComMensagem("/", "ok", "Item salvo")).toBe("/?ok=Item+salvo");
  });

  it("preserva os filtros que já estavam na URL", () => {
    const url = urlComMensagem("/?situacao=pendentes&essencial=1", "ok", "Item salvo");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("situacao")).toBe("pendentes");
    expect(params.get("essencial")).toBe("1");
    expect(params.get("ok")).toBe("Item salvo");
  });

  it("troca a mensagem antiga em vez de acumular", () => {
    const url = urlComMensagem("/?tema=abc&ok=Antiga", "erro", "Deu ruim");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("ok")).toBeNull();
    expect(params.get("erro")).toBe("Deu ruim");
    expect(params.get("tema")).toBe("abc");
  });

  it("erro também preserva os filtros", () => {
    const url = urlComMensagem("/?situacao=pendentes", "erro", "RN06 falhou");
    expect(url).toContain("situacao=pendentes");
    expect(url).toContain("erro=RN06");
  });

  it("destino inseguro cai na raiz, mas mantém a mensagem", () => {
    expect(urlComMensagem("//evil.com", "ok", "Salvo")).toBe("/?ok=Salvo");
  });

  it("preserva a âncora, pra voltar no ponto da página", () => {
    const url = urlComMensagem("/?situacao=pendentes#item-abc", "ok", "Item salvo");
    expect(url.endsWith("#item-abc")).toBe(true);
    expect(url).toContain("situacao=pendentes");
    expect(url).toContain("ok=Item+salvo");
  });

  it("âncora sem query também funciona", () => {
    expect(urlComMensagem("/#item-abc", "ok", "Salvo")).toBe("/?ok=Salvo#item-abc");
  });

  it("mensagem com acento e espaço é codificada", () => {
    const url = urlComMensagem("/", "ok", "Casório atualizado");
    expect(url).toContain("ok=Cas%C3%B3rio+atualizado");
    expect(new URLSearchParams(url.split("?")[1]).get("ok")).toBe("Casório atualizado");
  });
});
