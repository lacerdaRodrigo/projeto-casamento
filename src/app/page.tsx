import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/adapters/supabase/client";
import { SupabaseAuthService } from "@/adapters/supabase/auth-service";
import { SupabaseCasorioRepository } from "@/adapters/supabase/casorio-repository";
import { formatarBRL } from "@/domain/money";
import { calcularPainelFinanceiro, type PainelFinanceiro } from "@/domain/financeiro";
import { isResolvido, type StatusItem } from "@/domain/status";
import {
  calcularPainelPrazos,
  classificarPrazo,
  diasEntre,
  DIAS_A_VENCER,
  type PainelPrazos,
  type SituacaoPrazo,
} from "@/domain/prazo";
import { progressoDe } from "@/domain/progresso";
import { camposDoItemNaArvore } from "@/domain/campos-item";
import {
  contarItens,
  filtrarArvore,
  filtroAtivo,
  type FiltroPrazo,
  type Filtros,
  type Situacao,
} from "@/domain/filtros";
import type { Casorio, Item, SubtemaComItens, TemaComFilhos } from "@/domain/entities";
import { CampoDinheiro } from "@/components/campo-dinheiro";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Toast } from "@/components/toast";
import { TAMANHO_TEMPLATE } from "@/application/semear-template";
import {
  carregarModeloAction,
  criarCasorioAction,
  criarItemAction,
  criarSubtemaAction,
  criarTemaAction,
  editarCasorioAction,
  editarItemAction,
  excluirItemAction,
  excluirSubtemaAction,
  excluirTemaAction,
  mudarStatusAction,
  renomearSubtemaAction,
  renomearTemaAction,
  sairAction,
} from "./actions";

/** "hoje" em America/Sao_Paulo (yyyy-mm-dd) — injetado no núcleo (D08). */
function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** "3 subtemas e 12 itens" — plural certo, pra usar no aviso de exclusão. */
function contar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** yyyy-mm-dd -> dd/mm/aaaa (RNF10). Sem Date, pra não pegar timezone. */
function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

const LABEL_STATUS: Record<StatusItem, string> = {
  a_fazer: "A fazer",
  feito: "Feito",
  a_decidir: "A decidir",
  decidido: "Decidido",
  contratado: "Contratado",
  pago: "Pago",
  descartado: "Descartado",
};

function statusOptions(temCusto: boolean): StatusItem[] {
  return temCusto
    ? ["a_decidir", "decidido", "contratado", "pago", "descartado"]
    : ["a_fazer", "feito", "descartado"];
}

/**
 * Campo escondido que leva a URL atual junto com a ação. É o que faz o filtro
 * ativo sobreviver a um salvamento (e a um erro).
 */
