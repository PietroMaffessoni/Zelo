import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type Bucket = 'avatars' | 'chamados' | 'achados' | 'portaria' | 'financeiro' | 'documentos';

/** Abre a galeria e retorna o URI local da imagem escolhida (ou null). */
export async function escolherImagem(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}

/**
 * Envia a imagem local para o bucket **público** de avatares e retorna a URL pública.
 * O path fica sempre dentro de "{auth.uid()}/arquivo" — é o que a policy de storage
 * exige para permitir o upload (cada usuário só escreve no próprio path).
 */
export async function enviarImagem(bucket: 'avatars', localUri: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const ext = (localUri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
  const nome = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const resp = await fetch(localUri);
  const blob = await resp.blob();
  const { error } = await supabase.storage.from(bucket).upload(nome, blob, {
    contentType: blob.type || `image/${ext}`,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(nome);
  return data.publicUrl;
}

/** Escolhe e envia numa etapa. Retorna a URL pública ou null se cancelado. */
export async function escolherEEnviar(bucket: 'avatars'): Promise<string | null> {
  const uri = await escolherImagem();
  if (!uri) return null;
  return enviarImagem(bucket, uri);
}

/** Abre o seletor de arquivos (PDF ou imagem) e retorna o arquivo escolhido (ou null). */
export async function escolherDocumento(): Promise<{ uri: string; nome: string; tamanho: number | null } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, nome: a.name, tamanho: a.size ?? null };
}

/**
 * Envia um arquivo qualquer (PDF/imagem) para um bucket **privado**, dentro de uma pasta
 * (por convenção, o `condominio_id` — é o que as policies de storage desses buckets checam).
 * Retorna o *path* dentro do bucket, não uma URL — buckets privados exigem `urlAssinada` para leitura.
 */
export async function enviarArquivo(bucket: Bucket, localUri: string, pasta: string, nomeOriginal?: string): Promise<string> {
  const ext = (nomeOriginal ?? localUri).split('.').pop()?.split('?')[0]?.toLowerCase() || 'dat';
  const path = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const resp = await fetch(localUri);
  const blob = await resp.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Gera uma URL temporária de leitura para um arquivo de bucket privado. */
export async function urlAssinada(bucket: Bucket, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Gera URLs temporárias para vários arquivos de uma vez (ex.: fotos de uma lista de
 * chamados/encomendas). Retorna um mapa `path -> url assinada`; paths que falharem
 * (arquivo removido, etc.) simplesmente não aparecem no mapa.
 */
export async function urlsAssinadas(bucket: Bucket, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  const unicos = [...new Set(paths)];
  if (unicos.length === 0) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unicos, expiresIn);
  if (error) throw error;
  const mapa: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
  }
  return mapa;
}
