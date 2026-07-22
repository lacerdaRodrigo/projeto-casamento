// Parsing + validação dos formulários (dado externo é hostil — §9).
// Separado das server actions PRA SER TESTÁVEL: aqui mora o contrato entre o
// nome do campo no HTML e o que o caso de uso recebe.
import { z } from "zod";

/** Dinheiro chega já em CENTAVOS (inteiro) do <CampoDinheiro>. Nunca float. */
export const centavosSchema = z.coerce.number().int().min(0);

// required_error/invalid_type_error cobrem o campo AUSENTE (null), senão o zod
// devolve texto cru em inglês ("Expected string, received null") pra tela.
const textoObrigatorio = (rotulo: string) =>
  z
    .string({
      required_error: `${rotulo} é obrigatório`,
      invalid_type_error: `${rotulo} é obrigatório`,
    })
    .trim()
    .min(1, `${rotulo} é obrigatório`);

// Sempre `string | null` (nunca undefined): os parsers já normalizam campo
// ausente para null, e as portas esperam null explícito.
const dataOpcional = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .nullable();

/** Lê um checkbox de FormData ("on" quando marcado). */
function checkbox(fd: FormData, nome: string): boolean {
  const v = fd.get(nome);
  return v === "on" || v === "true";
}

/** Lê um campo de dinheiro (hidden em centavos). Ausente = 0. */
function centavos(fd: FormData, nome: string): unknown {
  return fd.get(nome) ?? 0;
}

// --- casório -----------------------------------------------------------------
export const casorioSchema = z.object({
  nome: textoObrigatorio("Nome do casório"),
  dataCasamento: dataOpcional,
  orcamentoTotal: centavosSchema,
});
export type EntradaCasorio = z.infer<typeof casorioSchema>;

export function parseCasorio(fd: FormData): EntradaCasorio {
  return casorioSchema.parse({
    nome: fd.get("nome"),
    dataCasamento: (fd.get("dataCasamento") as string) || null,
    orcamentoTotal: centavos(fd, "orcamentoCentavos"),
  });
}

/** O casório novo deve nascer com o modelo pronto? (checkbox do onboarding) */
export function parseUsarModelo(fd: FormData): boolean {
  return checkbox(fd, "usarModelo");
}

/** Lê e valida um id (uuid) de um campo — usado pelas exclusões. */
export function parseId(fd: FormData, campo: string): string {
  return z
    .string({
      required_error: "Identificador ausente",
      invalid_type_error: "Identificador ausente",
    })
    .uuid("Identificador inválido")
    .parse(fd.get(campo));
}

// --- tema --------------------------------------------------------------------
export const temaSchema = z.object({
  casorioId: z.string().uuid(),
  nome: textoObrigatorio("Nome do tema"),
});

export function parseTema(fd: FormData) {
  return temaSchema.parse({ casorioId: fd.get("casorioId"), nome: fd.get("nome") });
}

// --- subtema -----------------------------------------------------------------
export const subtemaSchema = z.object({
  temaId: z.string().uuid(),
  casorioId: z.string().uuid(),
  nome: textoObrigatorio("Nome do subtema"),
});

export function parseSubtema(fd: FormData) {
  return subtemaSchema.parse({
    temaId: fd.get("temaId"),
    casorioId: fd.get("casorioId"),
    nome: fd.get("nome"),
  });
}

// --- compositores da tela "Montar" (form sempre completo) --------------------
// Tema/subtema podem nascer já com "tem custo"/"essencial" — que no domínio só
// existem em ITEM. O caso de uso (montar-arvore) semeia o primeiro item.
export const compositorTemaSchema = z.object({
  casorioId: z.string().uuid(),
  nome: textoObrigatorio("Nome do tema"),
  temCusto: z.boolean(),
  custoEstimado: centavosSchema,
  essencial: z.boolean(),
});

export function parseCompositorTema(fd: FormData) {
  return compositorTemaSchema.parse({
    casorioId: fd.get("casorioId"),
    nome: fd.get("nome"),
    temCusto: checkbox(fd, "temCusto"),
    custoEstimado: centavos(fd, "custoEstimadoCentavos"),
    essencial: checkbox(fd, "essencial"),
  });
}

export const compositorSubtemaSchema = z.object({
  temaId: z.string().uuid(),
  casorioId: z.string().uuid(),
  nome: textoObrigatorio("Nome do subtema"),
  temCusto: z.boolean(),
  custoEstimado: centavosSchema,
  essencial: z.boolean(),
});

