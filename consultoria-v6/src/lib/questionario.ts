export interface Pergunta {
  id: string;
  bloco: string;
  texto: string;
  tipo: "escala" | "opcao" | "livre";
  opcoes?: string[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
}

export const PERGUNTAS: Pergunta[] = [
  // Bloco Alimentação
  { id: "q1", bloco: "Alimentação", texto: "Aderência ao plano alimentar", tipo: "escala", min: 1, max: 5, minLabel: "Não segui nada", maxLabel: "Segui tudo" },
  { id: "q2", bloco: "Alimentação", texto: "Refeições fora do plano", tipo: "opcao", opcoes: ["0", "1", "2", "3 ou mais"] },
  { id: "q3", bloco: "Alimentação", texto: "Nível de fome ao longo do dia", tipo: "opcao", opcoes: ["Sem fome", "Controlada", "Moderada", "Muita", "Fora de controle"] },
  { id: "q4", bloco: "Alimentação", texto: "Vontade de doces e beliscos ao longo do dia", tipo: "opcao", opcoes: ["Nenhuma", "Pouca", "Moderada", "Muita", "Irresistível"] },
  // Bloco Treino
  { id: "q5", bloco: "Treino", texto: "Quantas vezes tem treinado por semana?", tipo: "opcao", opcoes: ["0", "1-2", "3-4", "5-6", "7+"] },
  { id: "q5b", bloco: "Treino", texto: "Quantos cardios tem feito por semana?", tipo: "opcao", opcoes: ["0", "1-2", "3-4", "5-6", "7+"] },
  { id: "q6", bloco: "Treino", texto: "Intensidade dos treinos", tipo: "escala", min: 1, max: 5, minLabel: "Muito leve", maxLabel: "Muito intenso" },
  { id: "q7", bloco: "Treino", texto: "Progressão de cargas", tipo: "opcao", opcoes: ["Evoluindo bem", "Estável", "Regredi", "Não estou treinando", "Não reparei/cuidei"] },
  // Bloco Bem-estar
  { id: "q8", bloco: "Bem-estar", texto: "Nível de energia no dia a dia", tipo: "escala", min: 1, max: 5, minLabel: "Sem energia", maxLabel: "Muita energia" },
  { id: "q9", bloco: "Bem-estar", texto: "Qualidade do sono", tipo: "opcao", opcoes: ["Ótima", "Boa", "Regular", "Ruim", "Péssima"] },
  { id: "q10", bloco: "Bem-estar", texto: "Nível de estresse", tipo: "opcao", opcoes: ["Baixo", "Moderado", "Alto", "Muito alto"] },
  { id: "q11", bloco: "Bem-estar", texto: "Mudança no corpo", tipo: "opcao", opcoes: ["Melhora visível", "Pouca diferença", "Nenhuma", "Piorei"] },
  { id: "q11b", bloco: "Bem-estar", texto: "Quantidade de água que está bebendo por dia", tipo: "opcao", opcoes: ["Menos de 1L", "1L a 2L", "2L a 3L", "Mais de 3L"] },
  // Bloco Feedback
  { id: "q12", bloco: "Feedback", texto: "O que fez bem nos últimos 15 dias?", tipo: "livre" },
  { id: "q13", bloco: "Feedback", texto: "Qual foi o maior desafio?", tipo: "livre" },
  { id: "q14", bloco: "Feedback", texto: "Dúvida ou recado para o nutricionista?", tipo: "livre" },
];

export const BLOCOS = [...new Set(PERGUNTAS.map((p) => p.bloco))];
