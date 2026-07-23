import { describe, it, expect } from "vitest";
import { linkDoContato, normalizarLink, rotuloDoLink } from "./fornecedor";

describe("contato do fornecedor vira link clicável", () => {
  it("telefone brasileiro com máscara vira tel: só com dígitos", () => {
    expect(linkDoContato("(11) 98888-7777")).toEqual({ href: "tel:11988887777", tipo: "tel" });
  });

  it("telefone fixo sem DDD ainda disca", () => {
    expect(linkDoContato("3232-1010")).toEqual({ href: "tel:32321010", tipo: "tel" });
  });

  it("mantém o + do formato internacional", () => {
    expect(linkDoContato("+55 11 98888-7777")).toEqual({
      href: "tel:+5511988887777",
      tipo: "tel",
    });
  });

  it("e-mail vira mailto:", () => {
    expect(linkDoContato("buffet@exemplo.com.br")).toEqual({
      href: "mailto:buffet@exemplo.com.br",
      tipo: "mail",
    });
  });

  it("texto solto não vira link (só é exibido)", () => {
    expect(linkDoContato("falar com a Ana")).toBeNull();
    expect(linkDoContato("1234")).toBeNull(); // dígitos de menos
    expect(linkDoContato("arroba@sem-ponto")).toBeNull();
  });

  it("vazio, só espaços ou null não viram nada", () => {
    expect(linkDoContato(null)).toBeNull();
    expect(linkDoContato("")).toBeNull();
    expect(linkDoContato("   ")).toBeNull();
  });
});

describe("link do fornecedor é normalizado e seguro", () => {
  it("completa o esquema quando a pessoa digita só o domínio", () => {
    expect(normalizarLink("instagram.com/buffet")).toBe("https://instagram.com/buffet");
  });

  it("preserva http e https já digitados", () => {
    expect(normalizarLink("http://exemplo.com/")).toBe("http://exemplo.com/");
    expect(normalizarLink("https://exemplo.com/orcamento")).toBe("https://exemplo.com/orcamento");
  });

  it("recusa esquema perigoso (nunca vira href)", () => {
    expect(normalizarLink("javascript:alert(1)")).toBeNull();
    expect(normalizarLink("data:text/html,<script>")).toBeNull();
    expect(normalizarLink("  JavaScript:alert(1)")).toBeNull();
  });

  it("recusa texto que não é endereço", () => {
    expect(normalizarLink("procurar no google")).toBeNull();
    expect(normalizarLink(null)).toBeNull();
    expect(normalizarLink("  ")).toBeNull();
  });

  it("rótulo curto: sem www e sem barra final", () => {
    expect(rotuloDoLink("https://www.exemplo.com/")).toBe("exemplo.com");
    expect(rotuloDoLink("instagram.com/buffet")).toBe("instagram.com/buffet");
    expect(rotuloDoLink("nada")).toBeNull();
  });
});