export function parseCompositorSubtema(fd: FormData) {
  return compositorSubtemaSchema.parse({
    temaId: fd.get("temaId"),
    casorioId: fd.get("casorioId"),
    nome: fd.get("nome"),
    temCusto: checkbox(fd, "temCusto"),
    custoEstimado: centavos(fd, "custoEstimadoCentavos"),
    essencial: checkbox(fd, "essencial"),
  });
}

// --- item --------------------------------------------------------------------
export const itemSchema = z.object({
  subtemaId: z.string().uuid(),
  casorioId: z.string().uuid(),
  titulo: textoObrigatorio("Título do item"),
  temCusto: z.boolean(),
  custoEstimado: centavosSchema,
  dataAlvo: dataOpcional,
  essencial: z.boolean(),
});

export function parseItem(fd: FormData) {
  return itemSchema.parse({
    subtemaId: fd.get("subtemaId"),
    casorioId: fd.get("casorioId"),
    titulo: fd.get("titulo"),
    temCusto: checkbox(fd, "temCusto"),
    custoEstimado: centavos(fd, "custoEstimadoCentavos"),
    dataAlvo: (fd.get("dataAlvo") as string) || null,
    essencial: checkbox(fd, "essencial"),
  });
}

// --- mudar status ------------------------------------------------------------
export const mudarStatusSchema = z.object({
  itemId: z.string().uuid(),
  temCusto: z.boolean(),
  novoStatus: z.enum(
    ["a_fazer", "feito", "a_decidir", "decidido", "contratado", "pago", "descartado"],
    { message: "Status inválido" },
  ),
  custoReal: centavosSchema,
});
export type EntradaMudarStatus = z.infer<typeof mudarStatusSchema>;

export function parseMudarStatus(fd: FormData): EntradaMudarStatus {
  return mudarStatusSchema.parse({
    itemId: fd.get("itemId"),
    temCusto: fd.get("temCusto") === "true",
    novoStatus: fd.get("novoStatus"),
    custoReal: centavos(fd, "custoRealCentavos"),
  });
}

// --- edições -----------------------------------------------------------------

/** Texto opcional: vazio vira null (não guardar string em branco no banco). */
function textoOpcional(fd: FormData, campo: string): string | null {
  const v = (fd.get(campo) as string | null)?.trim();
  return v ? v : null;
}

export const renomearSchema = z.object({
  id: z.string().uuid("Identificador inválido"),
  nome: textoObrigatorio("Nome"),
});

/** Renomear tema/subtema (RF04/RF05). `campoId` diz de quem é o id. */
export function parseRenomear(fd: FormData, campoId: string) {
  return renomearSchema.parse({ id: fd.get(campoId), nome: fd.get("nome") });
}

export const editarItemSchema = z.object({
  itemId: z.string().uuid("Identificador inválido"),
  statusAtual: z.enum(
    ["a_fazer", "feito", "a_decidir", "decidido", "contratado", "pago", "descartado"],
    { message: "Status inválido" },
  ),
  temCustoAtual: z.boolean(),
  titulo: textoObrigatorio("Título do item"),
  temCusto: z.boolean(),
  custoEstimado: centavosSchema,
  custoReal: centavosSchema,
  dataAlvo: dataOpcional,
  essencial: z.boolean(),
  observacao: z.string().nullable(),
  fornecedorNome: z.string().nullable(),
  fornecedorContato: z.string().nullable(),
  fornecedorLink: z.string().nullable(),
});
export type EntradaEditarItem = z.infer<typeof editarItemSchema>;

export function parseEditarItem(fd: FormData): EntradaEditarItem {
  return editarItemSchema.parse({
    itemId: fd.get("itemId"),
    statusAtual: fd.get("statusAtual"),
    temCustoAtual: fd.get("temCustoAtual") === "true",
    titulo: fd.get("titulo"),
    temCusto: checkbox(fd, "temCusto"),
    custoEstimado: centavos(fd, "custoEstimadoCentavos"),
    custoReal: centavos(fd, "custoRealCentavos"),
    dataAlvo: (fd.get("dataAlvo") as string) || null,
    essencial: checkbox(fd, "essencial"),
    observacao: textoOpcional(fd, "observacao"),
    fornecedorNome: textoOpcional(fd, "fornecedorNome"),
    fornecedorContato: textoOpcional(fd, "fornecedorContato"),
    fornecedorLink: textoOpcional(fd, "fornecedorLink"),
  });
}

/** Traduz qualquer erro numa mensagem curta pra mostrar na tela. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Dados inválidos";
  if (e instanceof Error) return e.message;
  return "Erro inesperado";
}
