import * as DocumentPicker from 'expo-document-picker';
import { File as ArquivoLocal } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type Bucket = 'avatars' | 'chamados' | 'achados' | 'portaria' | 'financeiro' | 'documentos';

const MIME_POR_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

/** Extensão em minúsculas ("jpg"), sem ponto. Vazio quando o URI não tem uma
 *  extensão de verdade (o picker no web devolve `blob:`/`data:`, sem nome). */
function extensaoDe(nome: string): string {
  const ext = nome.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : '';
}

/**
 * Lê o arquivo local no formato que o Supabase consegue enviar em cada plataforma.
 *
 * No React Native o supabase-js embrulha `Blob`/`File` num `FormData`, e o `FormData` do RN
 * só sabe serializar strings e objetos `{ uri }` — o Blob vira uma parte vazia e o arquivo
 * sobe com 0 byte (o upload "dá certo", mas a imagem nunca aparece). Por isso, no nativo,
 * lemos os bytes com o expo-file-system e enviamos o binário, que é o caminho recomendado
 * pela própria Supabase. No web o Blob funciona normalmente.
 */
async function lerArquivo(localUri: string, ext: string) {
  const padrao = MIME_POR_EXT[ext] ?? 'application/octet-stream';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(localUri)).blob();
    if (blob.size === 0) throw new Error('Não foi possível ler o arquivo selecionado.');
    return { corpo: blob, contentType: blob.type || padrao };
  }
  const arquivo = new ArquivoLocal(localUri);
  const bytes = await arquivo.bytes();
  if (bytes.byteLength === 0) throw new Error('Não foi possível ler o arquivo selecionado.');
  return { corpo: bytes, contentType: MIME_POR_EXT[ext] || arquivo.type || padrao };
}

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
  const { corpo, contentType } = await lerArquivo(localUri, extensaoDe(localUri));
  const ext = extensaoDe(localUri) || EXT_POR_MIME[contentType] || 'jpg';
  const nome = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(nome, corpo, {
    contentType,
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
  const extOriginal = extensaoDe(nomeOriginal ?? localUri);
  const { corpo, contentType } = await lerArquivo(localUri, extOriginal);
  const ext = extOriginal || EXT_POR_MIME[contentType] || 'dat';
  const path = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, corpo, {
    contentType,
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
