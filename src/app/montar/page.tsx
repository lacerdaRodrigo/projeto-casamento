import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/adapters/supabase/client";
import { SupabaseAuthService } from "@/adapters/supabase/auth-service";
import { SupabaseCasorioRepository } from "@/adapters/supabase/casorio-repository";
import { isResolvido } from "@/domain/status";
import { classificarPrazo } from "@/domain/prazo";
import { ehSoltos } from "@/domain/subtema-soltos";
import { MOSTRAR_ADD_SUBTEMA } from "../ui-flags";
import type { Item, SubtemaComItens, TemaComFilhos } from "@/domain/entities";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Compositor } from "@/components/compositor";
import { SubmitButton } from "@/components/submit-button";
import { ValorItem } from "@/components/valor-item";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toast } from "@/components/toast";
import { TAMANHO_TEMPLATE } from "@/application/semear-template";
import {
  carregarModeloAction,
  criarItemAction,
  criarItemNoTemaAction,
  criarSubtemaAction,
  criarTemaAction,
  excluirItemAction,
  excluirSubtemaAction,
  excluirTemaAction,
  renomearSubtemaAction,
  renomearTemaAction,
} from "../actions";

export const metadata = { title: "Montar a árvore · Nosso Casório" };

/** "hoje" em America/Sao_Paulo (yyyy-mm-dd) — injetado no núcleo (D08). */
function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function contar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

const VOLTAR = "/montar";

function Voltar() {
  return <input type="hidden" name="voltarPara" value={VOLTAR} />;
}

export default async function MontarPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const sb = await createSupabaseServerClient();
  const user = await new SupabaseAuthService(sb).usuarioDaSessao();
  if (!user) redirect("/login");

  const repo = new SupabaseCasorioRepository(sb);
  const dados = await repo.meuCasorioComArvore();
  if (!dados) redirect("/");
  const { casorio, arvore } = dados;

  const hoje = hojeSaoPaulo();

  return (
    <main className="montar">
      <header className="app-header">
        <div>
          <h1>🛠 Montar a árvore</h1>
          <p className="sub">
            Três níveis: <b>Tema</b> › <b>Subtema</b> › <b>Item</b>. Cada formulário de adição já
            vem completo — nome, tem custo e ⭐ essencial, com <b>Salvar</b> sempre à vista.
          </p>
        </div>
        <div className="app-header-acoes">
          <ThemeToggle />
          <Link href="/" className="botao-link">
            ← Painel
          </Link>
        </div>
      </header>

      {sp.ok && <Toast mensagem={sp.ok} tipo="ok" voltarPara={VOLTAR} />}
      {sp.erro && <Toast mensagem={sp.erro} tipo="erro" voltarPara={VOLTAR} />}

      {arvore.length === 0 && (
        <div className="vazio">
          <div className="vazio-icone" aria-hidden="true">
            🌱
          </div>
          <h2>Comece a plantar seu casório</h2>
          <p className="sub">
            Sem temas ainda. Crie o primeiro abaixo ou carregue o modelo pronto e apague o que não
            servir.
          </p>
          <div className="vazio-acoes">
            <form action={carregarModeloAction}>
              <Voltar />
              <input type="hidden" name="casorioId" value={casorio.id} />
              <button type="submit">✨ Carregar modelo ({TAMANHO_TEMPLATE.itens} itens)</button>
            </form>
          </div>
        </div>
      )}

      <div className="montar-lista">
        {arvore.map((tema) => (
          <TemaEditor key={tema.id} tema={tema} casorioId={casorio.id} hoje={hoje} />
        ))}
      </div>

      <Compositor
        action={criarTemaAction}
        ocultos={[
          { name: "voltarPara", value: VOLTAR },
          { name: "casorioId", value: casorio.id },
        ]}
        campoNome="nome"
        placeholder="Novo tema (ex.: Comida)"
        rotuloAbrir="+ Novo tema"
        comCustoEssencial={false}
      />
    </main>
  );
}