function Voltar({ para }: { para: string }) {
  return <input type="hidden" name="voltarPara" value={para} />;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    ok?: string;
    situacao?: string;
    essencial?: string;
    tema?: string;
    prazo?: string;
  }>;
}) {
  const sp = await searchParams;
  const sb = await createSupabaseServerClient();
  const user = await new SupabaseAuthService(sb).usuarioAtual();
  if (!user) redirect("/login");

  const repo = new SupabaseCasorioRepository(sb);
  const casorio = await repo.meuCasorio();
  if (!casorio) return <Onboarding />;

  const arvore = await repo.getArvore(casorio.id);
  // o "hoje" é resolvido AQUI (borda) e injetado no núcleo (D08)
  const hoje = hojeSaoPaulo();
  const dias = casorio.dataCasamento ? diasEntre(hoje, casorio.dataCasamento) : null;

  // C1 — motor financeiro roda sobre a árvore INTEIRA (o painel não filtra)
  const todosItens = arvore.flatMap((t) => t.subtemas.flatMap((s) => s.itens));
  const financeiro = calcularPainelFinanceiro(todosItens, casorio.orcamentoTotal);
  const geral = progressoDe(todosItens);
  const prazos = calcularPainelPrazos(todosItens, hoje); // C3

  // RF13 — filtros vindos da URL
  const filtros: Filtros = {
    situacao: (["todos", "pendentes", "resolvidos"] as const).includes(sp.situacao as Situacao)
      ? (sp.situacao as Situacao)
      : "todos",
    somenteEssenciais: sp.essencial === "1",
    temaId: sp.tema || null,
    prazo: (["todos", "atrasados", "a_vencer"] as const).includes(sp.prazo as FiltroPrazo)
      ? (sp.prazo as FiltroPrazo)
      : "todos",
  };
  const arvoreVisivel = filtrarArvore(arvore, filtros, hoje);
  const ativo = filtroAtivo(filtros);
  const totalItens = contarItens(arvore);
  const visiveis = contarItens(arvoreVisivel);

  // URL atual SEM a mensagem — vai junto de cada ação pra o filtro sobreviver
  const query = new URLSearchParams();
  if (filtros.situacao !== "todos") query.set("situacao", filtros.situacao);
  if (filtros.somenteEssenciais) query.set("essencial", "1");
  if (filtros.temaId) query.set("tema", filtros.temaId);
  if (filtros.prazo !== "todos") query.set("prazo", filtros.prazo);
  const voltarPara = query.size > 0 ? `/?${query}` : "/";

  return (
    <main>
      <div className="topo">
        <div>
          <h1>💍 {casorio.nome}</h1>
          <div className="painel">
            {dias !== null && (
              <span>
                <b>{dias}</b> dias pro casório
              </span>
            )}
            <span>
              <b>
                {geral.resolvidos}/{geral.total}
              </b>{" "}
              resolvidos ({geral.percentual}%)
            </span>
            {geral.essenciaisPendentes > 0 && (
              <span className="pendente-essencial">
                ⭐ <b>{geral.essenciaisPendentes}</b> essenciais pendentes
              </span>
            )}
          </div>
        </div>
        <div className="linha">
          <Link href="/ajuda" className="botao-link">
            📖 Como usar
          </Link>
          <form action={sairAction}>
            <button className="leve" type="submit">
              Sair
            </button>
          </form>
        </div>
      </div>

      {sp.ok && <Toast mensagem={sp.ok} tipo="ok" voltarPara={voltarPara} />}
      {sp.erro && <Toast mensagem={sp.erro} tipo="erro" voltarPara={voltarPara} />}

      <PainelDinheiro painel={financeiro} />
      <PainelPrazosView prazos={prazos} />
      <EditarCasorio casorio={casorio} voltarPara={voltarPara} />

      {arvore.length > 0 && (
        <BarraFiltros
          temas={arvore.map((t) => ({ id: t.id, nome: t.nome }))}
          filtros={filtros}
          ativo={ativo}
          visiveis={visiveis}
          total={totalItens}
        />
      )}

      <FormTema casorioId={casorio.id} voltarPara={voltarPara} />

      {arvore.length === 0 && <ArvoreVazia casorioId={casorio.id} voltarPara={voltarPara} />}
      {arvore.length > 0 && arvoreVisivel.length === 0 && <SemResultado />}

      {arvoreVisivel.map((tema) => (
        <Tema
          key={tema.id}
          tema={tema}
          casorioId={casorio.id}
          voltarPara={voltarPara}
          hoje={hoje}
          aberto={ativo || arvoreVisivel.length === 1}
        />
      ))}
    </main>
  );
}

function Onboarding() {
  return (
    <main className="centro">
      <div className="cartao">
        <h1>💍 Bem-vindos!</h1>
        <p className="sub">Vamos criar o seu casório. Você vira o Dono.</p>
        <form action={criarCasorioAction} className="coluna">
          <input name="nome" placeholder="Nome (ex.: Rodrigo & Jennifer)" required />
          <label className="mini">
            Data do casamento
            <input type="date" name="dataCasamento" />
          </label>
          <label className="mini">
            Orçamento total (R$)
            <CampoDinheiro name="orcamentoCentavos" aria-label="Orçamento total em reais" />
          </label>

          <label className="linha caixa-modelo">
            <input type="checkbox" name="usarModelo" defaultChecked />
            <span>
              <b>Começar com o modelo pronto</b>
              <br />
              <span className="sub mini">
                {TAMANHO_TEMPLATE.temas} temas e {TAMANHO_TEMPLATE.itens} itens típicos de
                casamento. Você apaga o que não servir.
              </span>
            </span>
          </label>

          <button type="submit">Criar casório</button>
        </form>
        <p className="sub mini" style={{ marginTop: "1rem", textAlign: "center" }}>
          Primeira vez? <Link href="/ajuda">Veja como usar</Link>
        </p>
      </div>
    </main>
  );
}

