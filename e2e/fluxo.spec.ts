import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Fatia vertical (§8.1): entrar -> criar tema -> criar item -> mudar status ->
// painel reage -> apagar (limpeza). ESCOPADO: tudo num tema "E2E-<ts>", que é
// apagado no fim. Rede de segurança em afterAll remove qualquer "E2E-*" que
// tenha sobrado (só o que o teste cria — respeita a regra de deletar com escopo).

const EMAIL = process.env.CASORIO_EMAIL;
const SENHA = process.env.CASORIO_SENHA;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEMA = `E2E-${Date.now()}`;

test.describe("fatia vertical", () => {
  test.skip(!EMAIL || !SENHA, "faltam CASORIO_EMAIL/SENHA no .env.local");

  test("entrar, criar tema+item, mudar status, painel reage, apagar", async ({ page }) => {
    // aceita o confirm() nativo da exclusão
    page.on("dialog", (d) => d.accept());

    // --- entrar ---
    await page.goto("/login");
    await page.getByPlaceholder("voce@email.com").fill(EMAIL!);
    await page.getByPlaceholder("senha (mín. 6)").fill(SENHA!);
    await page.getByRole("button", { name: "Entrar" }).click();

    // caiu no painel (cabeçalho com o nome do casal)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });

    // --- criar tema escopado ---
    await page.getByRole("button", { name: "+ Novo tema" }).click();
    await page.getByPlaceholder("Novo tema (ex.: Comida)").fill(TEMA);
    await page.getByRole("button", { name: "Salvar" }).click();

    // aparece como aba (exact) e como card na visão geral
    const aba = page.getByRole("button", { name: TEMA, exact: true });
    await expect(aba).toBeVisible({ timeout: 15_000 });

    // --- abrir o tema e adicionar um item com preço DIRETO no tema ---
    await aba.click();
    await page.getByRole("button", { name: "+ Item" }).first().click();
    await page.getByPlaceholder("Adicionar item (ex.: Com catupiry)").fill("Item E2E");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Item E2E")).toBeVisible({ timeout: 15_000 });

    // --- mudar status (abre editor do item, seleciona, salva) ---
    await page.getByRole("button", { name: "Editar item" }).first().click();
    const select = page.locator(".form-status select").first();
    await select.selectOption("feito");
    await page.locator(".form-status").getByRole("button", { name: "Salvar" }).click();

    // painel reage: badge "Feito" aparece na linha do item
    await expect(page.getByText("Feito", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // --- apagar o tema (limpeza) ---
    await page.getByRole("button", { name: `Excluir tema ${TEMA}` }).click();
    await expect(page.getByRole("button", { name: TEMA, exact: true })).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});

// Rede de segurança: remove qualquer tema "E2E-*" que tenha sobrado.
test.afterAll(async () => {
  if (!EMAIL || !SENHA || !SUPA_URL || !SUPA_KEY) return;
  const sb = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
  const { error: erroLogin } = await sb.auth.signInWithPassword({ email: EMAIL, password: SENHA });
  if (erroLogin) return;
  // apaga só o que o teste cria (prefixo E2E-) — escopo garantido
  await sb.from("tema").delete().like("nome", "E2E-%");
  await sb.auth.signOut();
});
