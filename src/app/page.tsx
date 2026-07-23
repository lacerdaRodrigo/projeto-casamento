import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/adapters/supabase/client";
import { SupabaseAuthService } from "@/adapters/supabase/auth-service";
import { SupabaseCasorioRepository } from "@/adapters/supabase/casorio-repository";
import { formatarBRL, type Centavos } from "@/domain/money";
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
import { progressoDe, type Progresso } from "@/domain/progresso";
import { ehSoltos } from "@/domain/subtema-soltos";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { PainelAbas } from "@/components/painel-abas";
import { AcoesTema } from "@/components/acoes-tema";
import { AcoesItem } from "@/components/acoes-item";
import { Compositor } from "@/components/compositor";
import { SubmitButton } from "@/components/submit-button";
import { TAMANHO_TEMPLATE } from "@/application/semear-template";
import {
  carregarModeloAction,
  criarCasorioAction,
  criarItemAction,
  criarItemNoTemaAction,
  criarSubtemaAction,
  criarTemaAction,
  editarCasorioAction,
  editarItemAction,
  excluirSubtemaAction,
  mudarStatusAction,
  renomearSubtemaAction,
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

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** yyyy-mm-dd -> "14 de novembro de 2026". Sem Date (fuso). */
function dataPorExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${ano}`;
}

/** Valor compacto pros resumos ("R$ 8,5 mil"). Cheio nos totais principais. */
function brlCompacto(c: Centavos): string {
  const reais = c / 100;
  if (reais >= 1000) {
    return `R$ ${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `R$ ${reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

/** "Rodrigo & Jennifer" -> "R&J" pro avatar. */
function iniciais(nome: string): string {
  const partes = nome
    .split(/\s*&\s*|\s+e\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length >= 2) {
    return partes
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("&");
  }
  return nome.trim().slice(0, 2).toUpperCase() || "💍";
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
    prazo?: string;
    aba?: string;
  }>;
}) {
  const sp = await searchParams;
  const sb = await createSupabaseServerClient();
  // portão de UI: sessão local (sem rede) — o middleware já validou/refrescou.
  // Os dados seguem protegidos por RLS.
  const user = await new SupabaseAuthService(sb).usuarioDaSessao();
  if (!user) redirect("/login");

  const repo = new SupabaseCasorioRepository(sb);
  // casório + árvore numa query só (1 round-trip). RLS escopa ao casal.
  const dados = await repo.meuCasorioComArvore();
  if (!dados) return <Onboarding />;
  const { casorio, arvore } = dados;
  // o "hoje" é resolvido AQUI (borda) e injetado no núcleo (D08)
  const hoje = hojeSaoPaulo();
  const dias = casorio.dataCasamento ? diasEntre(hoje, casorio.dataCasamento) : null;

  // C1 — motor financeiro roda sobre a árvore INTEIRA (o painel não filtra)
  const todosItens = arvore.flatMap((t) => t.subtemas.flatMap((s) => s.itens));
  const financeiro = calcularPainelFinanceiro(todosItens, casorio.orcamentoTotal);
  const geral = progressoDe(todosItens);
  const prazos = calcularPainelPrazos(todosItens, hoje); // C3

  // RF13 — filtros vindos da URL. O tema agora é escolhido pelas ABAS, não por
  // dropdown — então temaId fica sempre null aqui.
  const filtros: Filtros = {
    situacao: (["todos", "pendentes", "resolvidos"] as const).includes(sp.situacao as Situacao)
      ? (sp.situacao as Situacao)
      : "todos",
    somenteEssenciais: sp.essencial === "1",
    temaId: null,
    prazo: (["todos", "atrasados", "a_vencer"] as const).includes(sp.prazo as FiltroPrazo)
      ? (sp.prazo as FiltroPrazo)
      : "todos",
  };
  const ativo = filtroAtivo(filtros);
  const totalItens = contarItens(arvore);

  // aba escolhida: 'overview' ou um id de tema. Filtro ativo esconde as abas
  // (a lista achata todos os temas que batem).
  const abaValida = sp.aba && arvore.some((t) => t.id === sp.aba) ? sp.aba : "overview";

  // Caminho de FILTRO (server): achata todos os temas que batem.
  const arvoreFiltrada = ativo ? filtrarArvore(arvore, filtros, hoje) : [];
  const visiveisFiltro = contarItens(arvoreFiltrada);

  // URL atual SEM a mensagem — vai junto de cada ação pra filtro/aba sobreviverem
  const query = new URLSearchParams();
  if (filtros.situacao !== "todos") query.set("situacao", filtros.situacao);
  if (filtros.somenteEssenciais) query.set("essencial", "1");
  if (filtros.prazo !== "todos") query.set("prazo", filtros.prazo);
  if (!ativo && abaValida !== "overview") query.set("aba", abaValida);
  const voltarPara = query.size > 0 ? `/?${query}` : "/";

  return (
    <main>
      <header className="app-header">
        <div className="app-header-info">
          <div className="avatar" aria-hidden="true">
            {iniciais(casorio.nome)}
          </div>
          <div>
            <h1>{casorio.nome}</h1>
            <p className="sub">Contagem regressiva pro grande dia</p>
          </div>
        </div>
        <div className="app-header-acoes">
          <ThemeToggle />
          <EditarCasorio casorio={casorio} voltarPara={voltarPara} />
          <Link href="/montar" className="botao-link">
            🛠 Montar árvore
          </Link>
          <Link href="/ajuda" className="botao-link">
            📖 Como usar
          </Link>
          <form action={sairAction}>
            <button className="leve" type="submit">
              Sair
            </button>
          </form>
        </div>
      </header>

      {sp.ok && <Toast mensagem={sp.ok} tipo="ok" voltarPara={voltarPara} />}
      {sp.erro && <Toast mensagem={sp.erro} tipo="erro" voltarPara={voltarPara} />}

      <Hero
        dias={dias}
        dataCasamento={casorio.dataCasamento}
        progresso={geral}
      />

      <PainelDinheiro painel={financeiro} totalItens={totalItens} />
      <PainelPrazosView prazos={prazos} />

      {arvore.length > 0 && (
        <BarraFiltros filtros={filtros} ativo={ativo} visiveis={visiveisFiltro} total={totalItens} />
      )}

      {/* SEM filtro: abas + visão geral + todos os temas, com troca instantânea
          no cliente (sem refetch). O servidor renderiza tudo uma vez só. */}
      {arvore.length > 0 && !ativo && (
        <PainelAbas
          initialAba={abaValida}
          abas={arvore.map((t) => ({
            id: t.id,
            nome: t.nome,
            atrasados: calcularPainelPrazos(
              t.subtemas.flatMap((s) => s.itens),
              hoje,
            ).atrasados,
          }))}
          cards={arvore.map((t) => {
            const itens = t.subtemas.flatMap((s) => s.itens);
            const prog = progressoDe(itens);
            const fin = calcularPainelFinanceiro(itens, 0);
            const prazosTema = calcularPainelPrazos(itens, hoje);
            return {
              id: t.id,
              nome: t.nome,
              percentual: prog.percentual,
              resolvidos: prog.resolvidos,
              total: prog.total,
              estimado: fin.estimadoTotal > 0 ? brlCompacto(fin.estimadoTotal) : null,
              essenciaisPendentes: prog.essenciaisPendentes,
              atrasados: prazosTema.atrasados,
            };
          })}
          temas={arvore.map((t) => ({
            id: t.id,
            nome: t.nome,
            visiveis: contarItens([t]),
            node: (
              <Tema
                tema={t}
                casorioId={casorio.id}
                voltarPara={`/?aba=${t.id}`}
                hoje={hoje}
                aberto={true}
              />
            ),
          }))}
        />
      )}

      <FormTema casorioId={casorio.id} voltarPara={voltarPara} />

      {arvore.length === 0 && <ArvoreVazia casorioId={casorio.id} voltarPara={voltarPara} />}

      {/* COM filtro: lista achatada renderizada no servidor. */}
      {ativo && (
        <>
          <div className="lista-titulo">
            <h2>Resultados do filtro</h2>
            <span className="contagem">
              {visiveisFiltro} {visiveisFiltro === 1 ? "item" : "itens"}
            </span>
          </div>
          {arvoreFiltrada.length === 0 ? (
            <SemResultado />
          ) : (
            arvoreFiltrada.map((tema) => (
              <Tema
                key={tema.id}
                tema={tema}
                casorioId={casorio.id}
                voltarPara={voltarPara}
                hoje={hoje}
                aberto={true}
              />
            ))
          )}
        </>
      )}
    </main>
  );
}

function Onboarding() {
  return (
    <main className="centro">
      <div className="cartao">
        <div className="avatar lg" aria-hidden="true">
          R&amp;J
        </div>
        <h1>Bem-vindos 🤍</h1>
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

/** Cabeçalho + contagem regressiva + anel de progresso. */
function Hero({
  dias,
  dataCasamento,
  progresso,
}: {
  dias: number | null;
  dataCasamento: string | null;
  progresso: Progresso;
}) {
  return (
    <section className="hero">
      <div className="card card-countdown">
        <span className="kicker">faltam</span>
        {dias !== null && dataCasamento ? (
          <>
            <div className="countdown-num">
              <b>{Math.max(0, dias)}</b>
              <span>dias</span>
            </div>
            <span className="data-longa">📅 {dataPorExtenso(dataCasamento)}</span>
          </>
        ) : (
          <>
            <div className="countdown-num">
              <b>—</b>
            </div>
            <span className="data-longa">Defina a data em ⚙️ Ajustar casório</span>
          </>
        )}
      </div>

      <div className="card card-progresso">
        <div
          className="ring"
          style={{
            background: `conic-gradient(var(--accent-fill) ${progresso.percentual}%, var(--track) 0)`,
          }}
          aria-hidden="true"
        >
          <span className="ring-centro">{progresso.percentual}%</span>
        </div>
        <div>
          <span className="kicker">progresso</span>
          <p className="prog-texto">
            {progresso.resolvidos} <span>/ {progresso.total} resolvidos</span>
          </p>
          {progresso.essenciaisPendentes > 0 && (
            <span className="pendente-essencial">
              ⭐ {progresso.essenciaisPendentes} essenciais pendentes
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/** RF09 — painel de orçamento. Os números vêm do C1 (domínio puro). */
function PainelDinheiro({ painel, totalItens }: { painel: PainelFinanceiro; totalItens: number }) {
  const { orcamento, orcamentoDefinido, estimadoTotal, comprometido, pago, saldo, estourou, semPreco } =
    painel;

  // barra empilhada Pago | Comprometido | Estimado, com marca do teto.
  const base = Math.max(orcamento, estimadoTotal) || 1;
  const pct = (v: number) => `${(v / base) * 100}%`;
  const mostrarBarra = estimadoTotal > 0 || orcamentoDefinido;
  const saldoNeg = orcamentoDefinido && saldo < 0;

  return (
    <section className={`dinheiro card ${estourou ? "estourou" : ""}`}>
      <div className="dinheiro-topo">
        <h2>Orçamento</h2>
        <span className="contagem">
          {totalItens} {totalItens === 1 ? "item no total" : "itens no total"}
        </span>
      </div>

      <div className="numeros">
        <div>
          <span className="kicker">Teto</span>
          {orcamentoDefinido ? <b>{formatarBRL(orcamento)}</b> : <b className="indefinido">—</b>}
        </div>
        <div>
          <span className="kicker">Planejado</span>
          <b>{formatarBRL(estimadoTotal)}</b>
        </div>
        <div>
          <span className="kicker">Comprometido</span>
          <b>{formatarBRL(comprometido)}</b>
        </div>
        <div className="destaque">
          <span className="kicker">Pago</span>
          <b>{formatarBRL(pago)}</b>
        </div>
        <div className={saldoNeg ? "negativo" : "positivo"}>
          <span className="kicker">Saldo</span>
          {orcamentoDefinido ? <b>{formatarBRL(saldo)}</b> : <b className="indefinido">—</b>}
        </div>
      </div>

      {mostrarBarra && (
        <div>
          <div className="barra-emp" aria-hidden="true">
            <span className="seg-pago" style={{ width: pct(pago) }} />
            <span
              className="seg-comp"
              style={{ left: pct(pago), width: pct(comprometido - pago) }}
            />
            <span
              className="seg-est"
              style={{ left: pct(comprometido), width: pct(estimadoTotal - comprometido) }}
            />
          </div>
          {orcamentoDefinido && (
            <div className="marca-teto-linha" aria-hidden="true">
              <span className="marca-teto" style={{ left: pct(orcamento) }}>
                ▲ teto
              </span>
            </div>
          )}
          <div className="legenda">
            <span>
              <i style={{ background: "var(--accent-strong)" }} />
              Pago
            </span>
            <span>
              <i style={{ background: "var(--accent-fill)" }} />
              Comprometido
            </span>
            <span>
              <i style={{ background: "var(--dot-neutral)" }} />
              Estimado
            </span>
          </div>
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
    <details className="editor ajustar">
      <summary>⚙️ Ajustar casório</summary>
      <div className="ajustar-painel">
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
            <SubmitButton mensagemSucesso="Casório atualizado">Salvar</SubmitButton>
          </div>
        </form>
      </div>
    </details>
  );
}

/** RF13 — filtros. Form GET puro: sem JavaScript, e a URL guarda o estado.
    O tema saiu do dropdown — agora é escolhido pelas abas. */
function BarraFiltros({
  filtros,
  ativo,
  visiveis,
  total,
}: {
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
        {ativo ? (
          <>
            exibindo <b>{visiveis}</b> de {total} itens
          </>
        ) : (
          <>filtre por situação, prazo ou essenciais</>
        )}
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
      <div className="vazio-icone" aria-hidden="true">
        🌱
      </div>
      <h2>Comece a plantar seu casório</h2>
      <p className="sub">
        Sem temas ainda. Crie o primeiro acima ☝️ ou carregue o modelo pronto e apague o que não
        servir.
      </p>
      <div className="vazio-acoes">
        <form action={carregarModeloAction}>
          <Voltar para={voltarPara} />
          <input type="hidden" name="casorioId" value={casorioId} />
          <button type="submit">✨ Carregar modelo ({TAMANHO_TEMPLATE.itens} itens)</button>
        </form>
      </div>
    </div>
  );
}

function FormTema({ casorioId, voltarPara }: { casorioId: string; voltarPara: string }) {
  return (
    <div className="form-novo-tema">
      <Compositor
        action={criarTemaAction}
        ocultos={[
          { name: "voltarPara", value: voltarPara },
          { name: "casorioId", value: casorioId },
        ]}
        campoNome="nome"
        placeholder="Novo tema (ex.: Comida)"
        rotuloAbrir="+ Novo tema"
        comCustoEssencial={false}
      />
    </div>
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
  const soltos = tema.subtemas.find((s) => ehSoltos(s.nome));
  const grupos = tema.subtemas.filter((s) => !ehSoltos(s.nome));
  const itens = tema.subtemas.flatMap((s) => s.itens);
  const progresso = progressoDe(itens);
  const dinheiro = calcularPainelFinanceiro(itens, 0);
  const prazos = calcularPainelPrazos(itens, hoje);
  const filhos = itens.length === 0 ? "" : ` com ${contar(itens.length, "item", "itens")}`;

  return (
    <details className="tema" open={aberto}>
      <summary className="tema-resumo">
        <span className="tema-nome">{tema.nome}</span>
        <AcoesTema
          temaId={tema.id}
          temaNome={tema.nome}
          voltarPara={voltarPara}
          avisoExcluir={`Apagar o tema "${tema.nome}"${filhos}?\n\nIsso não tem volta.`}
        />
        <span className="tema-meta">
          <span className="tema-mini-barra" aria-hidden="true">
            <span style={{ width: `${progresso.percentual}%` }} />
          </span>
          {progresso.resolvidos}/{progresso.total}
          {dinheiro.estimadoTotal > 0 && <> · {brlCompacto(dinheiro.estimadoTotal)}</>}
          {progresso.essenciaisPendentes > 0 && (
            <span className="pendente-essencial"> · ⭐{progresso.essenciaisPendentes}</span>
          )}
          {prazos.atrasados > 0 && (
            <span className="oc-marcas">
              <span className="atr">· ⏰{prazos.atrasados}</span>
            </span>
          )}
        </span>
      </summary>

      <div className="tema-corpo">
        {/* itens soltos: direto no tema, sem cabeçalho de subtema */}
        {soltos?.itens.map((item) => (
          <ItemLinha
            key={item.id}
            item={item}
            voltarPara={voltarPara}
            hoje={hoje}
            temaNome={tema.nome}
            subtemaNome={soltos.nome}
          />
        ))}

        <Compositor
          action={criarItemNoTemaAction}
          ocultos={[
            { name: "voltarPara", value: voltarPara },
            { name: "casorioId", value: casorioId },
            { name: "temaId", value: tema.id },
          ]}
          campoNome="titulo"
          placeholder="Adicionar item (ex.: Com catupiry)"
          rotuloAbrir="+ Item"
        />

        {/* subtemas nomeados: agrupamento opcional */}
        {grupos.map((sub) => (
          <Subtema
            key={sub.id}
            subtema={sub}
            casorioId={casorioId}
            voltarPara={voltarPara}
            hoje={hoje}
            temaNome={tema.nome}
          />
        ))}

        <Compositor
          action={criarSubtemaAction}
          ocultos={[
            { name: "voltarPara", value: voltarPara },
            { name: "casorioId", value: casorioId },
            { name: "temaId", value: tema.id },
          ]}
          campoNome="nome"
          placeholder="Novo subtema (ex.: Bebidas)"
          rotuloAbrir="+ Subtema (opcional)"
          comCustoEssencial={false}
        />
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
            <SubmitButton mensagemSucesso="Subtema renomeado">Renomear</SubmitButton>
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

      <Compositor
        action={criarItemAction}
        ocultos={[
          { name: "voltarPara", value: voltarPara },
          { name: "casorioId", value: casorioId },
          { name: "subtemaId", value: subtema.id },
        ]}
        campoNome="titulo"
        placeholder="Novo item (ex.: Refrigerante)"
        rotuloAbrir="+ Item"
      />
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
  const descartado = item.status === "descartado";
  const urgente = prazo === "atrasado" || prazo === "a_vencer";
  const dotClass = descartado
    ? ""
    : resolvido
      ? "resolvido"
      : prazo === "atrasado"
        ? "atrasado"
        : prazo === "a_vencer"
          ? "a_vencer"
          : "";
  const temLinha2 = (item.dataAlvo && !urgente) || item.fornecedorNome;

  return (
    <div className={`item ${descartado ? "descartado" : ""}`} id={`item-${item.id}`}>
      <span className={`item-dot ${dotClass}`} aria-hidden="true" />
      <div className="item-corpo">
        <div className="item-linha1">
          {item.essencial && (
            <span className="estrela" title="essencial">
              ★
            </span>
          )}
          <span className="titulo">{item.titulo}</span>
          <span className={`badge ${resolvido ? "resolvido" : ""}`}>
            {LABEL_STATUS[item.status]}
          </span>
          {urgente && item.dataAlvo && (
            <EtiquetaPrazo dataAlvo={item.dataAlvo} prazo={prazo} hoje={hoje} />
          )}
        </div>

        {temLinha2 && (
          <div className="item-linha2">
            {item.dataAlvo && !urgente && <span>📅 {formatarData(item.dataAlvo)}</span>}
            {item.fornecedorNome && <span>🏪 {item.fornecedorNome}</span>}
          </div>
        )}

        {item.observacao && <p className="observacao">{item.observacao}</p>}
      </div>

      <AcoesItem
        itemId={item.id}
        titulo={item.titulo}
        temCusto={item.temCusto}
        custoEstimado={item.custoEstimado}
        custoReal={item.custoReal}
        voltarPara={voltarProItem}
        editor={
          <>
            <FormStatus item={item} voltarPara={voltarProItem} />
            <EditorItem
              item={item}
              voltarPara={voltarProItem}
              temaNome={temaNome}
              subtemaNome={subtemaNome}
            />
          </>
        }
      />
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
        <SubmitButton mensagemSucesso="Item salvo">Salvar item</SubmitButton>
      </div>
    </form>
  );
}

function FormStatus({ item, voltarPara }: { item: Item; voltarPara: string }) {
  return (
    <>
      {/* form-status: o CSS mostra o valor só quando o status escolhido EXIGE
          custo real (contratado/pago) — reage ao <select>, sem JS. */}
      <form action={mudarStatusAction} className="linha mini form-status">
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
          <span className="so-quando-preciso">
            <CampoDinheiro
              name="custoRealCentavos"
              placeholder="valor real R$"
              defaultCentavos={item.custoReal}
              aria-label="Custo real"
            />
          </span>
        )}
        <SubmitButton className="leve" mensagemSucesso="Status atualizado">
          Salvar
        </SubmitButton>
      </form>
    </>
  );
}
