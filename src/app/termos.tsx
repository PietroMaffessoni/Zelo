// RASCUNHO jurídico gerado como ponto de partida — revisar com um(a) advogado(a)
// antes de operar com usuários reais. Trechos entre colchetes [...] precisam ser
// preenchidos com os dados reais da pessoa/empresa responsável pelo Zelo.
import { DocumentoLegal, type SecaoLegal } from '@/components/DocumentoLegal';

const VIGENCIA = '5 de agosto de 2026';

const SECOES: SecaoLegal[] = [
  {
    titulo: 'Aceitação dos Termos',
    paragrafos: [
      'Ao criar uma conta ou utilizar o Zelo ("aplicativo" ou "serviço"), você declara que leu, entendeu e concorda com estes Termos de Uso e com a Política de Privacidade, que é parte integrante deste documento. Caso não concorde, não utilize o serviço.',
      'Estes Termos constituem um contrato entre você e [Razão Social do responsável pelo Zelo], inscrita no CNPJ [nº], doravante "nós" ou "Zelo".',
    ],
  },
  {
    titulo: 'O que é o Zelo',
    paragrafos: [
      'O Zelo é uma ferramenta de gestão condominial que organiza, em um único lugar, a comunicação e a operação do dia a dia do condomínio: chamados e ocorrências, reservas de áreas comuns, controle de encomendas e visitantes, comunicados, assembleias, documentos, agenda de manutenção, achados e perdidos e o registro de informações financeiras.',
      'O Zelo é uma ferramenta de organização e registro. Não somos administradora de condomínios, instituição financeira, meio de pagamento nem prestamos serviços de portaria, segurança ou contabilidade. Não intermediamos nem executamos pagamentos.',
    ],
  },
  {
    titulo: 'Cadastro e conta',
    itens: [
      'Para usar o serviço é necessário criar uma conta com nome, e-mail, telefone e senha, fornecendo informações verdadeiras, exatas e atualizadas.',
      'Você é o único responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta.',
      'Você deve ter capacidade civil para contratar. Menores de idade só podem ser cadastrados como dependentes, sob responsabilidade do morador titular.',
      'Notifique-nos imediatamente em caso de uso não autorizado da sua conta.',
    ],
  },
  {
    titulo: 'Perfis de acesso e códigos',
    paragrafos: [
      'O acesso ao condomínio se dá por papéis distintos — síndico/administrador, morador, porteiro, zelador e conselho — cada um com permissões próprias. O ingresso em um condomínio ocorre por código de convite ou de equipe, e pode depender de aprovação do síndico.',
      'Os códigos de acesso são confidenciais. Quem os compartilha é responsável por controlar quem entra no condomínio. O síndico ou administrador pode aprovar, recusar ou remover vínculos.',
    ],
  },
  {
    titulo: 'Responsabilidade sobre os dados inseridos',
    paragrafos: [
      'Ao inserir dados de terceiros (moradores, dependentes, visitantes, veículos, funcionários), especialmente na condição de síndico, administrador, porteiro ou zelador, você declara ter base legal e autorização para tratá-los e se compromete a fazê-lo apenas para as finalidades legítimas de gestão do condomínio, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
      'O responsável pela gestão do condomínio atua como controlador desses dados; o Zelo atua como operador, tratando-os por conta e ordem dele, conforme detalhado na Política de Privacidade.',
    ],
  },
  {
    titulo: 'Uso permitido',
    paragrafos: ['Você concorda em não:'],
    itens: [
      'Utilizar o serviço para fins ilícitos, fraudulentos ou que violem direitos de terceiros;',
      'Inserir conteúdo ofensivo, difamatório, discriminatório ou que viole a privacidade de outras pessoas;',
      'Tentar acessar áreas, contas ou dados aos quais você não tem autorização;',
      'Comprometer a segurança, sobrecarregar, copiar, decompilar ou fazer engenharia reversa do serviço;',
      'Usar o Zelo para enviar spam ou comunicações não solicitadas.',
    ],
  },
  {
    titulo: 'Informações financeiras',
    paragrafos: [
      'O Zelo permite registrar lançamentos, boletos, inadimplência e o envio de despesas para a administradora. Esses registros têm caráter organizacional e informativo. A cobrança, a quitação e a execução de pagamentos são de responsabilidade do condomínio e/ou da sua administradora, fora do aplicativo.',
      'Não garantimos a exatidão de valores lançados por usuários e não respondemos por decisões financeiras tomadas com base nesses registros.',
    ],
  },
  {
    titulo: 'Propriedade intelectual',
    paragrafos: [
      'O software, a marca, o design e os demais elementos do Zelo são protegidos por direitos de propriedade intelectual. Concedemos a você uma licença limitada, pessoal, intransferível e revogável para usar o aplicativo conforme estes Termos. Os dados que você insere continuam pertencendo a você e/ou ao condomínio.',
    ],
  },
  {
    titulo: 'Disponibilidade e isenções',
    paragrafos: [
      'O serviço é fornecido "no estado em que se encontra", sem garantias de que estará sempre disponível, livre de erros ou interrupções. Podemos realizar manutenções, alterar ou descontinuar funcionalidades a qualquer momento.',
      'Notificações e lembretes (por exemplo, de manutenção) dependem do sistema operacional do seu dispositivo e podem não ser entregues; não devem ser sua única fonte de controle para obrigações importantes.',
    ],
  },
  {
    titulo: 'Limitação de responsabilidade',
    paragrafos: [
      'Na máxima extensão permitida pela lei, o Zelo não se responsabiliza por danos indiretos, lucros cessantes, perda de dados ou prejuízos decorrentes do uso ou da impossibilidade de uso do serviço, nem por conteúdos e informações inseridos pelos usuários. Nada nestes Termos afasta direitos que você tenha como consumidor.',
    ],
  },
  {
    titulo: 'Suspensão e encerramento',
    paragrafos: [
      'Podemos suspender ou encerrar o acesso de contas que violem estes Termos ou a lei. Você pode encerrar sua conta a qualquer momento. O tratamento dos seus dados após o encerramento segue a Política de Privacidade.',
    ],
  },
  {
    titulo: 'Alterações destes Termos',
    paragrafos: [
      'Podemos atualizar estes Termos periodicamente. Mudanças relevantes serão comunicadas pelo aplicativo. O uso continuado após a atualização representa concordância com a nova versão.',
    ],
  },
  {
    titulo: 'Lei aplicável e foro',
    paragrafos: [
      'Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de [cidade/UF], salvo disposição legal que garanta ao consumidor outro foro.',
    ],
  },
  {
    titulo: 'Contato',
    paragrafos: [
      'Dúvidas sobre estes Termos podem ser enviadas para [e-mail de contato].',
    ],
  },
];

export default function TermosDeUso() {
  return (
    <DocumentoLegal
      titulo="Termos de Uso"
      vigencia={VIGENCIA}
      intro={[
        'Estes Termos regulam o uso do Zelo. Leia com atenção antes de utilizar o aplicativo.',
      ]}
      secoes={SECOES}
      rodape="Este documento é um modelo inicial e não substitui a orientação de um profissional jurídico."
    />
  );
}
