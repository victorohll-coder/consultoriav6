export interface CampoAnamnese {
  id: string;
  label: string;
  tipo: "textarea" | "opcao" | "escala";
  bloco: string;
  opcoes?: string[];
  placeholder?: string;
}

export const CAMPOS_ANAMNESE: CampoAnamnese[] = [
  // === BLOCO 1: OBJETIVOS E MOTIVAÇÃO ===
  { id: "objetivo", label: "Qual é o seu principal objetivo com esse acompanhamento?", tipo: "textarea", bloco: "Objetivos e Motivação", placeholder: "Ex: emagrecer, ganhar massa, melhorar saúde..." },
  { id: "peso_desejado", label: "Qual peso ou composição corporal você gostaria de alcançar?", tipo: "textarea", bloco: "Objetivos e Motivação", placeholder: "Ex: chegar em 70kg, perder 10kg, definir abdômen..." },
  { id: "prazo", label: "Em quanto tempo você espera alcançar esse resultado?", tipo: "opcao", bloco: "Objetivos e Motivação", opcoes: ["1 a 3 meses", "3 a 6 meses", "6 meses a 1 ano", "Mais de 1 ano", "Não tenho prazo definido"] },
  { id: "comprometimento", label: "De 1 a 10, qual o seu nível de comprometimento para alcançar esse objetivo?", tipo: "escala", bloco: "Objetivos e Motivação" },
  { id: "tentativas", label: "Quantas vezes você já tentou emagrecer ou mudar seu corpo nos últimos anos?", tipo: "opcao", bloco: "Objetivos e Motivação", opcoes: ["Nunca tentei", "1 a 2 vezes", "3 a 5 vezes", "Mais de 5 vezes", "Perdi a conta"] },
  { id: "porque_agora", label: "Por que decidiu buscar ajuda profissional agora e não antes?", tipo: "textarea", bloco: "Objetivos e Motivação", placeholder: "O que mudou na sua vida que te trouxe até aqui?" },

  // === BLOCO 2: HISTÓRICO DE SAÚDE ===
  { id: "doencas", label: "Possui alguma doença ou condição médica diagnosticada?", tipo: "textarea", bloco: "Histórico de Saúde", placeholder: "Ex: diabetes, hipertensão, tireoide, ansiedade..." },
  { id: "medicamentos", label: "Quais medicamentos ou suplementos utiliza atualmente?", tipo: "textarea", bloco: "Histórico de Saúde", placeholder: "Liste todos, incluindo dosagem se souber" },
  { id: "cirurgias", label: "Já fez alguma cirurgia ou procedimento relevante?", tipo: "textarea", bloco: "Histórico de Saúde", placeholder: "Ex: bariátrica, apendicite, ortopédica..." },
  { id: "familia", label: "Alguém na sua família tem diabetes, obesidade, hipertensão ou colesterol alto?", tipo: "textarea", bloco: "Histórico de Saúde", placeholder: "Ex: mãe com diabetes, pai com pressão alta..." },
  { id: "restricoes", label: "Tem alguma restrição alimentar, alergia ou intolerância?", tipo: "textarea", bloco: "Histórico de Saúde", placeholder: "Ex: lactose, glúten, frutos do mar..." },

  // === BLOCO 3: ALIMENTAÇÃO ATUAL ===
  { id: "refeicoes_dia", label: "Quantas refeições você faz por dia normalmente?", tipo: "opcao", bloco: "Alimentação Atual", opcoes: ["1 a 2", "3 a 4", "5 a 6", "Mais de 6", "Não tenho rotina fixa"] },
  { id: "cafe_manha", label: "O que costuma comer no café da manhã?", tipo: "textarea", bloco: "Alimentação Atual", placeholder: "Descreva ou diga se pula essa refeição" },
  { id: "beliscos", label: "Com que frequência belisca fora das refeições principais?", tipo: "opcao", bloco: "Alimentação Atual", opcoes: ["Raramente", "Algumas vezes por semana", "Todo dia", "Várias vezes ao dia"] },
  { id: "agua_diaria", label: "Quanta água você bebe por dia?", tipo: "opcao", bloco: "Alimentação Atual", opcoes: ["Menos de 1 litro", "1 a 2 litros", "2 a 3 litros", "Mais de 3 litros"] },
  { id: "alcool", label: "Com que frequência consome bebida alcoólica?", tipo: "opcao", bloco: "Alimentação Atual", opcoes: ["Não bebo", "Socialmente (1-2x mês)", "Semanalmente", "Várias vezes por semana"] },
  { id: "dietas_passadas", label: "Já seguiu alguma dieta ou protocolo alimentar antes? Qual e como foi?", tipo: "textarea", bloco: "Alimentação Atual", placeholder: "Ex: low carb, jejum, cetogênica... Funcionou? Porque parou?" },
  { id: "nao_come_gosto", label: "Quais alimentos você não come por gosto pessoal? (não por alergia ou intolerância)", tipo: "textarea", bloco: "Alimentação Atual", placeholder: "Ex: beterraba, fígado, quiabo, berinjela..." },

  // === BLOCO 4: TREINO E ATIVIDADE FÍSICA ===
  { id: "treina_atualmente", label: "Você treina atualmente?", tipo: "opcao", bloco: "Treino e Atividade Física", opcoes: ["Sim, regularmente", "Sim, mas irregular", "Parei recentemente", "Não treino há muito tempo", "Nunca treinei"] },
  { id: "tipo_treino", label: "Que tipo de treino você faz ou pretende fazer?", tipo: "textarea", bloco: "Treino e Atividade Física", placeholder: "Ex: musculação, funcional, crossfit, corrida, natação..." },
  { id: "frequencia_treino", label: "Quantas vezes por semana treina ou pretende treinar?", tipo: "opcao", bloco: "Treino e Atividade Física", opcoes: ["1 a 2 vezes", "3 a 4 vezes", "5 a 6 vezes", "Todos os dias"] },
  { id: "cardio", label: "Faz ou pretende incluir aeróbico/cardio na rotina?", tipo: "opcao", bloco: "Treino e Atividade Física", opcoes: ["Sim, já faço", "Quero começar", "Não gosto mas posso tentar", "Não pretendo"] },
  { id: "lesoes", label: "Tem alguma lesão, dor ou limitação física que atrapalhe o treino?", tipo: "textarea", bloco: "Treino e Atividade Física", placeholder: "Ex: dor no joelho, hérnia de disco, tendinite..." },
  { id: "problemas_exercicio", label: "Tem algum problema ao executar algum exercício específico? Qual exercício e descreva o problema.", tipo: "textarea", bloco: "Treino e Atividade Física", placeholder: "Ex: dor no ombro ao fazer supino, desconforto no joelho ao agachar, formigamento ao correr..." },

  // === BLOCO 5: ROTINA E BEM-ESTAR ===
  { id: "sono_horas", label: "Quantas horas dorme por noite em média?", tipo: "opcao", bloco: "Rotina e Bem-estar", opcoes: ["Menos de 5h", "5 a 6h", "6 a 7h", "7 a 8h", "Mais de 8h"] },
  { id: "sono_qualidade", label: "Como avalia a qualidade do seu sono?", tipo: "opcao", bloco: "Rotina e Bem-estar", opcoes: ["Ótima", "Boa", "Regular", "Ruim", "Péssima"] },
  { id: "estresse", label: "Qual o seu nível de estresse no dia a dia?", tipo: "opcao", bloco: "Rotina e Bem-estar", opcoes: ["Baixo", "Moderado", "Alto", "Muito alto"] },
  { id: "rotina_trabalho", label: "Como é a sua rotina de trabalho?", tipo: "textarea", bloco: "Rotina e Bem-estar", placeholder: "Horários, se fica sentado ou em pé, se viaja muito..." },
  { id: "emocional_comida", label: "Você sente que come por ansiedade, tédio ou emocional?", tipo: "opcao", bloco: "Rotina e Bem-estar", opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] },

  // === BLOCO 6: EXPECTATIVAS E COMPROMISSO ===
  { id: "maior_dificuldade", label: "Qual a sua maior dificuldade quando tenta seguir um plano alimentar?", tipo: "textarea", bloco: "Expectativas e Compromisso", placeholder: "Ex: rotina corrida, falta de preparo, comer fora..." },
  { id: "ja_desistiu", label: "O que te fez desistir nas tentativas anteriores?", tipo: "textarea", bloco: "Expectativas e Compromisso", placeholder: "Identificar isso vai te ajudar a não repetir o padrão" },
  { id: "resultado_sonho", label: "Imagine que daqui 6 meses deu tudo certo. Como você se vê?", tipo: "textarea", bloco: "Expectativas e Compromisso", placeholder: "Descreva como estaria seu corpo, sua energia, sua confiança..." },
  { id: "recado_nutri", label: "Tem algo mais que gostaria que eu soubesse sobre você?", tipo: "textarea", bloco: "Expectativas e Compromisso", placeholder: "Pode ser qualquer coisa que ache relevante" },
];

export const BLOCOS_ANAMNESE = [...new Set(CAMPOS_ANAMNESE.map((c) => c.bloco))];
