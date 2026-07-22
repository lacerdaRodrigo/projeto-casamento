// Porta de autenticação. O núcleo/aplicação só conhece esta interface.
export interface UsuarioAutenticado {
  id: string;
  email: string | null;
}

export interface AuthService {
  /** Usuário logado atual, or null. Validação AUTÊNTICA (contata o servidor de
   *  auth). Use quando a autenticidade importa (ex.: mutações). */
  usuarioAtual(): Promise<UsuarioAutenticado | null>;
  /**
   * Usuário da sessão SEM ida à rede (lê o cookie já refrescado pelo middleware).
   * Barato — pra usar como portão de UI (decidir redirect pra /login). O dado em
   * si continua protegido por RLS, então isto não afrouxa a segurança.
   */
  usuarioDaSessao(): Promise<UsuarioAutenticado | null>;
}
