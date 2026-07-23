"use server";
// Server Actions = orquestração dos casos de uso. Todo dado externo é hostil:
// validado com zod ANTES de gravar (§9), além do RLS no banco.
//
// Regra de UX: toda ação dá retorno. Sucesso vira `?ok=` (toast verde), erro de
// regra vira `?erro=` (aviso vermelho) — nunca uma tela de crash. Os dois casos
// voltam pra MESMA url de origem, então os filtros ativos não se perdem.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/adapters/supabase/client";
import { SupabaseCasorioRepository } from "@/adapters/supabase/casorio-repository";
import { mudarStatusItem } from "@/application/mudar-status-item";
import { semearTemplate } from "@/application/semear-template";
import { editarItem } from "@/application/editar-item";
import { criarItemNoTema } from "@/application/criar-item-no-tema";
import { urlComMensagem } from "@/application/voltar-para";
import {
  mensagemDeErro,
  parseCasorio,
  parseEditarItem,
  parseId,
  parseItem,
  parseItemNoTema,
  parseMudarStatus,
  parseRenomear,
  parseSubtema,
  parseTema,
  parseUsarModelo,
} from "@/application/form-schemas";

async function getRepo() {
  const sb = await createSupabaseServerClient();
  return new SupabaseCasorioRepository(sb);
}

/** Caminho (sem query/hash) de uma URL de retorno — pra revalidar a rota certa. */
function caminhoDe(url: string): string {
  try {
    return new URL(url, "http://x").pathname || "/";
  } catch {
    return "/";
  }
}

/**
 * Executa o trabalho da action.
 *
 * SUCESSO: NÃO navega — só revalida a rota atual. A página se atualiza NO LUGAR
 * (o item muda na tela na hora), sem trocar de tela nem piscar loading. O
 * feedback de "Salvando…" fica no botão (useFormStatus).
 *
 * ERRO de regra: aí sim redireciona pra mesma URL com `?erro=`, pra mostrar o
 * aviso vermelho — nunca uma tela de crash. (O redirect lança, então fica FORA
 * do try.)
 */
async function executar(
  formData: FormData,
  _sucesso: string,
  trabalho: () => Promise<void>,
) {
  const bruto = formData.get("voltarPara");
  const voltarPara = typeof bruto === "string" && bruto ? bruto : "/";
  let erro: string | null = null;
  try {
    await trabalho();
  } catch (e) {
    erro = mensagemDeErro(e);
  }
  revalidatePath(caminhoDe(voltarPara));
  if (erro) redirect(urlComMensagem(voltarPara, "erro", erro));
  // sucesso: sem redirect — atualização no lugar
}

export async function criarCasorioAction(formData: FormData) {
  await executar(formData, "Casório criado!", async () => {
    const data = parseCasorio(formData);
    const usarModelo = parseUsarModelo(formData);
    const repo = await getRepo();
    const casorio = await repo.criarCasorio(data);
    if (usarModelo) await semearTemplate(repo, casorio.id); // RF12 / D09
  });
}

/** Semeia o modelo num casório que já existe (botão da árvore vazia). */
export async function carregarModeloAction(formData: FormData) {
  await executar(formData, "Modelo carregado!", async () => {
    const casorioId = parseId(formData, "casorioId");
    const repo = await getRepo();
    await semearTemplate(repo, casorioId);
  });
}

export async function criarTemaAction(formData: FormData) {
  await executar(formData, "Tema criado", async () => {
    const data = parseTema(formData);
    const repo = await getRepo();
    await repo.criarTema(data);
  });
}

export async function criarSubtemaAction(formData: FormData) {
  await executar(formData, "Subtema criado", async () => {
    const data = parseSubtema(formData);
    const repo = await getRepo();
    await repo.criarSubtema(data);
  });
}

/** Item com preço adicionado DIRETO no tema (cai no subtema "solto" oculto). */
export async function criarItemNoTemaAction(formData: FormData) {
  await executar(formData, "Item criado", async () => {
    const data = parseItemNoTema(formData);
    const repo = await getRepo();
    await criarItemNoTema(repo, data);
  });
}

export async function criarItemAction(formData: FormData) {
  await executar(formData, "Item criado", async () => {
    const data = parseItem(formData);
    const repo = await getRepo();
    await repo.criarItem(data);
  });
}

export async function mudarStatusAction(formData: FormData) {
  await executar(formData, "Status atualizado", async () => {
    const data = parseMudarStatus(formData);
    const repo = await getRepo();
    // valida RN05/06 no domínio antes de gravar (o banco também barra via CHECK)
    await mudarStatusItem(repo, data);
  });
}

// --- edições (RF04/RF05/RF06/RF09) ------------------------------------------

/** Ajustar nome, data e orçamento do casório (UC09). */
export async function editarCasorioAction(formData: FormData) {
  await executar(formData, "Casório atualizado", async () => {
    const id = parseId(formData, "casorioId");
    const dados = parseCasorio(formData);
    const repo = await getRepo();
    await repo.atualizarCasorio(id, dados);
  });
}

export async function renomearTemaAction(formData: FormData) {
  await executar(formData, "Tema renomeado", async () => {
    const { id, nome } = parseRenomear(formData, "temaId");
    const repo = await getRepo();
    await repo.renomearTema(id, nome);
  });
}

export async function renomearSubtemaAction(formData: FormData) {
  await executar(formData, "Subtema renomeado", async () => {
    const { id, nome } = parseRenomear(formData, "subtemaId");
    const repo = await getRepo();
    await repo.renomearSubtema(id, nome);
  });
}

export async function editarItemAction(formData: FormData) {
  await executar(formData, "Item salvo ✅", async () => {
    const { itemId, statusAtual, temCustoAtual, ...dados } = parseEditarItem(formData);
    const repo = await getRepo();
    // o caso de uso converte o status se o fluxo mudou (C2) e valida RN05/RN06
    await editarItem(repo, { itemId, statusAtual, temCustoAtual, dados });
  });
}

// --- exclusões (cascata garantida no banco — RN03) --------------------------

export async function excluirTemaAction(formData: FormData) {
  await executar(formData, "Tema apagado", async () => {
    const id = parseId(formData, "temaId");
    const repo = await getRepo();
    await repo.excluirTema(id);
  });
}

export async function excluirSubtemaAction(formData: FormData) {
  await executar(formData, "Subtema apagado", async () => {
    const id = parseId(formData, "subtemaId");
    const repo = await getRepo();
    await repo.excluirSubtema(id);
  });
}

export async function excluirItemAction(formData: FormData) {
  await executar(formData, "Item apagado", async () => {
    const id = parseId(formData, "itemId");
    const repo = await getRepo();
    await repo.excluirItem(id);
  });
}

export async function sairAction() {
  const sb = await createSupabaseServerClient();
  await sb.auth.signOut();
  redirect("/login");
}