function TemaEditor({
  tema,
  casorioId,
  hoje,
}: {
  tema: TemaComFilhos;
  casorioId: string;
  hoje: string;
}) {
  const soltos = tema.subtemas.find((s) => ehSoltos(s.nome));
  const grupos = tema.subtemas.filter((s) => !ehSoltos(s.nome));
  const itens = tema.subtemas.flatMap((s) => s.itens);
  const resumo = itens.length === 0 && grupos.length === 0 ? "vazio" : contar(itens.length, "item", "itens");

  return (
    <details className="tema" open>
      <summary className="tema-resumo">
        <span className="tema-nome">{tema.nome}</span>
        <span className="tema-meta">{resumo}</span>
      </summary>

      <div className="tema-corpo">
        <div className="linha-acoes">
          <details className="renomear">
            <summary>✏️ Renomear tema</summary>
            <form action={renomearTemaAction} className="linha mini">
              <Voltar />
              <input type="hidden" name="temaId" value={tema.id} />
              <input name="nome" defaultValue={tema.nome} required aria-label="Novo nome do tema" />
              <SubmitButton>Salvar</SubmitButton>
            </form>
          </details>
          <form action={excluirTemaAction}>
            <Voltar />
            <input type="hidden" name="temaId" value={tema.id} />
            <BotaoExcluir
              titulo={`Excluir tema ${tema.nome}`}
              aviso={`Apagar o tema "${tema.nome}"${
                tema.subtemas.length ? ` com ${resumo}` : ""
              }?\n\nIsso não tem volta.`}
            />
          </form>
        </div>

        {/* itens soltos: direto no tema, sem cabeçalho de subtema */}
        {soltos && soltos.itens.length > 0 && (
          <div className="montar-itens">
            {soltos.itens.map((item) => (
              <ItemEditorLinha key={item.id} item={item} hoje={hoje} />
            ))}
          </div>
        )}

        <Compositor
          action={criarItemNoTemaAction}
          ocultos={[
            { name: "voltarPara", value: VOLTAR },
            { name: "temaId", value: tema.id },
            { name: "casorioId", value: casorioId },
          ]}
          campoNome="titulo"
          placeholder="Adicionar item (ex.: Com catupiry)"
          rotuloAbrir="+ Item"
        />

        {/* subtemas nomeados: agrupamento opcional */}
        {grupos.map((sub) => (
          <SubtemaEditor key={sub.id} subtema={sub} casorioId={casorioId} hoje={hoje} />
        ))}

        {MOSTRAR_ADD_SUBTEMA && (
          <Compositor
            action={criarSubtemaAction}
            ocultos={[
              { name: "voltarPara", value: VOLTAR },
              { name: "temaId", value: tema.id },
              { name: "casorioId", value: casorioId },
            ]}
            campoNome="nome"
            placeholder="Novo subtema (ex.: Bebidas)"
            rotuloAbrir="+ Subtema (opcional)"
            comCustoEssencial={false}
          />
        )}
      </div>
    </details>
  );
}

function SubtemaEditor({
  subtema,
  casorioId,
  hoje,
}: {
  subtema: SubtemaComItens;
  casorioId: string;
  hoje: string;
}) {
  return (
    <div className="subtema">
      <div className="cabecalho">
        <details className="renomear">
          <summary>
            <h4>{subtema.nome}</h4>
          </summary>
          <form action={renomearSubtemaAction} className="linha mini">
            <Voltar />
            <input type="hidden" name="subtemaId" value={subtema.id} />
            <input
              name="nome"
              defaultValue={subtema.nome}
              required
              aria-label="Novo nome do subtema"
            />
            <SubmitButton>Salvar</SubmitButton>
          </form>
        </details>
        <form action={excluirSubtemaAction}>
          <Voltar />
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

      <div className="montar-itens">
        {subtema.itens.map((item) => (
          <ItemEditorLinha key={item.id} item={item} hoje={hoje} />
        ))}
      </div>

      <Compositor
        action={criarItemAction}
        ocultos={[
          { name: "voltarPara", value: VOLTAR },
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

function ItemEditorLinha({ item, hoje }: { item: Item; hoje: string }) {
  const descartado = item.status === "descartado";
  const resolvido = isResolvido(item.status, item.temCusto);
  const prazo = classificarPrazo(item, hoje);
  const dotClass = descartado
    ? ""
    : resolvido
      ? "resolvido"
      : prazo === "atrasado"
        ? "atrasado"
        : prazo === "a_vencer"
          ? "a_vencer"
          : "";

  return (
    <div className={`montar-item ${descartado ? "descartado" : ""}`}>
      <span className={`item-dot ${dotClass}`} aria-hidden="true" />
      <span className="montar-item-titulo">
        {item.essencial && <span className="estrela">★ </span>}
        {item.titulo}
      </span>
      <ValorItem
        temCusto={item.temCusto}
        custoEstimado={item.custoEstimado}
        custoReal={item.custoReal}
      />
      <form action={excluirItemAction}>
        <input type="hidden" name="voltarPara" value={VOLTAR} />
        <input type="hidden" name="itemId" value={item.id} />
        <BotaoExcluir
          titulo={`Excluir item ${item.titulo}`}
          aviso={`Apagar o item "${item.titulo}"?\n\nIsso não tem volta.`}
        />
      </form>
    </div>
  );
}

