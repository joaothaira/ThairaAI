export type AssistantPreset = {
  id: string;
  avatar: string;
  presetAgentType?: string;
  /**
   * Directory containing all resources for this preset (relative to project root).
   * If set, both ruleFiles and skillFiles will be resolved from this directory.
   * Default: rules/ for rules, skills/ for skills
   */
  resourceDir?: string;
  ruleFiles: Record<string, string>;
  skillFiles?: Record<string, string>;
  /**
   * Default enabled skills for this assistant (skill names from skills/ directory).
   */
  defaultEnabledSkills?: string[];
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  promptsI18n?: Record<string, string[]>;
};

export const ASSISTANT_PRESETS: AssistantPreset[] = [
  {
    id: 'word-creator',
    avatar: '📝',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/word-creator',
    ruleFiles: {
      'en-US': 'word-creator.md',
    },
    defaultEnabledSkills: ['officecli-docx'],
    nameI18n: {
      'en-US': 'Word Creator',
      'pt-BR': 'Criador de Documentos Word',
    },
    descriptionI18n: {
      'en-US':
        'Create, edit, and analyze professional Word documents with officecli. Reports, proposals, letters, memos, and more.',
      'pt-BR':
        'Crie, edite e analise documentos Word profissionais com officecli. Relatórios, propostas, cartas, memorandos e muito mais.',
    },
    promptsI18n: {
      'en-US': [
        'Create a Q1 2026 quarterly report with TOC, financial highlights table, revenue trend chart, and KPI metrics section',
        'Write an academic research paper on machine learning with LaTeX equations, citations, data tables, and bibliography',
        'Create a project status report with DRAFT watermark, color-coded status table, and a Gantt timeline in landscape section',
      ],
      'pt-BR': [
        'Crie um relatório trimestral Q1 2026 com sumário, tabela de destaques financeiros, gráfico de tendência de receita e seção de métricas KPI',
        'Escreva um artigo de pesquisa acadêmica sobre machine learning com equações LaTeX, citações, tabelas de dados e bibliografia',
        'Crie um relatório de status do projeto com marca d\'água RASCUNHO, tabela de status colorida e cronograma Gantt em seção paisagem',
      ],
    },
  },
  {
    id: 'ppt-creator',
    avatar: '📊',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/ppt-creator',
    ruleFiles: {
      'en-US': 'ppt-creator.md',
    },
    defaultEnabledSkills: ['officecli-pptx'],
    nameI18n: {
      'en-US': 'PPT Creator',
      'pt-BR': 'Criador de Apresentações',
    },
    descriptionI18n: {
      'en-US':
        'Create, edit, and analyze professional PowerPoint presentations with officecli. Bold designs, varied layouts, and visual impact.',
      'pt-BR':
        'Crie, edite e analise apresentações PowerPoint profissionais com officecli. Designs arrojados, layouts variados e impacto visual.',
    },
    promptsI18n: {
      'en-US': [
        'Create a 10-slide Kubernetes migration proposal with architecture comparison, cost analysis, and migration timeline',
        'Create a 10-slide SaaS analytics dashboard for a project management tool with user growth charts, conversion funnel, and competitive landscape',
        'Create a 10-slide fintech product roadmap for a digital payment platform with user growth trajectory and investment analysis',
      ],
      'pt-BR': [
        'Crie uma proposta de migração Kubernetes de 10 slides com comparação de arquitetura, análise de custos e cronograma',
        'Crie um dashboard SaaS de 10 slides para ferramenta de gestão de projetos com gráficos de crescimento, funil de conversão e análise competitiva',
        'Crie um roadmap de produto fintech de 10 slides para plataforma de pagamentos digitais com trajetória de crescimento e análise de investimentos',
      ],
    },
  },
  {
    id: 'excel-creator',
    avatar: '📈',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/excel-creator',
    ruleFiles: {
      'en-US': 'excel-creator.md',
    },
    defaultEnabledSkills: ['officecli-xlsx'],
    nameI18n: {
      'en-US': 'Excel Creator',
      'pt-BR': 'Criador de Planilhas Excel',
    },
    descriptionI18n: {
      'en-US':
        'Create, edit, and analyze professional Excel spreadsheets with officecli. Financial models, dashboards, trackers, and data analysis.',
      'pt-BR':
        'Crie, edite e analise planilhas Excel profissionais com officecli. Modelos financeiros, dashboards, rastreadores e análise de dados.',
    },
    promptsI18n: {
      'en-US': [
        'Build a 3-sheet financial dashboard with income statement, revenue breakdown chart, and conditional formatting for variances',
        'Create a sales pipeline tracker with deal stages, weighted pipeline formulas, funnel chart, and rep performance scorecards',
        'Create a budget tracker with cross-sheet variance formulas, budget vs actuals bar chart, and color-coded over-budget highlights',
      ],
      'pt-BR': [
        'Crie um dashboard financeiro de 3 abas com demonstração de resultados, gráfico de receitas e formatação condicional para variações',
        'Crie um rastreador de pipeline de vendas com etapas de negócios, fórmulas de pipeline ponderado, gráfico funil e scorecards de desempenho',
        'Crie um rastreador de orçamento com fórmulas de variação entre abas, gráfico orçado x realizado e destaques coloridos para acima do orçamento',
      ],
    },
  },
  {
    id: 'morph-ppt',
    avatar: '✨',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/morph-ppt',
    ruleFiles: {
      'en-US': 'morph-ppt.md',
    },
    defaultEnabledSkills: ['morph-ppt'],
    nameI18n: {
      'en-US': 'Morph PPT',
      'pt-BR': 'Morph PPT',
    },
    descriptionI18n: {
      'en-US':
        'Create professional Morph-animated presentations with officecli. Supports multiple visual styles and end-to-end workflow from topic to polished slides.',
      'pt-BR':
        'Crie apresentações profissionais com animações Morph via officecli. Suporta múltiplos estilos visuais e fluxo completo do tema aos slides polidos.',
    },
    promptsI18n: {
      'en-US': [
        'Pick a fun topic yourself and create a complete PPT',
        'Create the most beautiful PPT you can imagine, topic is up to you',
        'Create a coffee brand introduction PPT with a minimalist premium feel',
      ],
      'pt-BR': [
        'Escolha um tema interessante e crie uma apresentação completa',
        'Crie o PPT mais bonito que você conseguir imaginar, o tema é sua escolha',
        'Crie uma apresentação de marca de café com visual minimalista e premium',
      ],
    },
  },
  {
    id: 'morph-ppt-3d',
    avatar: '🎬',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/morph-ppt-3d',
    ruleFiles: {
      'en-US': 'morph-ppt-3d.md',
    },
    defaultEnabledSkills: ['morph-ppt-3d', 'morph-ppt'],
    nameI18n: {
      'en-US': '3D Morph PPT',
      'pt-BR': '3D Morph PPT',
    },
    descriptionI18n: {
      'en-US':
        "Turn a GLB 3D model into a cinematic Morph presentation. The model is the visual hero — close-up for details, bird's eye for structure, low angle for drama, with smooth Morph transitions between every shot. Note: 3D models and Morph transitions require Microsoft PowerPoint to display correctly.",
      'pt-BR':
        "Transforme um modelo 3D GLB em uma apresentação Morph cinematográfica. O modelo é o herói visual — close para detalhes, vista aérea para estrutura, ângulo baixo para drama, com transições Morph suaves entre cada cena. Nota: modelos 3D e transições Morph requerem Microsoft PowerPoint para exibição correta.",
    },
    promptsI18n: {
      'en-US': [
        "Use this GLB model to create a product showcase. Content should revolve around the model — what it is, its features, its story. Each slide shows a different angle that matches the topic: close-up for details, bird's eye for structure, dramatic low angle for the climax.",
        'Here is my GLB model. Study it carefully, then create a cinematic presentation where the model is the hero of every frame. I want varied camera work: push in for detail shots, pull back for overview, bleed the model off the edge for dramatic transitions.',
        "Build a presentation around this 3D model that feels like a movie trailer. Big dramatic moments, intimate close-ups, sweeping overview shots. The story should match what the model actually is — don't just add generic text.",
      ],
      'pt-BR': [
        'Use este modelo GLB para criar uma vitrine de produto. O conteúdo deve girar em torno do modelo — o que é, suas características, sua história. Cada slide mostra um ângulo diferente que combina com o tema.',
        'Aqui está meu modelo GLB. Estude-o com cuidado e crie uma apresentação cinematográfica onde o modelo é o herói de cada frame. Quero trabalho de câmera variado: zoom para detalhes, afastamento para visão geral.',
        'Crie uma apresentação em torno deste modelo 3D que pareça um trailer de filme. Momentos dramáticos, close-ups íntimos, tomadas panorâmicas. A história deve combinar com o que o modelo realmente é.',
      ],
    },
  },
  {
    id: 'word-form-creator',
    avatar: '📋',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/word-form-creator',
    ruleFiles: {
      'en-US': 'word-form-creator.md',
    },
    defaultEnabledSkills: ['officecli-word-form'],
    nameI18n: {
      'en-US': 'Word Form Creator',
      'pt-BR': 'Criador de Formulários Word',
    },
    descriptionI18n: {
      'en-US':
        'Build fillable Word forms (.docx) with real content controls, checkbox fields, MERGEFIELD mail-merge placeholders, and document protection — only designated fields are editable, the rest stays locked. HR intakes, surveys, contract / SOW templates, compliance checklists, medical intake.',
      'pt-BR':
        'Crie formulários Word (.docx) preenchíveis com controles de conteúdo reais, campos de caixas de seleção, marcadores MERGEFIELD para mala direta e proteção de documento — apenas os campos designados são editáveis, o restante permanece bloqueado. Formulários de RH, pesquisas, modelos de contrato/SOW, checklists de conformidade, triagem médica.',
    },
    promptsI18n: {
      'en-US': [
        'Build a new-hire onboarding .docx form with fields for full name, start date, department, manager, role-based training checklist, and equipment request checkboxes; only the fields are editable.',
        'Create a SOW contract template .docx with mail-merge placeholders for client name, effective date, scope bullets, total fee, and signature blocks; protect everything except the signature area.',
        'Make a medical intake questionnaire .docx with dropdown for reason of visit, text fields for allergies / current medication, checkbox grid for past conditions, and signature line at the bottom.',
      ],
      'pt-BR': [
        'Crie um formulário .docx de integração de novo funcionário com campos para nome completo, data de início, departamento, gestor, checklist de treinamento e caixas de seleção para solicitação de equipamentos; apenas os campos são editáveis.',
        'Crie um modelo de contrato SOW .docx com marcadores de mala direta para nome do cliente, data de vigência, escopo, honorários totais e blocos de assinatura; proteja tudo exceto a área de assinatura.',
        'Crie um questionário médico .docx com menu suspenso para motivo da consulta, campos de texto para alergias/medicamentos atuais, grade de caixas de seleção para condições anteriores e linha de assinatura ao final.',
      ],
    },
  },
  {
    id: 'pitch-deck-creator',
    avatar: '🎯',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/pitch-deck-creator',
    ruleFiles: {
      'en-US': 'pitch-deck-creator.md',
    },
    defaultEnabledSkills: ['officecli-pitch-deck'],
    nameI18n: {
      'en-US': 'Pitch Deck Creator',
      'pt-BR': 'Criador de Pitch Deck',
    },
    descriptionI18n: {
      'en-US':
        'Build investor pitch decks, product launch presentations, and enterprise sales decks with gradient designs, data charts, competitive tables, team slides, and speaker notes. Supports seed to Series A+ decks.',
      'pt-BR':
        'Crie pitch decks para investidores, apresentações de lançamento de produtos e decks de vendas empresariais com designs em gradiente, gráficos de dados, tabelas competitivas, slides de equipe e notas do apresentador. Suporta decks de seed até Series A+.',
    },
    promptsI18n: {
      'en-US': [
        'Create a 12-slide Series A investor deck for a B2B SaaS data pipeline startup with ARR charts, competitive comparison table, team avatars, and financial projections',
        'Create an 8-slide product launch deck for an AI code review tool with 5 feature icons, before/after comparison, customer satisfaction doughnut chart, and 3-tier pricing table',
        'Create a 10-slide enterprise sales deck for a cybersecurity platform with ROI analysis, radar chart vs competitors, financial impact table, and implementation timeline',
      ],
      'pt-BR': [
        'Crie um pitch deck de 12 slides para investidores Serie A de startup B2B SaaS de pipeline de dados com gráficos ARR, tabela comparativa competitiva, avatares da equipe e projeções financeiras',
        'Crie um deck de lançamento de produto de 8 slides para ferramenta de revisão de código com IA: 5 ícones de recursos, comparação antes/depois, gráfico de satisfação do cliente e tabela de preços em 3 níveis',
        'Crie um deck de vendas empresariais de 10 slides para plataforma de cibersegurança com análise de ROI, gráfico radar vs concorrentes, tabela de impacto financeiro e cronograma de implementação',
      ],
    },
  },
  {
    id: 'dashboard-creator',
    avatar: '📊',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/dashboard-creator',
    ruleFiles: {
      'en-US': 'dashboard-creator.md',
    },
    defaultEnabledSkills: ['officecli-data-dashboard'],
    nameI18n: {
      'en-US': 'Dashboard Creator',
      'pt-BR': 'Criador de Dashboard',
    },
    descriptionI18n: {
      'en-US':
        'Turn CSV or tabular data into polished Excel dashboards with KPI cards, charts linked to live data, sparklines, and conditional formatting. Automatically scales complexity to dataset size — from quick summaries to full analytics panels.',
      'pt-BR':
        'Transforme dados CSV ou tabulares em dashboards Excel polidos com cartões KPI, gráficos vinculados a dados ao vivo, sparklines e formatação condicional. Escala automaticamente a complexidade ao tamanho do conjunto de dados — de resumos rápidos a painéis analíticos completos.',
    },
    promptsI18n: {
      'en-US': [
        'Create a SaaS MRR dashboard with 12 months of sample data — show MRR trend, month-over-month growth, and churn breakdown for a board meeting',
        'Build an e-commerce regional sales dashboard with sample data across 5 regions: revenue by region, weekly trends, and category split',
        'Make a budget-vs-actuals dashboard for 8 departments showing variance indicators and over/under-budget status',
      ],
      'pt-BR': [
        'Crie um dashboard MRR SaaS com 12 meses de dados de exemplo — mostre tendência MRR, crescimento mês a mês e análise de churn para reunião de diretoria',
        'Crie um dashboard regional de vendas e-commerce com dados de 5 regiões: receita por região, tendências semanais e divisão por categoria',
        'Crie um dashboard de orçamento x realizado para 8 departamentos mostrando indicadores de variação e status acima/abaixo do orçamento',
      ],
    },
  },
  {
    id: 'academic-paper',
    avatar: '📚',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/academic-paper',
    ruleFiles: {
      'en-US': 'academic-paper.md',
    },
    defaultEnabledSkills: ['officecli-academic-paper'],
    nameI18n: {
      'en-US': 'Academic Paper',
      'pt-BR': 'Artigo Acadêmico',
    },
    descriptionI18n: {
      'en-US':
        'Create formally structured academic papers, research papers, and white papers with native Word TOC, LaTeX-to-OMML equations, scholarly bibliography (APA/Physics/Chicago), footnotes, multi-column layouts, and paper-type-specific styling.',
      'pt-BR':
        'Crie artigos acadêmicos, artigos de pesquisa e white papers com estrutura formal: sumário nativo do Word, equações LaTeX para OMML, bibliografia acadêmica (APA/Física/Chicago), notas de rodapé, layouts multi-coluna e estilos específicos por tipo de artigo.',
    },
    promptsI18n: {
      'en-US': [
        'Create a white paper on rural EV charging infrastructure with executive summary, data tables, footnotes, CONFIDENTIAL watermark, and professional headers',
        'Write a physics paper on topological insulators with display equations, multi-column abstract, theorem/definition blocks, and landscape figures',
        'Create an APA-style research paper on organizational culture with 3 data tables, endnotes, 15 references with hanging indent, and double spacing',
      ],
      'pt-BR': [
        'Crie um white paper sobre infraestrutura de carregamento de veículos elétricos em áreas rurais com resumo executivo, tabelas de dados, notas de rodapé, marca d\'água CONFIDENCIAL e cabeçalhos profissionais',
        'Escreva um artigo de física sobre isoladores topológicos com equações em destaque, resumo multi-coluna, blocos de teoremas/definições e figuras em paisagem',
        'Crie um artigo de pesquisa no estilo APA sobre cultura organizacional com 3 tabelas de dados, notas de fim, 15 referências com recuo deslocado e espaçamento duplo',
      ],
    },
  },
  {
    id: 'financial-model-creator',
    avatar: '💰',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/financial-model-creator',
    ruleFiles: {
      'en-US': 'financial-model-creator.md',
    },
    defaultEnabledSkills: ['officecli-financial-model'],
    nameI18n: {
      'en-US': 'Financial Model Creator',
      'pt-BR': 'Criador de Modelos Financeiros',
    },
    descriptionI18n: {
      'en-US':
        'Build formula-driven financial models from text prompts: 3-statement models, DCF valuations, cap tables, scenario analyses, sensitivity tables, and debt schedules. All values flow from assumptions through interconnected formula chains.',
      'pt-BR':
        'Construa modelos financeiros orientados a fórmulas a partir de prompts de texto: modelos de 3 demonstrações, avaliações DCF, cap tables, análises de cenários, tabelas de sensibilidade e cronogramas de dívida. Todos os valores fluem de premissas através de cadeias de fórmulas interconectadas.',
    },
    promptsI18n: {
      'en-US': [
        'Build a 3-year SaaS financial model with income statement, balance sheet, cash flow, and dashboard charts',
        'Create a DCF valuation for a manufacturing company with WACC calculation and sensitivity table',
        'Build a cap table with seed and Series A rounds, liquidation preferences, and exit waterfall analysis',
      ],
      'pt-BR': [
        'Construa um modelo financeiro SaaS de 3 anos com demonstração de resultados, balanço patrimonial, fluxo de caixa e gráficos de dashboard',
        'Crie uma avaliação DCF para uma empresa manufatureira com cálculo WACC e tabela de sensibilidade',
        'Construa uma cap table com rodadas seed e Series A, preferências de liquidação e análise de cascata de saída',
      ],
    },
  },
  {
    id: 'email-assistant',
    avatar: '📧',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/email-assistant',
    ruleFiles: {
      'en-US': 'email-assistant.md',
    },
    nameI18n: {
      'en-US': 'Email Assistant',
      'pt-BR': 'Assistente de E-mail',
    },
    descriptionI18n: {
      'en-US':
        'Read, reply, and compose emails via Gmail. Summarizes your inbox, drafts client replies, sends with confirmation, and helps organize your mail.',
      'pt-BR':
        'Leia, responda e redija e-mails via Gmail. Resume sua caixa de entrada, elabora respostas para clientes, envia com confirmação e ajuda a organizar seus e-mails.',
    },
    promptsI18n: {
      'en-US': [
        'Check my inbox and summarize unread emails',
        'Reply to the latest client email professionally',
        'Compose a follow-up email to a meeting from yesterday',
      ],
      'pt-BR': [
        'Verifique minha caixa de entrada e resuma os e-mails não lidos',
        'Responda profissionalmente ao último e-mail do cliente',
        'Redija um e-mail de acompanhamento sobre a reunião de ontem',
      ],
    },
  },
  {
    id: 'calendar-assistant',
    avatar: '📅',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/calendar-assistant',
    ruleFiles: {
      'en-US': 'calendar-assistant.md',
    },
    nameI18n: {
      'en-US': 'Calendar Assistant',
      'pt-BR': 'Assistente de Calendário',
    },
    descriptionI18n: {
      'en-US':
        'Manage your Google Calendar — view your schedule, create and update events, find free slots for meetings, and set reminders.',
      'pt-BR':
        'Gerencie seu Google Agenda — veja sua programação, crie e atualize eventos, encontre horários livres para reuniões e defina lembretes.',
    },
    promptsI18n: {
      'en-US': [
        "Show me today's schedule and flag any conflicts",
        'Schedule a 1-hour client meeting for tomorrow afternoon',
        'Find a free 30-minute slot this week for a team sync',
      ],
      'pt-BR': [
        'Mostre minha agenda de hoje e sinalize quaisquer conflitos',
        'Agende uma reunião de 1 hora com cliente para amanhã à tarde',
        'Encontre um horário livre de 30 minutos esta semana para sincronização da equipe',
      ],
    },
  },
  {
    id: 'cowork',
    avatar: 'cowork.svg',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/cowork',
    ruleFiles: {
      'en-US': 'cowork.md',
    },
    skillFiles: {
      'en-US': 'cowork-skills.md',
    },
    defaultEnabledSkills: ['skill-creator', 'officecli-pptx', 'officecli-docx', 'pdf', 'officecli-xlsx'],
    nameI18n: {
      'en-US': 'Cowork',
      'pt-BR': 'Cowork',
    },
    descriptionI18n: {
      'en-US': 'Autonomous task execution with file operations, document processing, and multi-step workflow planning.',
      'pt-BR':
        'Execução autônoma de tarefas com operações de arquivos, processamento de documentos e planejamento de fluxos de trabalho em várias etapas.',
    },
    promptsI18n: {
      'en-US': [
        'Analyze the current project structure and suggest improvements',
        'Automate the build and deployment process',
        'Extract and summarize key information from all PDF files',
      ],
      'pt-BR': [
        'Analise a estrutura do projeto atual e sugira melhorias',
        'Automatize o processo de build e implantação',
        'Extraia e resuma as informações principais de todos os arquivos PDF',
      ],
    },
  },
  {
    id: 'social-job-publisher',
    avatar: '📣',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/social-job-publisher',
    ruleFiles: {
      'en-US': 'social-job-publisher.md',
    },
    skillFiles: {
      'en-US': 'social-job-publisher-skills.md',
    },
    defaultEnabledSkills: ['xiaohongshu-recruiter', 'x-recruiter'],
    nameI18n: {
      'en-US': 'Social Job Publisher',
      'pt-BR': 'Publicador de Vagas nas Redes Sociais',
    },
    descriptionI18n: {
      'en-US': 'Expand hiring requests into a full JD, images, and publish to social platforms via connectors.',
      'pt-BR':
        'Expanda solicitações de contratação em uma JD completa com imagens e publique em plataformas sociais via conectores.',
    },
    promptsI18n: {
      'en-US': [
        'Create a comprehensive job post for Senior Full-Stack Engineer',
        'Draft an engaging hiring tweet for social media',
        'Create a multi-platform job posting (LinkedIn, X, Redbook)',
      ],
      'pt-BR': [
        'Crie uma publicação de vaga completa para Engenheiro Full-Stack Sênior',
        'Elabore um tweet de contratação atraente para redes sociais',
        'Crie uma publicação de vaga para múltiplas plataformas (LinkedIn, X)',
      ],
    },
  },
  {
    id: 'beautiful-mermaid',
    avatar: '📈',
    presetAgentType: 'gemini',
    resourceDir: 'src/process/resources/assistant/beautiful-mermaid',
    ruleFiles: {
      'en-US': 'beautiful-mermaid.md',
    },
    defaultEnabledSkills: ['mermaid'],
    nameI18n: {
      'en-US': 'Beautiful Mermaid',
      'pt-BR': 'Beautiful Mermaid',
    },
    descriptionI18n: {
      'en-US':
        'Create flowcharts, sequence diagrams, state diagrams, class diagrams, and ER diagrams with beautiful themes.',
      'pt-BR':
        'Crie fluxogramas, diagramas de sequência, diagramas de estado, diagramas de classe e diagramas ER com temas bonitos.',
    },
    promptsI18n: {
      'en-US': [
        'Draw a detailed user login authentication flowchart',
        'Create an API sequence diagram for payment processing',
        'Create a system architecture diagram',
      ],
      'pt-BR': [
        'Desenhe um fluxograma detalhado de autenticação de login do usuário',
        'Crie um diagrama de sequência de API para processamento de pagamentos',
        'Crie um diagrama de arquitetura do sistema',
      ],
    },
  },
];
