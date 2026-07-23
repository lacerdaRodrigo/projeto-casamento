import { test, expect } from "@playwright/test";

// Regressão de layout em telas pequenas:
//  1. os valores do painel de orçamento (.numeros b) não podem ser truncados
//     com "…" nem causar scroll horizontal;
//  2. o nome do item não pode ser espremido pela coluna de valor + ações.
// Somente leitura — o pior caso é injetado no DOM, nada é criado nem apagado.

const EMAIL = process.env.CASORIO_EMAIL;
const SENHA = process.env.CASORIO_SENHA;

// pior caso realista: valor de 6 dígitos com centavos
const PIOR_CASO = "R$ 300.000,00";

const TELAS = [
  { nome: "iPhone SE", width: 320, height: 568 },
  { nome: "Android comum", width: 360, height: 800 },
  { nome: "iPhone 12/13", width: 390, height: 844 },
  { nome: "tablet estreito", width: 480, height: 800 },
];

async function entrar(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("voce@email.com").fill(EMAIL!);
  await page.getByPlaceholder("senha (mín. 6)").fill(SENHA!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
}

test.describe("painel de orçamento é responsivo", () => {
  test.skip(!EMAIL || !SENHA, "faltam CASORIO_EMAIL/SENHA no .env.local");

  for (const tela of TELAS) {
    test(`sem truncar valores em ${tela.nome} (${tela.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: tela.width, height: tela.height });
      await entrar(page);

      const valores = page.locator(".numeros b");
      await expect(valores.first()).toBeVisible({ timeout: 15_000 });

      // força o pior caso em todos os valores (independe dos dados da conta)
      await valores.evaluateAll((els, texto) => {
        for (const el of els) el.textContent = texto;
      }, PIOR_CASO);

      // nenhum valor pode estourar a própria caixa (é o que gera o "…")
      const estourados = await valores.evaluateAll((els) =>
        els
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => `${el.textContent} (${el.scrollWidth}px em ${el.clientWidth}px)`),
      );
      expect(estourados, `valores truncados em ${tela.width}px`).toEqual([]);

      // e a página não pode ganhar scroll horizontal por causa disso
      const estouraPagina = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(estouraPagina, `scroll horizontal em ${tela.width}px`).toBe(false);
    });
  }
});

// nome comprido + comparação estimado × real = pior caso da linha do item
const TITULO_LONGO = "Coxinha de frango com catupiry cremoso";
const COMPARACAO_HTML = `
  <span class="valor-item comparacao">
    <span class="valor-cel"><span class="valor-rotulo">estimado</span><span class="valor-estimado">R$ 900,00</span></span>
    <span class="valor-cel"><span class="valor-rotulo">real</span><span class="valor-real">R$ 700,00</span></span>
    <span class="valor-cel"><span class="valor-rotulo">economia</span><span class="valor-delta economia">▼ R$ 200,00</span></span>
  </span>`;

test.describe("linha do item é responsiva", () => {
  test.skip(!EMAIL || !SENHA, "faltam CASORIO_EMAIL/SENHA no .env.local");

  for (const tela of TELAS) {
    test(`nome do item não fica espremido em ${tela.nome} (${tela.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: tela.width, height: tela.height });
      await entrar(page);

      // abre o primeiro tema (a aba 0 é "Visão geral", que não lista itens)
      const abas = page.locator(".abas .aba");
      await expect(abas.first()).toBeVisible({ timeout: 15_000 });
      test.skip((await abas.count()) < 2, "conta sem tema para abrir");
      await abas.nth(1).click();

      const item = page.locator(".item").first();
      await expect(item).toBeVisible({ timeout: 15_000 });

      // injeta o pior caso: título comprido + comparação de 3 células
      await item.evaluate(
        (el, { titulo, html }) => {
          const t = el.querySelector(".titulo");
          if (t) t.textContent = titulo;
          if (!el.querySelector(".valor-item.comparacao")) {
            el.querySelector(".valor-item")?.remove();
            el.querySelector(".item-lado")?.insertAdjacentHTML("afterbegin", html);
          }
        },
        { titulo: TITULO_LONGO, html: COMPARACAO_HTML },
      );

      // o texto do item precisa ficar com a maior parte da largura da linha —
      // era aqui que a coluna de valor + ações esmagava o nome (corpo ~0px)
      const { larguraItem, larguraCorpo } = await item.evaluate((el) => ({
        larguraItem: el.getBoundingClientRect().width,
        larguraCorpo: el.querySelector(".item-corpo")!.getBoundingClientRect().width,
      }));
      const fatia = larguraCorpo / larguraItem;
      expect(
        fatia,
        `nome espremido em ${tela.width}px: corpo ${Math.round(larguraCorpo)}px de ${Math.round(larguraItem)}px`,
      ).toBeGreaterThan(0.55);

      // e o título não pode passar por cima do valor/ações
      const invadiu = await item.evaluate((el) => {
        const titulo = el.querySelector(".titulo")!.getBoundingClientRect();
        const corpo = el.querySelector(".item-corpo")!.getBoundingClientRect();
        return titulo.right > corpo.right + 1;
      });
      expect(invadiu, `título vaza do corpo em ${tela.width}px`).toBe(false);

      // valor e ações não podem se sobrepor
      const colidem = await item.evaluate((el) => {
        const valor = el.querySelector(".valor-item")?.getBoundingClientRect();
        const acoes = el.querySelector(".item-acoes")?.getBoundingClientRect();
        if (!valor || !acoes) return false;
        return valor.right > acoes.left + 1 && valor.bottom > acoes.top + 1 && valor.top < acoes.bottom - 1;
      });
      expect(colidem, `valor sobrepõe as ações em ${tela.width}px`).toBe(false);

      const estouraPagina = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(estouraPagina, `scroll horizontal em ${tela.width}px`).toBe(false);
    });
  }
});
