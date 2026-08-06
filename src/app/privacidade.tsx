// RASCUNHO jurídico gerado como ponto de partida — revisar com um(a) advogado(a)
// e/ou encarregado(a) de dados (DPO) antes de operar com usuários reais. Trechos
// entre colchetes [...] precisam ser preenchidos com os dados reais do responsável.
import { DocumentoLegal, type SecaoLegal } from '@/components/DocumentoLegal';

const VIGENCIA = '5 de agosto de 2026';

const SECOES: SecaoLegal[] = [
  {
    titulo: 'Quem trata seus dados',
    paragrafos: [
      'Esta Política explica como o Zelo trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).',
      'Para os dados da sua conta (nome, e-mail, telefone, senha), o Zelo — [Razão Social], CNPJ [nº] — atua como controlador. Para os dados que o condomínio insere sobre seus moradores e operações, o condomínio, representado pelo síndico ou pela administradora, é o controlador, e o Zelo atua como operador, tratando esses dados por conta e ordem dele.',
      'Encarregado(a) pelo tratamento de dados (DPO): [nome], [e-mail do encarregado].',
    ],
  },
  {
    titulo: 'Dados que coletamos',
    paragrafos: ['Coletamos apenas os dados necessários para o funcionamento do serviço:'],
    itens: [
      'Cadastro da conta: nome completo, e-mail, telefone e senha (armazenada de forma criptografada).',
      'Ficha do morador no condomínio: CPF, RG, bloco/unidade e vínculo (proprietário, inquilino etc.), quando informados.',
      'Dados de terceiros inseridos pela gestão: dependentes, veículos, visitantes e encomendas.',
      'Dados de uso: chamados, reservas, comunicados, documentos, lançamentos financeiros e registros da operação do condomínio.',
      'Dados técnicos: identificador do dispositivo para envio de notificações e informações mínimas necessárias à autenticação e à segurança.',
    ],
  },
  {
    titulo: 'Para que usamos os dados (finalidades)',
    itens: [
      'Criar e autenticar sua conta e permitir o acesso ao seu condomínio;',
      'Operar as funcionalidades do aplicativo (chamados, reservas, portaria, comunicados, financeiro, manutenção etc.);',
      'Permitir o contato entre a gestão, a portaria e os moradores;',
      'Enviar notificações e comunicados relacionados ao condomínio;',
      'Garantir a segurança, prevenir fraudes e cumprir obrigações legais;',
      'Melhorar e manter o serviço.',
    ],
  },
  {
    titulo: 'Bases legais',
    paragrafos: [
      'Tratamos dados pessoais com fundamento nas hipóteses da LGPD, especialmente: execução do contrato e de procedimentos preliminares (art. 7º, V); cumprimento de obrigação legal ou regulatória (art. 7º, II); legítimo interesse para viabilizar a gestão condominial e a segurança (art. 7º, IX); e consentimento, quando aplicável (art. 7º, I). O consentimento pode ser revogado a qualquer momento.',
    ],
  },
  {
    titulo: 'Compartilhamento e provedores',
    paragrafos: [
      'Não vendemos seus dados. Compartilhamos dados apenas quando necessário para operar o serviço, com:',
    ],
    itens: [
      'Provedores de infraestrutura em nuvem que hospedam os dados e a autenticação (Supabase) e o serviço de notificações (Expo);',
      'O síndico, a administradora e a equipe do seu condomínio, conforme o papel de cada um;',
      'Autoridades públicas, quando exigido por lei, ordem judicial ou para o exercício regular de direitos.',
    ],
  },
  {
    titulo: 'Transferência internacional',
    paragrafos: [
      'Nossos provedores de nuvem podem armazenar ou processar dados em servidores localizados fora do Brasil. Nesses casos, adotamos salvaguardas para garantir um nível de proteção compatível com a LGPD.',
    ],
  },
  {
    titulo: 'Dados de crianças e adolescentes',
    paragrafos: [
      'Dependentes menores de idade podem ser cadastrados pelo morador titular, que declara ser responsável legal e ter autorização para fornecer esses dados. Tratamos esses dados no melhor interesse do menor e apenas para as finalidades de gestão do condomínio.',
    ],
  },
  {
    titulo: 'Por quanto tempo guardamos',
    paragrafos: [
      'Mantemos os dados pelo tempo necessário às finalidades descritas e ao cumprimento de obrigações legais. Encerrada a conta ou o vínculo com o condomínio, os dados são eliminados ou anonimizados, salvo quando a lei exigir sua conservação por prazo determinado.',
    ],
  },
  {
    titulo: 'Segurança',
    paragrafos: [
      'Adotamos medidas técnicas e administrativas para proteger os dados, como criptografia de senhas, controle de acesso por papel (cada usuário enxerga apenas o que lhe cabe) e regras de segurança no banco de dados. Nenhum sistema é totalmente imune a incidentes; em caso de incidente relevante, seguiremos os procedimentos e comunicações previstos na LGPD.',
    ],
  },
  {
    titulo: 'Seus direitos',
    paragrafos: [
      'Você pode, a qualquer momento, exercer os direitos previstos no art. 18 da LGPD:',
    ],
    itens: [
      'Confirmar a existência de tratamento e acessar seus dados;',
      'Corrigir dados incompletos, inexatos ou desatualizados;',
      'Solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;',
      'Solicitar a portabilidade dos dados;',
      'Obter informação sobre com quem compartilhamos seus dados;',
      'Revogar o consentimento e se opor a tratamentos, nos casos previstos em lei.',
    ],
  },
  {
    titulo: 'Como exercer seus direitos',
    paragrafos: [
      'Parte dos dados pode ser atualizada diretamente no aplicativo, na tela de perfil. Para as demais solicitações, entre em contato pelo e-mail [e-mail do encarregado]. Podemos precisar confirmar sua identidade antes de atender ao pedido. Solicitações sobre dados inseridos pelo condomínio podem ser direcionadas ao síndico ou à administradora, na qualidade de controladores.',
    ],
  },
  {
    titulo: 'Alterações desta Política',
    paragrafos: [
      'Podemos atualizar esta Política periodicamente. Mudanças relevantes serão comunicadas pelo aplicativo, e a data de "última atualização" no topo será revista.',
    ],
  },
  {
    titulo: 'Contato',
    paragrafos: [
      'Para dúvidas sobre esta Política ou sobre o tratamento dos seus dados, fale com o(a) encarregado(a) pelo e-mail [e-mail do encarregado].',
    ],
  },
];

export default function PoliticaDePrivacidade() {
  return (
    <DocumentoLegal
      titulo="Política de Privacidade"
      vigencia={VIGENCIA}
      intro={[
        'Sua privacidade é importante para nós. Esta Política descreve quais dados o Zelo coleta, como os utiliza e quais são os seus direitos.',
      ]}
      secoes={SECOES}
      rodape="Este documento é um modelo inicial e não substitui a orientação de um profissional jurídico ou de um(a) encarregado(a) de proteção de dados."
    />
  );
}
