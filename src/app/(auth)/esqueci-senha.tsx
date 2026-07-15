import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Card, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { hapticSuccess } from '@/lib/haptics';
import { useToast } from '@/lib/toast';

export default function EsqueciSenha() {
  const router = useRouter();
  const { resetarSenha } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    if (!email.trim()) {
      setErro('Informe seu e-mail.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await resetarSenha(email);
    setCarregando(false);
    if (error) {
      setErro(error);
      return;
    }
    setEnviado(true);
    hapticSuccess();
    toast.sucesso('E-mail de recuperação enviado');
  }

  return (
    <Screen>
      <AppHeader title="Recuperar senha" back />

      {enviado ? (
        <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <AppText variant="subtitle">Confira seu e-mail</AppText>
          <AppText color="muted">
            Se houver uma conta com <AppText weight="semibold">{email.trim()}</AppText>, enviamos um link para você
            criar uma nova senha. Verifique também a caixa de spam.
          </AppText>
          <View style={{ marginTop: spacing.md }}>
            <Button title="Voltar para o login" onPress={() => router.replace('/(auth)/login')} />
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          <AppText color="muted">
            Digite o e-mail cadastrado e enviaremos um link para você redefinir sua senha.
          </AppText>
          <Input
            label="E-mail"
            placeholder="voce@email.com"
            icon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (erro) setErro(null);
            }}
            error={erro ?? undefined}
            onSubmitEditing={enviar}
          />
          <Button title="Enviar link de recuperação" onPress={enviar} loading={carregando} size="lg" />
        </View>
      )}
    </Screen>
  );
}