/** RF09 — painel de orçamento. Os números vêm do C1 (domínio puro). */
function PainelDinheiro({ painel }: { painel: PainelFinanceiro }) {
  const { orcamento, orcamentoDefinido, estimadoTotal, comprometido, pago, saldo, estourou, semPreco } =
    painel;
  const usado = orcamentoDefinido ? Math.min(100, (estimadoTotal / orcamento) * 100) : 0;

  return (
    <section className={`dinheiro ${estourou ? "estourou" : ""}`}>
      <div className="numeros">
        <div>
          <span className="rotulo">Orçamento</span>
          {orcamentoDefinido ? <b>{formatarBRL(orcamento)}</b> : <b className="indefinido">—</b>}
        </div>
        <div>
          <span className="rotulo">Planejado</span>
          <b>{formatarBRL(estimadoTotal)}</b>
        </div>
        <div>
          <span className="rotulo">Comprometido</span>
          <b>{formatarBRL(comprometido)}</b>
        </div>
        <div>
          <span className="rotulo">Pago</span>
          <b>{formatarBRL(pago)}</b>
        </div>
        <div className={orcamentoDefinido && saldo < 0 ? "negativo" : "positivo"}>
          <span className="rotulo">Saldo</span>
          {orcamentoDefinido ? <b>{formatarBRL(saldo)}</b> : <b className="indefinido">—</b>}
        </div>
      </div>

      {orcamentoDefinido && (
        <div className="barra" aria-hidden="true">
          <div className="barra-cheia" style={{ width: `${usado}%` }} />
        </div>
      )}

      {!orcamentoDefinido && estimadoTotal > 0 && (
        <p className="atencao">
          💡 Você ainda não definiu o <b>orçamento total</b> do casamento. Sem ele não dá pra
          calcular saldo nem avisar de estouro. Defina em <b>⚙️ Ajustar casório</b>, logo abaixo.
          <br />
          <span className="mini">
            (Atenção: o orçamento é o teto do casamento inteiro — não é pra ser preenchido como
            custo de um item.)
          </span>
        </p>
      )}

      {estourou && (
        <p className="alerta">
          🚨 O plano passou do orçamento em <b>{formatarBRL(-saldo)}</b>. Dá pra cortar ou
          descartar algo enquanto ainda há tempo.
        </p>
      )}

      {semPreco > 0 && (
        <p className="atencao">
          ⚠️ {semPreco} {semPreco === 1 ? "item tem custo mas está" : "itens têm custo mas estão"}{" "}
          sem valor — {semPreco === 1 ? "ele não entra" : "eles não entram"} na conta ainda.
        </p>
      )}
    </section>
  );
}

/** RF10 — painel de prazos. Números vindos do C3 (domínio puro). */
function PainelPrazosView({ prazos }: { prazos: PainelPrazos }) {
  const { atrasados, aVencer } = prazos;
  if (atrasados === 0 && aVencer === 0) return null;

  return (
    <section className={`prazos ${atrasados > 0 ? "tem-atraso" : ""}`}>
      {atrasados > 0 && (
        <Link href="/?prazo=atrasados" className="chip atrasado">
          ⏰ <b>{atrasados}</b> {atrasados === 1 ? "item atrasado" : "itens atrasados"}
        </Link>
      )}
      {aVencer > 0 && (
        <Link href="/?prazo=a_vencer" className="chip a-vencer">
          ⌛ <b>{aVencer}</b> {aVencer === 1 ? "vence" : "vencem"} em até {DIAS_A_VENCER} dias
        </Link>
      )}
    </section>
  );
}

