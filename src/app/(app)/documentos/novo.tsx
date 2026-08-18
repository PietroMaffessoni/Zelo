import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarDocumento, vincularAta } from '@/lib/db';
import { categoriaDocumento } from '@/lib/labels';
import { useVoltar } from '@/lib/navegacao';
import { enviarArquivo, escolherDocumento } from '@/lib/storage';
import { type CategoriaDocumento } from '@/lib/types';

const categorias: CategoriaDocumento[] = ['convencao', 'regimento_interno', 'ata', 'edital', 'financeiro', 'outros'];

export default function NovoDocumento() {
  const voltar = useVoltar();
  const { assembleiaId, categoria: categoriaParam } = useLocalSearchParams<{ assembleiaId?: string; categoria?: CategoriaDocumento }>();
  const { condominioId, user } = useAuth();
  const [categoria, setCategoria] = useState<CategoriaDocumento>(assembleiaId ? 'ata' : categoriaParam ?? 'convencao');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState<{ uri: string; nome: string; tamanho: number | null } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function selecionarArquivo() {
    const doc = await escolherDocumento();
    if (doc) setArquivo(doc);
  }

  async function publicar() {
    if (!titulo.trim()) return setErro('Informe o título do documento.');
    if (!condominioId || !user) return;

    setSalvando(true);
    setErro(null);
    try {
      // O anexo é opcional: há documentos que se resolvem só com título e descrição.
      const arquivo_path = arquivo ? await enviarArquivo('documentos', arquivo.uri, condominioId, arquivo.nome) : null;
      const documento = await criarDocumento({
        condominio_id: condominioId,
        categoria,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        arquivo_path,
        arquivo_nome: arquivo?.nome ?? null,
        tamanho_bytes: arquivo?.tamanho ?? null,
        publicado_por: user.id,
      });
      if (assembleiaId) await vincularAta(assembleiaId, documento.id);
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível publicar o documento.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title={assembleiaId ? 'Anexar ata' : 'Publicar documento'} back />
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Categoria</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {categorias.map((c) => (
              <Chip key={c} label={categoriaDocumento[c].label} selected={categoria === c} onPress={() => setCategoria(c)} />
            ))}
          </ScrollView>
        </View>

        <Input label="Título" placeholder="Ex.: Convenção do condomínio" value={titulo} onChangeText={setTitulo} />
        <Input label="Descrição (opcional)" placeholder="Detalhes sobre o documento..." value={descricao} onChangeText={setDescricao} multiline />

        <Button
          title={arquivo ? arquivo.nome : 'Anexar arquivo (opcional)'}
          variant="secondary"
          icon="document-attach-outline"
          onPress={selecionarArquivo}
        />
        {arquivo ? (
          <Button title="Remover arquivo" variant="ghost" size="sm" icon="close" onPress={() => setArquivo(null)} />
        ) : (
          <AppText color="subtle" variant="caption">PDF ou imagem. Sem anexo, o documento fica só com título e descrição.</AppText>
        )}

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Publicar" icon="checkmark" onPress={publicar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
