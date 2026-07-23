import Link from "next/link";

export const metadata = { title: "Como usar · Nosso Casório" };

export default function AjudaPage() {
  return (
    <main className="ajuda">
      <p style={{ margin: "0 0 1.25rem" }}>
        <Link href="/" className="botao-link">
          ← Voltar ao painel
        </Link>
      </p>
      <h1 style={{ marginBottom: "0.25rem" }}>Como usar</h1>
      <p className="sub" style={{ marginBottom: "1.5rem" }}>
        Tudo o que o casal precisa saber pra organizar o casório sem se perder.
      </p>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>A ideia em 10 segundos</h2>
        <p>
          O casamento vira uma lista de <b>Temas</b>, e cada tema tem <b>itens</b>. O item é a
          coisa concreta — carrega <b>preço</b>, <b>status</b> e <b>prazo</b>.
        </p>
        <pre className="arvore-exemplo">
{`Comida                     ← Tema
  • Bolo ............. R$ 800   ← Item (preço, status, prazo)
  • Refrigerante ..... R$ 120
  • Provar o cardápio          ← item sem custo (só checklist)`}
        </pre>
        <p className="sub">
          Precisa separar dentro de um tema? Dá pra criar <b>Subtemas</b> (agrupamento{" "}
          <b>opcional</b>) — ex.: em <i>Comida</i>, um subtema <i>Bebidas</i>. Mas na maioria das
          vezes basta jogar os itens direto no tema.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>🧭 Como andar pelo painel</h2>
        <p>Nada de rolagem infinita. Você navega por abas:</p>
        <ul>
          <li>
            <b>Visão geral</b> — uma grade com um card por tema (progresso, quanto custa,
            essenciais e atrasados). Clique num card pra abrir o tema.
          </li>
          <li>
            <b>Abas de tema</b> — a tira no topo. Cada aba abre um tema; a que tem itens atrasados
            mostra um número vermelho.
          </li>
        </ul>
        <p className="sub mini">
          A troca de aba é <b>instantânea</b> (não recarrega a página). E ligou um filtro? As abas
          somem e a lista mostra todos os temas que batem.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>➕ Adicionando coisas</h2>
        <ul>
          <li>
            <b>+ Item</b> (dentro do tema) — o jeito principal. Digite o nome, marque{" "}
            <b>tem custo</b> pra abrir o campo de valor, e <b>⭐ essencial</b> se for. Salvar.
          </li>
          <li>
            <b>+ Novo tema</b> — cria uma categoria nova (só o nome).
          </li>
          <li>
            <b>Subtema</b> — agrupamento opcional dentro de um tema (só o nome; o preço fica nos
            itens dele).
          </li>
        </ul>
        <p className="nota">
          🛠️ Tem uma tela <b>Montar a árvore</b> (botão no topo) dedicada a construir/editar a
          estrutura com calma, sem os painéis. O painel normal também deixa adicionar tudo.
        </p>
        <p className="sub mini">
          Cada botão <b>+</b> abre um formulário completo na hora; some depois de salvar. Pra
          adicionar outro, clique no <b>+</b> de novo.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>✨ Não comece do zero</h2>
        <p>
          Ao criar o casório vem marcada a opção <b>&quot;Começar com o modelo pronto&quot;</b>: a
          árvore já nasce com <b>18 temas e ~139 itens</b> típicos de um casamento (Local,
          Cerimônia, Comida, Bebidas, Noiva, Noivo, Alianças, Fotos, Música, Decoração, Convites,
          Padrinhos, Transporte, Lua de mel, pós-casamento…).
        </p>
        <p>
          A ideia é <b>apagar o que não serve</b>, não digitar tudo. Casamento na praia? Apague o
          tema de igreja num clique.
        </p>
        <p className="nota">
          🗑️ Cada tema e item tem lixeira do lado. Apagar um <b>tema leva junto</b> tudo dentro —
          o app avisa quantos antes, e <b>não tem desfazer</b>. Mudou de ideia? Com a árvore vazia
          reaparece o botão <b>Carregar modelo pronto</b>.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>💰 O que é &quot;tem custo&quot;</h2>
        <p>
          É a pergunta: <b>esse item vai sair dinheiro do bolso?</b> A resposta muda o fluxo do
          item.
        </p>
        <div className="duas-colunas">
          <div className="coluna-card">
            <h3>✅ Marcou &quot;tem custo&quot;</h3>
            <p className="sub">Coisa que você contrata ou compra.</p>
            <p>
              <b>Exemplos:</b> Buffet · Vestido · Fotógrafo · Salão · Bolo · Alianças
            </p>
            <div className="fluxo">A decidir → Decidido → Contratado → Pago</div>
            <p className="sub">
              Você preenche <b>custo estimado</b> (o chute) e, ao fechar, o <b>custo real</b>.
            </p>
          </div>
          <div className="coluna-card">
            <h3>⬜ NÃO marcou</h3>
            <p className="sub">Tarefa sem dinheiro.</p>
            <p>
              <b>Exemplos:</b> Escolher a música · Lista de convidados · Definir padrinhos
            </p>
            <div className="fluxo">A fazer → Feito</div>
            <p className="sub">Sem campo de dinheiro. É só checklist.</p>
          </div>
        </div>
        <p className="nota">
          💡 <b>Pode mudar depois.</b> Um item &quot;sem custo&quot; que vira &quot;com custo&quot;
          ajusta o status sozinho pro fluxo novo (os valores ficam guardados).
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>Os status, um por um</h2>
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Quando usar</th>
                <th>Exemplo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>A decidir</b></td>
                <td>Ainda pesquisando</td>
                <td>Vendo 3 buffets</td>
              </tr>
              <tr>
                <td><b>Decidido</b></td>
                <td>Escolheu, mas não fechou</td>
                <td>&quot;Vai ser o Buffet Silva&quot;</td>
              </tr>
              <tr>
                <td><b>Contratado</b></td>
                <td>Fechou/assinou. <b>Exige o valor real</b></td>
                <td>Contrato assinado, R$ 8.000</td>
              </tr>
              <tr>
                <td><b>Pago</b></td>
                <td>Quitado. <b>Exige o valor real</b></td>
                <td>Pagou os R$ 8.000</td>
              </tr>
              <tr>
                <td><b>A fazer / Feito</b></td>
                <td>Itens sem custo (checklist)</td>
                <td>Escolher música → escolhida</td>
              </tr>
              <tr>
                <td><b>Descartado</b></td>
                <td>Não vai ter. Sai de todas as contas</td>
                <td>Drone cortado do orçamento</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="sub">
          O campo de <b>valor real</b> na troca rápida de status só aparece quando você escolhe{" "}
          <b>Contratado</b> ou <b>Pago</b> — que são os que exigem.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>⭐ O que é &quot;essencial&quot;</h2>
        <p>
          Marque essencial o item que, <b>se não acontecer, o casamento não acontece</b>. É o
          filtro de pânico: quando faltar tempo ou dinheiro, esses não podem cair.
        </p>
        <div className="duas-colunas">
          <div className="coluna-card">
            <h3>⭐ Essencial</h3>
            <p>Local · Celebrante · Alianças · Vestido · Documentação do civil · Comida</p>
          </div>
          <div className="coluna-card">
            <h3>Não essencial</h3>
            <p>Lembrancinha · Carro antigo · Cabine de fotos · Drone</p>
          </div>
        </div>
        <p className="nota">
          🎯 A meta é chegar no dia com <b>100% dos essenciais resolvidos</b>. O anel de progresso
          avisa quantos essenciais ainda faltam.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>⏰ Prazos</h2>
        <p>
          Todo item aceita uma <b>data-alvo</b>. A partir dela o app classifica sozinho:
        </p>
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Etiqueta</th>
                <th>Quando aparece</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>⏰ atrasado X dias</b></td>
                <td>A data passou e o item não está resolvido</td>
              </tr>
              <tr>
                <td><b>⌛ vence hoje / amanhã / em X dias</b></td>
                <td>Vence nos próximos 7 dias</td>
              </tr>
              <tr>
                <td><b>📅 data</b></td>
                <td>Tem prazo, mas ainda dá tempo</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          No painel aparecem os chips <b>⏰ N atrasados</b> e <b>⌛ N vencem em 7 dias</b> — clique
          neles pra filtrar na hora.
        </p>
        <p className="nota">
          ✅ <b>Resolveu, parou de cobrar.</b> Item <i>feito</i>/<i>pago</i> nunca aparece
          atrasado, mesmo com a data vencida. O dia vira no fuso de <b>São Paulo</b>.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>💰 O painel de orçamento</h2>
        <p>Cinco números que se atualizam sozinhos, mais uma barra visual:</p>
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>O que é</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Teto</b></td>
                <td>O orçamento que vocês definiram</td>
              </tr>
              <tr>
                <td><b>Planejado</b></td>
                <td>Soma de <i>tudo</i> que tem custo (real quando existe, senão estimado)</td>
              </tr>
              <tr>
                <td><b>Comprometido</b></td>
                <td>Só o que virou compromisso: <i>contratado</i> + <i>pago</i></td>
              </tr>
              <tr>
                <td><b>Pago</b></td>
                <td>O que já saiu do bolso</td>
              </tr>
              <tr>
                <td><b>Saldo</b></td>
                <td>Teto − Planejado. Vermelho se ficar negativo</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Embaixo, a <b>barra empilhada</b> (Pago · Comprometido · Estimado) com um marcador{" "}
          <b>▲ teto</b> na posição do orçamento — dá pra ver de relance se o plano cabe.
        </p>
        <p className="nota">
          🚨 O alerta de estouro usa o <b>Planejado</b> (não o Comprometido) — de propósito: avisa
          <b> enquanto ainda dá pra cortar</b>. Item <b>descartado</b> sai das contas; item com
          custo sem valor o painel avisa (não soma zero calado).
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>💸 Estimado × Real no item</h2>
        <p>
          Quando o valor <b>real</b> ficar diferente do <b>estimado</b>, o item mostra os dois
          rotulados e a diferença:
        </p>
        <ul>
          <li>
            <b>estimado</b> — o que você planejou (ex.: R$ 1.000).
          </li>
          <li>
            <b>real</b> — o que fechou de fato (ex.: R$ 500).
          </li>
          <li>
            <b>economia</b> ▼ (ficou mais barato) ou <b>mais caro</b> ▲ (passou) — a diferença.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>🔎 Filtros</h2>
        <p>Acima da árvore:</p>
        <ul>
          <li>
            <b>Mostrar</b> — tudo · só o que falta · só o que já resolvi
          </li>
          <li>
            <b>Prazo</b> — ⏰ atrasados · ⌛ vencendo
          </li>
          <li>
            <b>⭐ só essenciais</b>
          </li>
        </ul>
        <p className="sub mini">
          Com filtro ligado, as abas somem e a lista achata todos os temas que batem. O botão{" "}
          <b>Limpar</b> volta tudo. (O tema você escolhe pelas abas, não por filtro.)
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>✏️ Editar as coisas</h2>
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Pra mudar</th>
                <th>Onde</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Nome, data ou orçamento do casório</td>
                <td><b>⚙️ Ajustar casório</b> no topo (abre um painel)</td>
              </tr>
              <tr>
                <td>Nome de um tema</td>
                <td>O <b>✏️</b> ao lado do nome do tema</td>
              </tr>
              <tr>
                <td>Status de um item (rápido)</td>
                <td>Abre o <b>✏️</b> do item → escolhe o status → <b>Salvar</b></td>
              </tr>
              <tr>
                <td>Qualquer campo de um item</td>
                <td>O mesmo <b>✏️</b> → form completo → <b>Salvar item</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="nota">
          💾 <b>Salvar é na hora</b> — a tela atualiza no lugar (sem trocar de página), com um
          toast verde de confirmação. E o editor do item <b>fecha sozinho</b> depois de salvar.
        </p>
        <p className="sub mini">
          O form do item mostra só o que faz sentido: valor só quando <i>tem custo</i>; fornecedor
          (nome/telefone/link) só onde dá pra cobrar alguém depois. Faltou um campo? <b>+ mais
          campos</b> no fim.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>🌗 Tema claro/escuro</h2>
        <p>
          O botão <b>🌙/☀️</b> no topo alterna entre o tema escuro (padrão) e o claro. A escolha
          fica salva no seu navegador.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>Dúvidas comuns</h2>
        <div className="faq">
          <h3>Apareceu &quot;exige custo real preenchido&quot;</h3>
          <p>
            Você marcou <b>Contratado</b> ou <b>Pago</b> sem o valor. Preencha o campo de valor
            (ele aparece ao escolher esses status) antes de salvar — sem o real, a conta do
            orçamento mentiria.
          </p>
          <h3>Como digito o dinheiro?</h3>
          <p>
            Só os números: <code>30000</code> vira <b>30.000,00</b>. Centavos com vírgula:{" "}
            <code>1500,50</code>.
          </p>
          <h3>Preciso criar subtema pra pôr preço?</h3>
          <p>
            Não. Use <b>+ Item</b> direto no tema. Subtema é só pra agrupar quando você quiser.
          </p>
          <h3>Cliquei em salvar e voltou à mesma tela</h3>
          <p>
            É o esperado: salvar não troca de página — atualiza no lugar e mostra o toast verde.
            Se aparecer aviso vermelho, é uma regra (ex.: falta o valor real).
          </p>
        </div>
      </section>

      <p className="voltar">
        <Link href="/" className="botao-link">
          ← Voltar pro casório
        </Link>
      </p>
    </main>
  );
}
