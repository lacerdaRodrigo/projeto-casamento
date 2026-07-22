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
          Tudo do casamento vira uma <b>árvore de 3 níveis</b>. Você quebra o casamento em
          pedaços cada vez menores até chegar em coisas que dá pra resolver uma a uma.
        </p>
        <pre className="arvore-exemplo">
{`Comida                    ← Tema      (área grande)
  └─ Bebidas              ← Subtema   (divisão dela)
       ├─ Refrigerante    ← Item      (o que você resolve)
       ├─ Cerveja
       └─ Espumante do brinde`}
        </pre>
        <p className="sub">
          Só os <b>Itens</b> têm status, dinheiro e prazo. Tema e Subtema servem pra organizar.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>✨ Não comece do zero</h2>
        <p>
          Ao criar o casório vem marcada a opção <b>&quot;Começar com o modelo pronto&quot;</b>:
          a árvore já nasce com <b>18 temas e 139 itens</b> típicos de um casamento — Local,
          Cerimônia, Comida, Bebidas, Noiva, Noivo, Alianças, Fotos, Música, Decoração,
          Convites, Padrinhos, Transporte, Lua de mel e até o pós-casamento.
        </p>
        <p>
          A ideia é <b>apagar o que não serve</b>, não digitar tudo. Casamento na praia? Apague
          o tema de igreja. Sem lua de mel agora? Apague o tema inteiro num clique.
        </p>
        <p className="nota">
          🗑️ Cada tema, subtema e item tem um botão de lixeira do lado. Apagar um{" "}
          <b>tema leva junto</b> os subtemas e itens dele — o app avisa quantos antes, e{" "}
          <b>não tem desfazer</b>.
        </p>
        <p className="sub mini">
          Se preferir montar do seu jeito, é só desmarcar a opção no início. Mudou de ideia
          depois? O botão <b>Carregar modelo pronto</b> aparece sempre que a árvore está vazia.
        </p>
      </section>

      <section className="destaque">
        <h2>⏰ Prazos</h2>
        <p>
          Todo item aceita uma <b>data-alvo</b>: até quando aquilo precisa estar resolvido. A
          partir dela o app classifica sozinho:
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
                <td>
                  <b>⏰ atrasado X dias</b>
                </td>
                <td>A data já passou e o item não está resolvido</td>
              </tr>
              <tr>
                <td>
                  <b>⌛ vence hoje / amanhã / em X dias</b>
                </td>
                <td>Vence dentro dos próximos 7 dias</td>
              </tr>
              <tr>
                <td>
                  <b>📅 data</b>
                </td>
                <td>Tem prazo, mas ainda dá tempo</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          No topo da tela aparecem os atalhos <b>⏰ N itens atrasados</b> e{" "}
          <b>⌛ N vencem em até 7 dias</b> — clicando neles a lista já filtra. O tema também
          avisa quantos atrasados tem dentro dele.
        </p>
        <p className="nota">
          ✅ <b>Resolveu, parou de cobrar.</b> Item <i>feito</i> ou <i>pago</i> nunca aparece como
          atrasado, mesmo que a data tenha passado. Item <i>descartado</i> também sai de tudo.
        </p>
        <p className="sub mini">
          O dia vira no fuso de <b>São Paulo</b>, e a comparação é por data (não por horário) —
          um item que vence hoje não conta como atrasado.
        </p>
      </section>

      <section>
        <h2>🔎 Achando as coisas</h2>
        <p>
          São 139 itens. Pra isso não virar uma rolagem infinita, os <b>temas vêm fechados</b> —
          cada linha mostra um resumo: quantos subtemas, quantos já resolvidos e quanto custa.
          Clique no tema pra abrir.
        </p>
        <p>
          Acima da árvore tem a <b>barra de filtros</b>:
        </p>
        <ul>
          <li>
            <b>Mostrar</b> — tudo · só o que falta · só o que já resolvi
          </li>
          <li>
            <b>Tema</b> — foca num só
          </li>
          <li>
            <b>Prazo</b> — ⏰ só atrasados · ⌛ vencendo em 7 dias
          </li>
          <li>
            <b>⭐ só essenciais</b> — o que não pode faltar de jeito nenhum
          </li>
        </ul>
        <p className="sub mini">
          Com filtro ligado os temas abrem sozinhos, e o contador mostra{" "}
          <i>&quot;exibindo X de Y itens&quot;</i>. O botão <b>Limpar</b> volta tudo.
        </p>
      </section>

      <section>
        <h2>Passo a passo</h2>
        <ol className="passos">
          <li>
            <b>Crie o casório</b> — nome, data e orçamento total. Você vira o dono. Deixe
            marcado o modelo pronto pra já começar com a árvore montada.
          </li>
          <li>
            <b>Crie os Temas</b> — as áreas grandes. Ex.: <i>Local</i>, <i>Comida</i>,{" "}
            <i>Noiva</i>, <i>Noivo</i>, <i>Cerimônia</i>, <i>Fotos</i>, <i>Música</i>.
          </li>
          <li>
            <b>Dentro de cada Tema, crie Subtemas</b> — ex.: em <i>Comida</i> →{" "}
            <i>Bebidas</i>, <i>Prato principal</i>, <i>Bolo e doces</i>.
          </li>
          <li>
            <b>Dentro de cada Subtema, crie os Itens</b> — a coisa concreta a decidir.
          </li>
          <li>
            <b>Vá mudando o status</b> conforme resolve. É isso que faz o progresso andar.
          </li>
        </ol>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>💰 O que é &quot;tem custo&quot;</h2>
        <p>
          É a pergunta: <b>esse item vai sair dinheiro do bolso?</b> A resposta muda todo o
          fluxo do item.
        </p>

        <div className="duas-colunas">
          <div className="coluna-card">
            <h3>✅ Marcou &quot;tem custo&quot;</h3>
            <p className="sub">Coisa que você contrata ou compra.</p>
            <p>
              <b>Exemplos:</b> Buffet · Vestido · Fotógrafo · Aluguel do salão · Bolo ·
              Alianças
            </p>
            <p>
              <b>Fluxo:</b>
            </p>
            <div className="fluxo">
              A decidir → Decidido → Contratado → Pago
            </div>
            <p className="sub">
              Você preenche <b>custo estimado</b> (o que acha que vai custar) e, quando fechar,
              o <b>custo real</b> (o que realmente ficou).
            </p>
          </div>

          <div className="coluna-card">
            <h3>⬜ NÃO marcou</h3>
            <p className="sub">Tarefa sem dinheiro envolvido.</p>
            <p>
              <b>Exemplos:</b> Escolher a música da entrada · Montar a lista de convidados ·
              Definir os padrinhos · Marcar a prova do vestido
            </p>
            <p>
              <b>Fluxo:</b>
            </p>
            <div className="fluxo">A fazer → Feito</div>
            <p className="sub">
              Sem campo de dinheiro. É só checklist: falta fazer, ou já fez.
            </p>
          </div>
        </div>

        <p className="nota">
          💡 <b>Pode mudar depois.</b> Se um item &quot;sem custo&quot; virar &quot;com
          custo&quot;, o status se ajusta sozinho pro fluxo novo.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>⭐ O que é &quot;essencial&quot;</h2>
        <p>
          Marque essencial o item que, <b>se não acontecer, o casamento não acontece</b> (ou
          fica muito prejudicado). É o seu filtro de pânico: quando faltar tempo ou dinheiro,
          são esses que não podem cair.
        </p>

        <div className="duas-colunas">
          <div className="coluna-card">
            <h3>⭐ Essencial</h3>
            <p>Local · Celebrante · Alianças · Vestido · Documentação do civil · Comida</p>
          </div>
          <div className="coluna-card">
            <h3>Não essencial</h3>
            <p>Lembrancinha · Carro antigo · Cabine de fotos · Chuva de pétalas · Drone</p>
          </div>
        </div>

        <p className="nota">
          🎯 A meta do app é chegar no dia com <b>100% dos essenciais resolvidos</b>. O resto
          é bônus.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>💰 O painel de orçamento</h2>
        <p>No topo da tela ficam cinco números. Eles se atualizam sozinhos a cada mudança:</p>
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
                <td>
                  <b>Orçamento</b>
                </td>
                <td>O teto que vocês definiram no começo</td>
              </tr>
              <tr>
                <td>
                  <b>Planejado</b>
                </td>
                <td>
                  Soma de <i>tudo</i> que tem custo — usando o valor real quando existe, senão o
                  estimado. É o plano inteiro
                </td>
              </tr>
              <tr>
                <td>
                  <b>Comprometido</b>
                </td>
                <td>Só o que já virou compromisso: itens <i>contratados</i> e <i>pagos</i></td>
              </tr>
              <tr>
                <td>
                  <b>Pago</b>
                </td>
                <td>O que já saiu do bolso de verdade</td>
              </tr>
              <tr>
                <td>
                  <b>Saldo</b>
                </td>
                <td>Orçamento − Planejado. Fica vermelho se ficar negativo</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="nota">
          🚨 O alerta de estouro usa o <b>Planejado</b>, não o Comprometido — de propósito. Ele
          avisa <b>enquanto ainda dá pra cortar</b>, não depois que vocês já assinaram tudo.
        </p>
        <p className="sub mini">
          Item <b>descartado</b> sai de todas as contas. E se um item tem custo mas ninguém pôs
          valor, o painel avisa — em vez de somar zero calado e mentir no total.
        </p>
      </section>

      <section className="destaque">
        <h2>✏️ Como editar as coisas</h2>
        <p>Tudo é editável. Onde clicar:</p>
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Pra mudar</th>
                <th>Clique em</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Nome, data ou orçamento do casório</td>
                <td>
                  <b>⚙️ Ajustar casório</b>, logo abaixo do painel de dinheiro
                </td>
              </tr>
              <tr>
                <td>Nome de um tema ou subtema</td>
                <td>
                  <b>No próprio nome</b> — abre o campo pra renomear
                </td>
              </tr>
              <tr>
                <td>Qualquer campo de um item</td>
                <td>
                  <b>✏️ Editar</b>, embaixo do item
                </td>
              </tr>
              <tr>
                <td>Só o status (rápido)</td>
                <td>A caixinha de seleção na linha do item + <b>Salvar</b></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>O formulário mostra só o que faz sentido</h3>
        <p>
          Cada item abre com os campos certos <b>pra ele</b>, não uma lista genérica:
        </p>
        <ul>
          <li>
            <b>Sempre:</b> título · tem custo · essencial · data-alvo · observação
          </li>
          <li>
            <b>Valor (estimado e real):</b> só quando o item <i>tem custo</i>. Marcou a caixinha?
            Os campos aparecem na hora.
          </li>
          <li>
            <b>Fornecedor (nome, telefone, link):</b> só onde faz sentido cobrar alguém depois —
            local, buffet, fotógrafo, celebrante, DJ. Em &quot;Definir a data do casamento&quot;
            ou &quot;Comprar refrigerante&quot; ele nem aparece.
          </li>
        </ul>
        <p className="sub mini">
          Precisou de um campo que não apareceu? Tem um <b>+ mais campos</b> no fim do
          formulário — nada fica inalcançável.
        </p>

        <p className="nota">
          🔄 <b>Marcou ou desmarcou &quot;tem custo&quot;?</b> O item muda de fluxo e o status se
          ajusta sozinho: um item <i>pago</i> que perde o custo vira <i>feito</i>; um item{" "}
          <i>a fazer</i> que ganha custo vira <i>a decidir</i>. Os valores ficam guardados, só
          somem da tela.
        </p>
      </section>

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
                <td>
                  <b>A decidir</b>
                </td>
                <td>Ainda pesquisando, sem escolha feita</td>
                <td>Vendo 3 buffets</td>
              </tr>
              <tr>
                <td>
                  <b>Decidido</b>
                </td>
                <td>Escolheu qual vai ser, mas não fechou</td>
                <td>&quot;Vai ser o Buffet Silva&quot;</td>
              </tr>
              <tr>
                <td>
                  <b>Contratado</b>
                </td>
                <td>Fechou/assinou. Exige o valor real</td>
                <td>Contrato assinado, R$ 8.000</td>
              </tr>
              <tr>
                <td>
                  <b>Pago</b>
                </td>
                <td>Quitado. Exige o valor real</td>
                <td>Pagou os R$ 8.000</td>
              </tr>
              <tr>
                <td>
                  <b>A fazer</b>
                </td>
                <td>Item sem custo, ainda pendente</td>
                <td>Escolher música</td>
              </tr>
              <tr>
                <td>
                  <b>Feito</b>
                </td>
                <td>Item sem custo, resolvido</td>
                <td>Música escolhida</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="sub">
          Não precisa seguir a ordem. Se já chegou pagando direto, é só marcar{" "}
          <b>Pago</b> com o valor.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>Dúvidas comuns</h2>

        <div className="faq">
          <h3>Apareceu &quot;exige custo real preenchido&quot;</h3>
          <p>
            Você tentou marcar <b>Contratado</b> ou <b>Pago</b> sem informar quanto ficou.
            Preencha o campo de valor <i>na mesma linha do item</i> antes de salvar. É de
            propósito: sem o valor real, a conta do orçamento mentiria.
          </p>

          <h3>Como digito o dinheiro?</h3>
          <p>
            Digite só os números: <code>30000</code> vira <b>30.000,00</b>. Para centavos, use
            vírgula: <code>1500,50</code>.
          </p>

          <h3>Estimado x Real — qual a diferença?</h3>
          <p>
            <b>Estimado</b> é o seu chute enquanto pesquisa (serve pra planejar o orçamento).
            <b> Real</b> é o valor que ficou de fato, depois de fechar. Enquanto não houver
            real, as contas usam o estimado.
          </p>

          <h3>Errei o nome do Tema/Subtema, e agora?</h3>
          <p>
            Clique no nome dele — abre o campo pra renomear. Se quiser sumir de vez, use o 🗑️
            (lembrando que apagar um tema leva os subtemas e itens junto, sem desfazer).
          </p>

          <h3>Apaguei o modelo todo sem querer</h3>
          <p>
            Sem drama: com a árvore vazia aparece o botão <b>Carregar modelo pronto</b>. Ele
            semeia tudo de novo. (Só cuidado se você já tinha itens seus junto — esses não
            voltam.)
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <h2>Exemplo pronto pra copiar</h2>
        <pre className="arvore-exemplo">
{`Local
  └─ Espaço da festa
       ├─ Aluguel do salão      💰 essencial ⭐
       └─ Visitar 3 opções

Cerimônia
  ├─ Documentação
  │    ├─ Papelada do civil     essencial ⭐
  │    └─ Marcar cartório       essencial ⭐
  └─ Celebrante
       └─ Contratar celebrante  💰 essencial ⭐

Comida
  ├─ Bebidas
  │    ├─ Refrigerante          💰
  │    └─ Espumante do brinde   💰
  └─ Bolo e doces
       └─ Bolo                  💰 essencial ⭐

Noiva
  └─ Visual
       ├─ Vestido               💰 essencial ⭐
       └─ Escolher penteado`}
        </pre>
        <p className="sub">💰 = tem custo · ⭐ = essencial</p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="destaque">
        <h2>🚧 Ainda vem por aí</h2>
        <p>Coisas que já estão no plano mas ainda não estão na tela:</p>
        <ul>
          <li>
            <b>Progresso</b> — % resolvido, com os essenciais pendentes em destaque
          </li>
          <li>
            <b>Descartar item</b> — marcar &quot;não vai ter&quot; sem apagar o histórico
          </li>
          <li>
            <b>Reordenar</b> temas, subtemas e itens (arrastar)
          </li>
          <li>
            <b>Responsável</b> por item — depende de convidar gente primeiro
          </li>
          <li>
            <b>Convidar gente</b> — pais, madrinha, cerimonialista, com permissão limitada
          </li>
        </ul>
      </section>

      <p className="voltar">
        <Link href="/" className="botao-link">
          ← Voltar pro casório
        </Link>
      </p>
    </main>
  );
}
