import { describe, it, expect } from "vitest";
import {
  parseCredenciais,
  parseEmail,
  destinoCadastro,
  destinoErroLogin,
  mensagemErroCadastro,
} from "./auth-fluxo";

describe("auth-fluxo", () => {
  describe("parseCredenciais", () => {
    it("aceita e-mail válido + senha >= 6", () => {
      const r = parseCredenciais("a@b.com", "123456");
      expect(r).toEqual({ ok: true, email: "a@b.com", senha: "123456" });
    });

    it("apara espaços do e-mail", () => {
      const r = parseCredenciais("  a@b.com  ", "123456");
      expect(r).toEqual({ ok: true, email: "a@b.com", senha: "123456" });
    });

    it("recusa e-mail inválido", () => {
      expect(parseCredenciais("nao-email", "123456")).toEqual({ ok: false });
    });

    it("recusa senha curta (< 6)", () => {
      expect(parseCredenciais("a@b.com", "123")).toEqual({ ok: false });
    });

    it("recusa campos ausentes (null)", () => {
      expect(parseCredenciais(null, null)).toEqual({ ok: false });
    });
  });

  describe("parseEmail", () => {
    it("devolve o e-mail limpo quando válido", () => {
      expect(parseEmail("  x@y.com ")).toBe("x@y.com");
    });
    it("devolve null quando inválido", () => {
      expect(parseEmail("xyz")).toBeNull();
      expect(parseEmail(undefined)).toBeNull();
    });
  });

  describe("destinoCadastro", () => {
    it("com sessão (confirmação desligada) → home", () => {
      expect(destinoCadastro({ temSessao: true })).toBe("/");
    });
    it("sem sessão (confirmação ligada) → login pedindo confirmação", () => {
      expect(destinoCadastro({ temSessao: false })).toBe("/login?confirme=1");
    });
  });

  describe("destinoErroLogin", () => {
    it("e-mail não confirmado → mensagem própria + liga reenvio", () => {
      const url = destinoErroLogin("email_not_confirmed");
      expect(url).toContain("/login?erro=");
      expect(url).toContain("confirmar=1");
      expect(decodeURIComponent(url)).toContain("Confirme seu e-mail");
    });

    it("outro erro → credencial genérica, sem reenvio (não vaza se e-mail existe)", () => {
      const url = destinoErroLogin("invalid_credentials");
      expect(url).not.toContain("confirmar=1");
      expect(decodeURIComponent(url)).toContain("E-mail ou senha incorretos");
    });

    it("erro sem código → também genérico", () => {
      const url = destinoErroLogin(undefined);
      expect(url).not.toContain("confirmar=1");
      expect(decodeURIComponent(url)).toContain("E-mail ou senha incorretos");
    });
  });

  describe("mensagemErroCadastro (traduz erro do Supabase)", () => {
    it("por CODE: user_already_exists → já tem conta", () => {
      expect(mensagemErroCadastro("user_already_exists", "")).toContain("já tem conta");
    });
    it("por MENSAGEM: 'User already registered' → já tem conta", () => {
      expect(mensagemErroCadastro(undefined, "User already registered")).toContain("já tem conta");
    });
    it("senha fraca", () => {
      expect(mensagemErroCadastro("weak_password", "")).toContain("Senha fraca");
    });
    it("rate limit", () => {
      expect(mensagemErroCadastro("over_email_send_rate_limit", "")).toContain("Muitas tentativas");
    });
    it("desconhecido → mensagem genérica em PT", () => {
      const msg = mensagemErroCadastro("algo_novo", "Something weird");
      expect(msg).toContain("Não deu pra criar a conta");
    });
  });
});
