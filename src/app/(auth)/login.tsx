import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Brand } from '@/components/Brand';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';

export default function Login() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { signIn, precisaSegundoFator, verificarDesafioMFA } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
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
    if (!email || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await signIn(email, senha);
    if (error) {
      setCarregando(false);
      setErro(error);
      return;
    }

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
    if (codigo.trim().length < 6) return setErro('Digite os 6 dígitos do aplicativo.');
    setCarregando(true);
    setErro(null);
    const { error } = await verificarDesafioMFA(codigo);
    setCarregando(false);
    if (error) return setErro(error);
    router.replace('/');
  }

  return (
    <Screen maxWidth={400}>
      <View style={{ marginTop: spacing.xxxl, marginBottom: spacing.xxl }}>
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

          <Button title="Confirmar" onPress={confirmarCodigo} loading={carregando} size="lg" />
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
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <View style={{ gap: spacing.sm }}>
          <Input
            label="Senha"
            placeholder="Sua senha"
            icon="lock-closed-outline"
            senha
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

        <Button title="Entrar" onPress={entrar} loading={carregando} size="lg" />

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
