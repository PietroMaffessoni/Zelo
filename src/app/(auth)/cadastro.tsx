import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Brand } from '@/components/Brand';
import { RequisitosSenha } from '@/components/RequisitosSenha';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/theme';
import { erroEmail, erroNome, erroSenha, erroTelefone, mascaraTelefone, normalizarEmail } from '@/lib/validacao';

export default function Cadastro() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  // Os erros por campo só aparecem depois da primeira tentativa de enviar:
  // acusar "e-mail inválido" na primeira letra digitada só atrapalha.
  const [tentou, setTentou] = useState(false);

  const erros = {
    nome: erroNome(nome),
    email: erroEmail(email),
    telefone: erroTelefone(telefone),
    senha: erroSenha(senha, { nome, email }),
    confirmar: !confirmarSenha ? 'Repita a senha.' : confirmarSenha !== senha ? 'As senhas não coincidem.' : null,
  };
  const mostrar = (e: string | null) => (tentou && e ? e : undefined);

  async function cadastrar() {
    setTentou(true);
    setAviso(null);
    if (Object.values(erros).some(Boolean)) {
      setErro('Corrija os campos destacados.');
      return;
    }
    if (!aceito) {
      setErro('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await signUp(nome.trim().replace(/\s+/g, ' '), normalizarEmail(email), senha, telefone);
    if (error) {
      setCarregando(false);
      setErro(error);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setCarregando(false);
    if (data.session) {
      router.replace('/onboarding');
    } else {
      setAviso('Conta criada! Confirme seu e-mail e depois faça login.');
    }
  }

  return (
    <Screen maxWidth={400}>
      {/* Sem KeyboardAvoidingView próprio: o `Screen` já tem um, por fora do
          ScrollView. Um segundo, aqui dentro, media a própria altura somada ao
          padding que ele mesmo acabava de pôr e crescia a cada medida — a tela
          ganhava rolagem infinita assim que o teclado abria. */}
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Brand size="lg" />
      </View>

      <View style={{ gap: spacing.lg }}>
        <AppText variant="heading">Criar conta</AppText>

        <Input
          label="Nome completo"
          placeholder="Nome e sobrenome"
          icon="person-outline"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={100}
          value={nome}
          onChangeText={setNome}
          error={mostrar(erros.nome)}
        />
        <Input
          label="E-mail"
          placeholder="voce@email.com"
          icon="mail-outline"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          maxLength={254}
          value={email}
          onChangeText={setEmail}
          error={mostrar(erros.email)}
        />
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          icon="call-outline"
          keyboardType="phone-pad"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          maxLength={15}
          value={telefone}
          onChangeText={(v) => setTelefone(mascaraTelefone(v))}
          error={mostrar(erros.telefone)}
        />
        <Input
          label="Senha"
          placeholder="Crie uma senha forte"
          icon="lock-closed-outline"
          senha
          autoComplete="new-password"
          textContentType="newPassword"
          passwordRules="minlength: 10; required: lower; required: upper; required: digit; required: special;"
          maxLength={72}
          value={senha}
          onChangeText={setSenha}
          error={mostrar(erros.senha)}
        />
        <RequisitosSenha senha={senha} />
        <Input
          label="Confirmar senha"
          placeholder="Repita a senha"
          icon="lock-closed-outline"
          senha
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={72}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          error={mostrar(erros.confirmar)}
        />

        <Pressable
          onPress={() => setAceito((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.sm,
              borderWidth: 1.5,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: aceito ? palette.primary : palette.border,
              backgroundColor: aceito ? palette.primary : 'transparent',
            }}
          >
            {aceito ? <Ionicons name="checkmark" size={16} color={palette.onPrimary} /> : null}
          </View>
          <AppText variant="label" color="muted" style={{ flex: 1 }}>
            Li e aceito os{' '}
            <AppText variant="label" color="primary" weight="semibold" onPress={() => router.push('/termos')}>
              Termos de Uso
            </AppText>{' '}
            e a{' '}
            <AppText
              variant="label"
              color="primary"
              weight="semibold"
              onPress={() => router.push('/privacidade')}
            >
              Política de Privacidade
            </AppText>
            .
          </AppText>
        </Pressable>

        {/* Retorno do formulário em bloco contido — uma linha de texto colorida
            solta entre os campos se perde justamente quando mais importa. */}
        {erro ? (
          <View style={{ backgroundColor: palette.dangerSoft, borderRadius: radius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md }}>
            <AppText variant="caption" style={{ color: palette.danger }}>
              {erro}
            </AppText>
          </View>
        ) : null}
        {aviso ? (
          <View style={{ backgroundColor: palette.successSoft, borderRadius: radius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md }}>
            <AppText variant="caption" style={{ color: palette.success }}>
              {aviso}
            </AppText>
          </View>
        ) : null}

        <Button title="Criar conta" onPress={cadastrar} loading={carregando} size="lg" />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
          <AppText color="muted">Já tem conta?</AppText>
          <Link href="/(auth)/login" asChild>
            <AppText color="primary" weight="semibold">
              Entrar
            </AppText>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
