import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// RF06 na leitura: o que a pessoa preencheu tem que APARECER rotulado na linha
// do item — "Data-alvo:", "Fornecedor:", "Telefone:", "Link:", "Observação:" —
// e o que ela NÃO preencheu não pode aparecer.
//
// ESCOPADO: cria um tema "E2E-<ts>" próprio e apaga esse tema pelo id no fim.
// Não toca em nenhum dado que o teste não tenha criado.

const EMAIL = process.env.CASORIO_EMAIL;
const SENHA = process.env.CASORIO_SENHA;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEMA = `E2E-forn-${Date.now()}`;

const ITEM_CHEIO = {
  titulo: "Item E2E com fornecedor",
  data_alvo: "2026-11-14",
  observacao: "pagar 50% na assinatura",
  fornecedor_nome: "Buffet Teste",
  fornecedor_contato: "(11) 98888-7777",
  fornecedor_link: "instagram.com/buffet-teste",
};
const ITEM_VAZIO = { titulo: "Item E2E sem fornecedor" };

let sb: SupabaseClient;
let temaId: string | null = null;

test.describe("campos do item aparecem rotulados", () => {
  test.skip(
    !EMAIL || !SENHA || !SUPA_URL || !SUPA_KEY,
    "faltam credenciais no .env.local",
  );

  test.beforeAll(async () => {
    sb = createClient(SUPA_URL!, SUPA_KEY!, { auth: { persistSession: false } });
    const { error: erroLogin } = await sb.auth.signInWithPassword({
      email: EMAIL!,
      password: SENHA!,
    });
    if (erroLogin) throw new Error(`login supabase: ${erroLogin.message}`);

    const { data: casorios } = await sb.from("casorio").select("id").limit(1);
    const casorioId = casorios?.[0]?.id as string | undefined;
    if (!casorioId) throw new Error("conta de teste sem casório");

    const { data: tema, error: erroTema } = await sb
      .from("tema")
      .insert({ casorio_id: casorioId, nome: TEMA, ordem: 99 })
      .select("id")
      .single();
    if (erroTema) throw new Error(`criar tema: ${erroTema.message}`);
    temaId = tema.id as string;

    const { data: subtema, error: erroSub } = await sb
      .from("subtema")
      .insert({ tema_id: temaId, casorio_id: casorioId, nome: "(itens do tema)", ordem: -1 })
      .select("id")
      .single();
    if (erroSub) throw new Error(`criar subtema: ${erroSub.message}`);

    const base = { subtema_id: subtema.id, casorio_id: casorioId, tem_custo: true, status: "a_decidir" };
    const { error: erroItens } = await sb
      .from("item")
      .insert([
        { ...base, ...ITEM_CHEIO, custo_estimado: 100_000, ordem: 0 },
        { ...base, ...ITEM_VAZIO, custo_estimado: 5_000, ordem: 1 },
      ]);
    if (erroItens) throw new Error(`criar itens: ${erroItens.message}`);
  });

  // limpeza: apaga SÓ o tema criado aqui, pelo id (itens caem em cascata)
  test.afterAll(async () => {
    if (temaId) await sb.from("tema").delete().eq("id", temaId);
    await sb.auth.signOut();
  });

  test("mostra rótulo e valor de cada campo preenchido, e nada do vazio", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/login");
    await page.getByPlaceholder("voce@email.com").fill(EMAIL!);
    await page.getByPlaceholder("senha (mín. 6)").fill(SENHA!);
    await page.getByRole("button", { name: "Entrar" }).click();

    const aba = page.locator(".abas .aba").filter({ hasText: TEMA }).first();
    await expect(aba).toBeVisible({ timeout: 15_000 });
    await aba.click();

    const cheio = page.locator(".item").filter({ hasText: ITEM_CHEIO.titulo }).first();
    await expect(cheio).toBeVisible({ timeout: 15_000 });

    // rótulo + valor, pra pessoa saber do que se trata
    await expect(cheio).toContainText("Data-alvo: 14/11/2026");
    await expect(cheio).toContainText(`Fornecedor: ${ITEM_CHEIO.fornecedor_nome}`);
    await expect(cheio).toContainText(`Telefone: ${ITEM_CHEIO.fornecedor_contato}`);
    await expect(cheio).toContainText("Link: instagram.com/buffet-teste");
    await expect(cheio).toContainText(`Observação: ${ITEM_CHEIO.observacao}`);

    // telefone disca e link abre em aba nova, com esquema completo
    await expect(cheio.locator("a[href^='tel:']")).toHaveAttribute("href", "tel:11988887777");
    const link = cheio.locator(".campo-link a");
    await expect(link).toHaveAttribute("href", "https://instagram.com/buffet-teste");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);

    // item sem nada preenchido não ganha rótulo nenhum
    const vazio = page.locator(".item").filter({ hasText: ITEM_VAZIO.titulo }).first();
    await expect(vazio).toBeVisible();
    for (const rotulo of ["Data-alvo:", "Fornecedor:", "Telefone:", "Link:", "Observação:"]) {
      await expect(vazio).not.toContainText(rotulo);
    }
  });
});
