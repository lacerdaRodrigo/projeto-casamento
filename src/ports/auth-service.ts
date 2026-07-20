// Porta de autenticação. O núcleo/aplicação só conhece esta interface.
export interface UsuarioAutenticado {
  id: string;
  email: string | null;
}

export interface AuthService {
  /** Usuário logado atual, ou null. */
  usuarioAtual(): Promise<UsuarioAutenticado | null>;
}
