// Fallback de carregamento do segmento raiz. Sem ele, ao salvar (a action faz
// revalidatePath + redirect) o cache da rota é invalidado e o router fica SEM
// nada pra mostrar enquanto rebusca os dados — dava tela branca. Agora mostra
// este estado enquanto o servidor re-renderiza.
export default function Loading() {
  return (
    <main className="carregando" aria-busy="true" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p className="sub">Carregando…</p>
    </main>
  );
}