/** UC09 — ajustar nome, data e orçamento depois de criado (RF09). */
function EditarCasorio({ casorio, voltarPara }: { casorio: Casorio; voltarPara: string }) {
  return (
    <details className="editor">
      <summary>⚙️ Ajustar casório (nome, data, orçamento)</summary>
      <form action={editarCasorioAction} className="grade">
        <Voltar para={voltarPara} />
        <input type="hidden" name="casorioId" value={casorio.id} />
        <label>
          Nome
          <input name="nome" defaultValue={casorio.nome} required />
        </label>
        <label>
          Data do casamento
          <input type="date" name="dataCasamento" defaultValue={casorio.dataCasamento ?? ""} />
        </label>
        <label>
          Orçamento total (R$)
          <CampoDinheiro
            name="orcamentoCentavos"
            defaultCentavos={casorio.orcamentoTotal}
            aria-label="Orçamento total"
          />
        </label>
        <div className="acoes-form">
          <button type="submit">Salvar</button>
        </div>
      </form>
    </details>
  );
}

/** RF13 — filtros. Form GET puro: sem JavaScript, e a URL guarda o estado. */
function BarraFiltros({
  temas,
  filtros,
  ativo,
  visiveis,
  total,
}: {
  /** Só id e nome — passar a árvore inteira duplicaria todos os itens no
      payload enviado ao navegador. */
  temas: { id: string; nome: string }[];
  filtros: Filtros;
  ativo: boolean;
  visiveis: number;
  total: number;
}) {
  return (
    <form method="get" className="filtros">
      <label className="mini">
        Mostrar
        <select name="situacao" defaultValue={filtros.situacao}>
          <option value="todos">Tudo</option>
          <option value="pendentes">Só o que falta</option>
          <option value="resolvidos">Só o que já resolvi</option>
        </select>
      </label>

      <label className="mini">
        Tema
        <select name="tema" defaultValue={filtros.temaId ?? ""}>
          <option value="">Todos</option>
          {temas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="mini">
        Prazo
        <select name="prazo" defaultValue={filtros.prazo}>
          <option value="todos">Qualquer</option>
          <option value="atrasados">⏰ Só atrasados</option>
          <option value="a_vencer">⌛ Vencendo em {DIAS_A_VENCER} dias</option>
        </select>
      </label>

      <label className="linha mini">
        <input type="checkbox" name="essencial" value="1" defaultChecked={filtros.somenteEssenciais} />{" "}
        ⭐ só essenciais
      </label>

      <button type="submit">Filtrar</button>
      {ativo && (
        <Link href="/" className="botao-link">
          Limpar
        </Link>
      )}

      <span className="contagem mini">
        exibindo <b>{visiveis}</b> de {total} itens
      </span>
    </form>
  );
}

function SemResultado() {
  return (
    <div className="vazio">
      <p className="sub">Nenhum item bate com esse filtro.</p>
      <Link href="/" className="botao-link">
        Limpar filtros
      </Link>
    </div>
  );
}

function ArvoreVazia({ casorioId, voltarPara }: { casorioId: string; voltarPara: string }) {
  return (
    <div className="vazio">
      <p className="sub">Sem temas ainda. Crie o primeiro acima ☝️</p>
      <p className="sub mini">…ou comece do modelo pronto e apague o que não servir:</p>
      <form action={carregarModeloAction}>
        <Voltar para={voltarPara} />
        <input type="hidden" name="casorioId" value={casorioId} />
        <button type="submit">
          ✨ Carregar modelo pronto ({TAMANHO_TEMPLATE.itens} itens)
        </button>
      </form>
    </div>
  );
}

function FormTema({ casorioId, voltarPara }: { casorioId: string; voltarPara: string }) {
  return (
    <form action={criarTemaAction} className="linha mini form-novo-tema">
      <Voltar para={voltarPara} />
      <input type="hidden" name="casorioId" value={casorioId} />
      <input name="nome" placeholder="Novo tema (ex.: Comida)" required />
      <button type="submit">+ Tema</button>
    </form>
  );
}

/** Tema fechado por padrão, com resumo na própria linha. */
function Tema({
  tema,
  casorioId,
  voltarPara,
  hoje,
  aberto,
}: {
  tema: TemaComFilhos;
  casorioId: string;
  voltarPara: string;
  hoje: string;
  aberto: boolean;
}) {
  const itens = tema.subtemas.flatMap((s) => s.itens);
  const progresso = progressoDe(itens);
  const dinheiro = calcularPainelFinanceiro(itens, 0);
  const prazos = calcularPainelPrazos(itens, hoje);
  const filhos =
    tema.subtemas.length === 0
      ? ""
      : ` com ${contar(tema.subtemas.length, "subtema", "subtemas")} e ${contar(itens.length, "item", "itens")}`;

  return (
    <details className="tema" open={aberto}>
      <summary className="tema-resumo">
        <span className="tema-nome">{tema.nome}</span>
        <span className="tema-meta">
          {contar(tema.subtemas.length, "subtema", "subtemas")} ·{" "}
          {progresso.resolvidos}/{progresso.total} resolvidos
          {dinheiro.estimadoTotal > 0 && <> · {formatarBRL(dinheiro.estimadoTotal)}</>}
          {progresso.essenciaisPendentes > 0 && (
            <> · ⭐ {progresso.essenciaisPendentes} pendentes</>
          )}
          {prazos.atrasados > 0 && (
            <span className="meta-atraso"> · ⏰ {prazos.atrasados} atrasado(s)</span>
          )}
        </span>
      </summary>

      <div className="tema-corpo">
        <div className="linha-acoes">
          <details className="renomear">
            <summary>✏️ Renomear tema</summary>
            <form action={renomearTemaAction} className="linha mini">
              <Voltar para={voltarPara} />
              <input type="hidden" name="temaId" value={tema.id} />
              <input name="nome" defaultValue={tema.nome} required aria-label="Novo nome do tema" />
              <button type="submit">Renomear</button>
            </form>
          </details>
          <form action={excluirTemaAction}>
            <Voltar para={voltarPara} />
            <input type="hidden" name="temaId" value={tema.id} />
            <BotaoExcluir
              titulo={`Excluir tema ${tema.nome}`}
              aviso={`Apagar o tema "${tema.nome}"${filhos}?\n\nIsso não tem volta.`}
            />
          </form>
        </div>

        <form action={criarSubtemaAction} className="linha mini">
          <Voltar para={voltarPara} />
          <input type="hidden" name="casorioId" value={casorioId} />
          <input type="hidden" name="temaId" value={tema.id} />
          <input name="nome" placeholder="Novo subtema (ex.: Bebidas)" required />
          <button type="submit">+ Subtema</button>
        </form>

        {tema.subtemas.map((sub) => (
          <Subtema
            key={sub.id}
            subtema={sub}
            casorioId={casorioId}
            voltarPara={voltarPara}
            hoje={hoje}
            temaNome={tema.nome}
          />
        ))}
      </div>
    </details>
  );
}

function Subtema({
  subtema,
  casorioId,
  voltarPara,
  hoje,
  temaNome,
}: {
  subtema: SubtemaComItens;
  casorioId: string;
  voltarPara: string;
  hoje: string;
  temaNome: string;
}) {
  return (
    <div className="subtema">
      <div className="cabecalho">
        <details className="renomear">
          <summary>
            <h4>{subtema.nome}</h4>
          </summary>
          <form action={renomearSubtemaAction} className="linha mini">
            <Voltar para={voltarPara} />
            <input type="hidden" name="subtemaId" value={subtema.id} />
            <input
              name="nome"
              defaultValue={subtema.nome}
              required
              aria-label="Novo nome do subtema"
            />
            <button type="submit">Renomear</button>
          </form>
        </details>
        <form action={excluirSubtemaAction}>
          <Voltar para={voltarPara} />
          <input type="hidden" name="subtemaId" value={subtema.id} />
          <BotaoExcluir
            titulo={`Excluir subtema ${subtema.nome}`}
            aviso={
              subtema.itens.length === 0
                ? `Apagar o subtema "${subtema.nome}"?\n\nIsso não tem volta.`
                : `Apagar o subtema "${subtema.nome}" com ${contar(subtema.itens.length, "item", "itens")}?\n\nIsso não tem volta.`
            }
          />
        </form>
      </div>

      {subtema.itens.map((item) => (
        <ItemLinha
          key={item.id}
          item={item}
          voltarPara={voltarPara}
          hoje={hoje}
          temaNome={temaNome}
          subtemaNome={subtema.nome}
        />
      ))}

      <form action={criarItemAction} className="linha mini">
        <Voltar para={voltarPara} />
        <input type="hidden" name="casorioId" value={casorioId} />
        <input type="hidden" name="subtemaId" value={subtema.id} />
        <input name="titulo" placeholder="Novo item (ex.: Refrigerante)" required />
        <label className="linha">
          <input type="checkbox" name="temCusto" /> tem custo
        </label>
        <CampoDinheiro name="custoEstimadoCentavos" placeholder="estimado R$" aria-label="Custo estimado" />
        <label className="linha">
          <input type="checkbox" name="essencial" /> essencial
        </label>
        <button type="submit">+ Item</button>
      </form>
    </div>
  );
}

function ItemLinha({
  item,
  voltarPara,
  hoje,
  temaNome,
  subtemaNome,
}: {
  item: Item;
  voltarPara: string;
  hoje: string;
  temaNome: string;
  subtemaNome: string;
}) {
  const resolvido = isResolvido(item.status, item.temCusto);
  // salvar volta pra esta âncora — assim você não perde o lugar na árvore
  const voltarProItem = `${voltarPara}#item-${item.id}`;
  const prazo = classificarPrazo(item, hoje);
  return (
    <div className={`item prazo-${prazo}`} id={`item-${item.id}`}>
      <div className="item-topo">
        <ResumoItem item={item} resolvido={resolvido} prazo={prazo} hoje={hoje} />
        <FormStatus item={item} voltarPara={voltarProItem} />
      </div>
      <EditorItem
        item={item}
        voltarPara={voltarProItem}
        temaNome={temaNome}
        subtemaNome={subtemaNome}
      />
    </div>
  );
}

function ResumoItem({
  item,
  resolvido,
  prazo,
  hoje,
}: {
  item: Item;
  resolvido: boolean;
  prazo: SituacaoPrazo;
  hoje: string;
}) {
  return (
    <div className="item-resumo">
      <span className="titulo">{item.titulo}</span>{" "}
      <span className={`badge ${resolvido ? "resolvido" : ""}`}>{LABEL_STATUS[item.status]}</span>{" "}
      {item.essencial && <span className="badge essencial">essencial</span>}{" "}
      {item.temCusto && (
        <span className="mini">
          · {formatarBRL(item.custoReal > 0 ? item.custoReal : item.custoEstimado)}
        </span>
      )}
      {item.dataAlvo && <EtiquetaPrazo dataAlvo={item.dataAlvo} prazo={prazo} hoje={hoje} />}
      {item.fornecedorNome && <span className="mini"> · 🏪 {item.fornecedorNome}</span>}
      {item.observacao && <p className="observacao">{item.observacao}</p>}
    </div>
  );
}

/** Traduz o prazo em linguagem de gente: "atrasado 3 dias", "vence amanhã". */
function EtiquetaPrazo({
  dataAlvo,
  prazo,
  hoje,
}: {
  dataAlvo: string;
  prazo: SituacaoPrazo;
  hoje: string;
}) {
  const dias = diasEntre(hoje, dataAlvo);
  const data = formatarData(dataAlvo);

  if (prazo === "atrasado") {
    const atraso = Math.abs(dias);
    return (
      <span className="badge atrasado" title={`Data-alvo: ${data}`}>
        ⏰ atrasado {atraso === 1 ? "1 dia" : `${atraso} dias`}
      </span>
    );
  }

  if (prazo === "a_vencer") {
    const texto = dias === 0 ? "vence hoje" : dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;
    return (
      <span className="badge a-vencer" title={`Data-alvo: ${data}`}>
        ⌛ {texto}
      </span>
    );
  }

  return <span className="mini"> · 📅 {data}</span>;
}

/** Bloco de fornecedor — só onde a curadoria diz que faz sentido. */
function BlocoFornecedor({ item }: { item: Item }) {
  const preenchido = Boolean(item.fornecedorNome || item.fornecedorContato || item.fornecedorLink);
  return (
    <details className="fornecedor largo" open={preenchido}>
      <summary>🏪 Fornecedor</summary>
      <div className="grade-fornecedor">
        <label>
          Nome
          <input name="fornecedorNome" defaultValue={item.fornecedorNome ?? ""} placeholder="nome" />
        </label>
        <label>
          Telefone
          <input
            name="fornecedorContato"
            defaultValue={item.fornecedorContato ?? ""}
            placeholder="(00) 00000-0000"
          />
        </label>
        <label className="largo">
          Link
          <input
            name="fornecedorLink"
            defaultValue={item.fornecedorLink ?? ""}
            placeholder="https://…"
          />
        </label>
      </div>
    </details>
  );
}

/**
 * Editor do item (RF06) mostrando só os campos que fazem sentido pra ele.
 * A curadoria vem de `camposDoItemNaArvore` (domínio). Os campos de dinheiro
 * são sempre renderizados, mas o CSS os esconde enquanto "tem custo" estiver
 * desmarcado — assim eles aparecem na hora em que você marca a caixa.
 */
function EditorItem({
  item,
  voltarPara,
  temaNome,
  subtemaNome,
}: {
  item: Item;
  voltarPara: string;
  temaNome: string;
  subtemaNome: string;
}) {
  const campos = camposDoItemNaArvore({ temaNome, subtemaNome, temCusto: item.temCusto });

  return (
    <details className="editor">
      <summary>✏️ Editar</summary>
      <form action={editarItemAction} className="grade">
        <Voltar para={voltarPara} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="statusAtual" value={item.status} />
        <input type="hidden" name="temCustoAtual" value={String(item.temCusto)} />

        <label className="largo">
          Título
          <input name="titulo" defaultValue={item.titulo} required />
        </label>

        <label className="caixa">
          <input type="checkbox" name="temCusto" defaultChecked={item.temCusto} /> Tem custo
        </label>
        <label className="caixa">
          <input type="checkbox" name="essencial" defaultChecked={item.essencial} /> Essencial
        </label>

        <label>
          Data-alvo
          <input type="date" name="dataAlvo" defaultValue={item.dataAlvo ?? ""} />
        </label>

        <label className="largo">
          Observação
          <input
            name="observacao"
            defaultValue={item.observacao ?? ""}
            placeholder="anotação livre"
          />
        </label>

        {/* dinheiro: some junto com o checkbox "tem custo" (CSS, sem JS) */}
        <label className="so-com-custo">
          Custo estimado (R$)
          <CampoDinheiro
            name="custoEstimadoCentavos"
            defaultCentavos={item.custoEstimado}
            aria-label="Custo estimado"
          />
        </label>
        <label className="so-com-custo">
          Custo real (R$)
          <CampoDinheiro
            name="custoRealCentavos"
            defaultCentavos={item.custoReal}
            aria-label="Custo real"
          />
        </label>

        {campos.fornecedor && (
          <div className="so-com-custo largo">
            <BlocoFornecedor item={item} />
          </div>
        )}

        {/* escape: o que a curadoria escondeu continua alcançável */}
        {!campos.fornecedor && (
          <details className="mais-campos largo">
            <summary>+ mais campos</summary>
            <BlocoFornecedor item={item} />
          </details>
        )}

        <div className="acoes-form">
          <button type="submit">Salvar item</button>
        </div>
      </form>
    </details>
  );
}

function FormStatus({ item, voltarPara }: { item: Item; voltarPara: string }) {
  return (
    <>
      <form action={mudarStatusAction} className="linha mini">
        <Voltar para={voltarPara} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="temCusto" value={String(item.temCusto)} />
        <select name="novoStatus" defaultValue={item.status}>
          {statusOptions(item.temCusto).map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS[s]}
            </option>
          ))}
        </select>
        {item.temCusto && (
          <CampoDinheiro
            name="custoRealCentavos"
            placeholder="real R$"
            defaultCentavos={item.custoReal}
            aria-label="Custo real"
          />
        )}
        <button className="leve" type="submit">
          Salvar
        </button>
      </form>

      <form action={excluirItemAction}>
        <Voltar para={voltarPara} />
        <input type="hidden" name="itemId" value={item.id} />
        <BotaoExcluir
          titulo={`Excluir item ${item.titulo}`}
          aviso={`Apagar o item "${item.titulo}"?\n\nIsso não tem volta.`}
        />
      </form>
    </>
  );
}
