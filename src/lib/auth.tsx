import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Membership, Papel, Profile, Vinculo } from '@/lib/types';

const CHAVE_CONDOMINIO = 'condoos.condominio_atual';

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  /** Vínculos aguardando aprovação do síndico (entrar_condominio cria como 'pendente'). */
  membershipsPendentes: Membership[];
  membershipAtual: Membership | null;
  condominioId: string | null;
  papel: Papel | null;

  signIn: (email: string, senha: string) => Promise<{ error?: string }>;
  signUp: (nome: string, email: string, senha: string) => Promise<{ error?: string }>;
  resetarSenha: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  selecionarCondominio: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
  criarCondominio: (dados: {
    nome: string;
    cidade?: string;
    uf?: string;
  }) => Promise<{ error?: string; condominioId?: string }>;
  entrarCondominio: (dados: {
    codigo: string;
    bloco?: string;
    numero?: string;
    vinculo?: Vinculo;
  }) => Promise<{ error?: string; condominioId?: string }>;
  entrarComoPorteiro: (codigo: string) => Promise<{ error?: string; condominioId?: string }>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipsPendentes, setMembershipsPendentes] = useState<Membership[]>([]);
  const [condominioId, setCondominioId] = useState<string | null>(null);
  const selecionadoRef = useRef<string | null>(null);

  const carregarDados = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: mbs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase
        .from('memberships')
        // codigo_convite/codigo_portaria não fazem parte do select geral de condominios
        // (são segredos de acesso) — quem é gestor os busca à parte, via RPC, logo abaixo.
        .select('*, condominio:condominios(id, nome, cidade, uf, endereco, cnpj, criado_por, created_at), unidade:unidades(*)')
        .eq('user_id', uid)
        .in('status', ['ativo', 'pendente'])
        .order('created_at', { ascending: true }),
    ]);

    setProfile((prof as Profile) ?? null);
    const todas = (mbs as Membership[]) ?? [];
    const lista = todas.filter((m) => m.status === 'ativo');
    setMembershipsPendentes(todas.filter((m) => m.status === 'pendente'));

    const gestorEm = lista.filter((m) => m.papel === 'sindico' || m.papel === 'admin');
    if (gestorEm.length) {
      const codigos = await Promise.all(
        gestorEm.map((m) => supabase.rpc('obter_codigos_condominio', { p_cond: m.condominio_id })),
      );
      for (let i = 0; i < gestorEm.length; i++) {
        const linha = (codigos[i].data as { codigo_convite: string; codigo_portaria: string | null }[] | null)?.[0];
        if (!linha) continue;
        const membership = lista.find((m) => m.condominio_id === gestorEm[i].condominio_id);
        if (membership?.condominio) Object.assign(membership.condominio, linha);
      }
    }
    setMemberships(lista);

    // Define o condomínio atual: preferência salva, senão o primeiro.
    const salvo = selecionadoRef.current ?? (await AsyncStorage.getItem(CHAVE_CONDOMINIO));
    const existe = lista.find((m) => m.condominio_id === salvo);
    const proximo = existe?.condominio_id ?? lista[0]?.condominio_id ?? null;
    setCondominioId(proximo);
    selecionadoRef.current = proximo;
  }, []);

  const inicializar = useCallback(
    async (sess: Session | null) => {
      setSession(sess);
      if (sess?.user) {
        await carregarDados(sess.user.id).catch(() => undefined);
      } else {
        setProfile(null);
        setMemberships([]);
        setMembershipsPendentes([]);
        setCondominioId(null);
      }
    },
    [carregarDados],
  );

  useEffect(() => {
    let ativo = true;
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      await inicializar(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!ativo) return;
      await inicializar(sess);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [inicializar]);

  const signIn: AuthState['signIn'] = useCallback(async (email, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    return { error: error ? traduzErro(error.message) : undefined };
  }, []);

  const signUp: AuthState['signUp'] = useCallback(async (nome, email, senha) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { nome_completo: nome.trim() } },
    });
    return { error: error ? traduzErro(error.message) : undefined };
  }, []);

  const resetarSenha: AuthState['resetarSenha'] = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return { error: error ? traduzErro(error.message) : undefined };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(CHAVE_CONDOMINIO);
    selecionadoRef.current = null;
  }, []);

  const selecionarCondominio = useCallback(async (id: string) => {
    setCondominioId(id);
    selecionadoRef.current = id;
    await AsyncStorage.setItem(CHAVE_CONDOMINIO, id);
  }, []);

  const recarregar = useCallback(async () => {
    const uid = session?.user?.id;
    if (uid) await carregarDados(uid);
  }, [session, carregarDados]);

  const criarCondominio: AuthState['criarCondominio'] = useCallback(
    async ({ nome, cidade, uf }) => {
      const { data, error } = await supabase.rpc('criar_condominio', {
        p_nome: nome.trim(),
        p_cidade: cidade?.trim() || null,
        p_uf: uf?.trim() || null,
      });
      if (error) return { error: traduzErro(error.message) };
      const novoId = (data as { id: string } | null)?.id;
      await recarregar();
      if (novoId) await selecionarCondominio(novoId);
      return { condominioId: novoId };
    },
    [recarregar, selecionarCondominio],
  );

  const entrarCondominio: AuthState['entrarCondominio'] = useCallback(
    async ({ codigo, bloco, numero, vinculo }) => {
      const { data, error } = await supabase.rpc('entrar_condominio', {
        p_codigo: codigo.trim().toUpperCase(),
        p_bloco: bloco?.trim() || null,
        p_numero: numero?.trim() || null,
        p_vinculo: vinculo ?? 'proprietario',
      });
      if (error) return { error: traduzErro(error.message) };
      const cid = (data as { condominio_id: string } | null)?.condominio_id;
      await recarregar();
      if (cid) await selecionarCondominio(cid);
      return { condominioId: cid };
    },
    [recarregar, selecionarCondominio],
  );

  const entrarComoPorteiro: AuthState['entrarComoPorteiro'] = useCallback(
    async (codigo) => {
      const { data, error } = await supabase.rpc('entrar_como_porteiro', {
        p_codigo: codigo.trim().toUpperCase(),
      });
      if (error) return { error: traduzErro(error.message) };
      const cid = (data as { condominio_id: string } | null)?.condominio_id;
      await recarregar();
      if (cid) await selecionarCondominio(cid);
      return { condominioId: cid };
    },
    [recarregar, selecionarCondominio],
  );

  const membershipAtual = useMemo(
    () => memberships.find((m) => m.condominio_id === condominioId) ?? null,
    [memberships, condominioId],
  );

  const value: AuthState = {
    ready,
    session,
    user: session?.user ?? null,
    profile,
    memberships,
    membershipsPendentes,
    membershipAtual,
    condominioId,
    papel: membershipAtual?.papel ?? null,
    signIn,
    signUp,
    resetarSenha,
    signOut,
    selecionarCondominio,
    recarregar,
    criarCondominio,
    entrarCondominio,
    entrarComoPorteiro,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('user already registered')) return 'Este e-mail já está cadastrado.';
  if (m.includes('password should be at least')) return 'A senha deve ter no mínimo 8 caracteres.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'E-mail inválido.';
  if (m.includes('código') || m.includes('codigo')) return msg;
  if (m.includes('network')) return 'Sem conexão. Verifique sua internet.';
  // Mensagens não mapeadas não são devolvidas cruas: podem vazar detalhe interno do
  // backend. Fica um erro genérico — quem quiser investigar o real motivo, olha os logs.
  return 'Não foi possível concluir. Tente novamente em instantes.';
}
