import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Brand } from '@/components/Brand';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { lerManterConectado } from '@/lib/supabase';
import { lerBloqueio, limparFalhas, registrarFalha } from '@/lib/tentativas';
import { useAppTheme } from '@/lib/theme';
import { erroEmail, formatarEspera } from '@/lib/validacao';

export default function Login() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { signIn, precisaSegundoFator, verificarDesafioMFA } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  // Limite de tentativas: depois de alguns erros seguidos o login pede espera,
  // que dobra a cada nova falha. `restante` é a contagem em segundos, avançada
  // pelo intervalo abaixo — o relógio não é lido durante a renderização.
  const [bloqueadoAte, setBloqueadoAte] = useState(0);
  const [restante, setRestante] = useState(0);
  const bloqueado = restante > 0;

  // Abre com a última escolha: quem desmarcou num aparelho compartilhado não
  // deveria ter que lembrar de desmarcar de novo a cada login.
  useEffect(() => {
    let ativo = true;
    lerManterConectado().then((v) => {
      if (ativo) setManterConectado(v);
    });
    // Um bloqueio anterior continua valendo ao reabrir o app.
    lerBloqueio().then((ate) => {
      if (ativo && ate) setBloqueadoAte(ate);
    });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!bloqueadoAte) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((bloqueadoAte - Date.now()) / 1000));
      setRestante(s);
      if (!s) setBloqueadoAte(0);
    };
    const id = setInterval(tick, 1000);
    // Primeira atualização já no próximo quadro, sem esperar um segundo inteiro.
    const primeiro = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(primeiro);
    };
  }, [bloqueadoAte]);

  /** Conta a falha e, se passou do tolerado, liga a espera. */
  async function falhou() {
    const ate = await registrarFalha();
    if (ate) setBloqueadoAte(ate);
  }
  /**
   * Segundo fator pendente.
   *
   * O `signInWithPassword` do Supabase SUCEDE mesmo com 2FA ativa — ele apenas
   * devolve uma sessão de nível aal1. Quem exige o código é a aplicação: sem
   * esta etapa, ativar a verificação em duas etapas não protegeria nada, porque
   * a senha sozinha continuaria abrindo o app.
   */
  const [pedindoCodigo, setPedindoCodigo] = useState(false);
  const [codigo, setCodigo] = useState('');

  async function entrar() {
    if (bloqueado || carregando) return;
    if (!email || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }
    // Formato inválido nem chega ao servidor — e não conta como tentativa.
    const invalido = erroEmail(email);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error, credencialInvalida } = await signIn(email, senha, manterConectado);
    if (error) {
      setCarregando(false);
      setErro(error);
      if (credencialInvalida) {
        // A senha errada sai do campo: deixá-la lá convida a reenviar a mesma
        // coisa, e ela fica legível para quem pegar o aparelho e tocar no olho.
        setSenha('');
        await falhou();
      }
      return;
    }
    await limparFalhas();

    const exige = await precisaSegundoFator();
    setCarregando(false);
    if (exige) {
      setPedindoCodigo(true);
      setCodigo('');
      return;
    }
    router.replace('/');
  }

  async function confirmarCodigo() {
    if (bloqueado || carregando) return;
    if (codigo.trim().length < 6) return setErro('Digite os 6 dígitos do aplicativo.');
    setCarregando(true);
    setErro(null);
    const { error } = await verificarDesafioMFA(codigo);
    setCarregando(false);
    if (error) {
      setErro(error);
      setCodigo('');
      // Código de 6 dígitos é adivinhável por força bruta: entra no mesmo limite.
      if (!error.startsWith('Sem conexão')) await falhou();
      return;
    }
    await limparFalhas();
    router.replace('/');
  }

  const avisoBloqueio = bloqueado ? (
    <AppText variant="caption" color="muted" center>
      Muitas tentativas seguidas. Por segurança, aguarde {formatarEspera(restante)} para tentar de novo.
    </AppText>
  ) : null;

  return (
    // Centralizado na altura: numa tela alta o formulário pregado no topo deixava
    // metade de baixo vazia. O `paddingTop` iguala a folga final que o `Screen`
    // dá ao ScrollView — sem ele o centro ótico ficaria 36px acima do meio.
    <Screen
      maxWidth={400}
      style={{ flexGrow: 1, justifyContent: 'center', paddingTop: spacing.xxxl + spacing.xl }}
    >
      <View style={{ marginBottom: spacing.xxl }}>
        <Brand size="lg" tagline />
      </View>

      {pedindoCodigo ? (
        <View style={{ gap: spacing.lg }}>
          <View>
            <AppText variant="heading">Verificação em duas etapas</AppText>
            <AppText variant="caption" color="muted" style={{ marginTop: 4 }}>
              Digite o código de 6 dígitos do seu aplicativo autenticador.
            </AppText>
          </View>

          <Input
            label="Código"
            placeholder="000000"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            value={codigo}
            onChangeText={setCodigo}
            onSubmitEditing={confirmarCodigo}
          />

          {erro ? (
            <View
              style={{
                backgroundColor: palette.dangerSoft,
                borderRadius: radius.md,
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.md,
              }}
            >
              <AppText variant="caption" style={{ color: palette.danger }}>
                {erro}
              </AppText>
            </View>
          ) : null}

          {avisoBloqueio}
          <Button
            title={bloqueado ? `Aguarde ${formatarEspera(restante)}` : 'Confirmar'}
            onPress={confirmarCodigo}
            loading={carregando}
            disabled={bloqueado}
            size="lg"
          />
          <Button
            title="Voltar"
            variant="ghost"
            onPress={() => {
              setPedindoCodigo(false);
              setErro(null);
            }}
          />
        </View>
      ) : (
      <View style={{ gap: spacing.lg }}>
        <AppText variant="heading">Entrar</AppText>

        <Input
          label="E-mail"
          placeholder="voce@email.com"
          icon="mail-outline"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          keyboardType="email-address"
          maxLength={254}
          value={email}
          onChangeText={setEmail}
        />
        <View style={{ gap: spacing.sm }}>
          <Input
            label="Senha"
            placeholder="Sua senha"
            icon="lock-closed-outline"
            senha
            autoComplete="current-password"
            textContentType="password"
            maxLength={72}
            value={senha}
            onChangeText={setSenha}
            onSubmitEditing={entrar}
          />
          <Link href="/(auth)/esqueci-senha" asChild>
            <AppText color="primary" variant="label" style={{ alignSelf: 'flex-end' }}>
              Esqueci minha senha
            </AppText>
          </Link>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: manterConectado }}
          accessibilityHint="Desmarcado, a sessão termina quando o app for fechado."
          onPress={() => setManterConectado((v) => !v)}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' }}
        >
          <Ionicons
            name={manterConectado ? 'checkbox' : 'square-outline'}
            size={22}
            color={manterConectado ? palette.primary : palette.borderStrong}
          />
          <AppText variant="label">Manter conectado</AppText>
        </Pressable>

        {erro ? (
          <View
            style={{
              backgroundColor: palette.dangerSoft,
              borderRadius: radius.md,
              paddingVertical: spacing.sm + 2,
              paddingHorizontal: spacing.md,
            }}
          >
            <AppText variant="caption" style={{ color: palette.danger }}>
              {erro}
            </AppText>
          </View>
        ) : null}

        {avisoBloqueio}
        <Button
          title={bloqueado ? `Aguarde ${formatarEspera(restante)}` : 'Entrar'}
          onPress={entrar}
          loading={carregando}
          disabled={bloqueado}
          size="lg"
        />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
          <AppText color="muted" variant="caption">
            Ainda não tem conta?
          </AppText>
          <Link href="/(auth)/cadastro" asChild>
            <AppText color="primary" variant="label">
              Criar conta
            </AppText>
          </Link>
        </View>
      </View>
      )}
    </Screen>
  );
}
