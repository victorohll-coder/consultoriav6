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
  // Bloco Alimentacao
  { id: "q1", bloco: "Alimentacao", texto: "Aderencia ao plano alimentar", tipo: "escala", min: 1, max: 5, minLabel: "Nao segui nada", maxLabel: "Segui tudo" },
  { id: "q2", bloco: "Alimentacao", texto: "Refeicoes fora do plano", tipo: "opcao", opcoes: ["0", "1", "2", "3 ou mais"] },
  { id: "q3", bloco: "Alimentacao", texto: "Nivel de fome ao longo do dia", tipo: "opcao", opcoes: ["Sem fome", "Controlada", "Moderada", "Muita", "Fora de controle"] },
  { id: "q4", bloco: "Alimentacao", texto: "Vontade de doce/industrializados", tipo: "opcao", opcoes: ["Nenhuma", "Pouca", "Moderada", "Muita", "Irresistivel"] },
  // Bloco Treino
  { id: "q5", bloco: "Treino", texto: "Quantas vezes treinou nos ultimos 15 dias", tipo: "opcao", opcoes: ["0", "1-3", "4-6", "7-9", "10+"] },
  { id: "q6", bloco: "Treino", texto: "Intensidade dos treinos", tipo: "escala", min: 1, max: 5, minLabel: "Muito leve", maxLabel: "Muito intenso" },
  { id: "q7", bloco: "Treino", texto: "Progressao de cargas", tipo: "opcao", opcoes: ["Evoluindo bem", "Estavel", "Regredi", "Nao estou treinando"] },
  // Bloco Bem-estar
  { id: "q8", bloco: "Bem-estar", texto: "Nivel de energia no dia a dia", tipo: "escala", min: 1, max: 5, minLabel: "Sem energia", maxLabel: "Muita energia" },
  { id: "q9", bloco: "Bem-estar", texto: "Qualidade do sono", tipo: "opcao", opcoes: ["Otima", "Boa", "Regular", "Ruim", "Pessima"] },
  { id: "q10", bloco: "Bem-estar", texto: "Nivel de estresse", tipo: "opcao", opcoes: ["Baixo", "Moderado", "Alto", "Muito alto"] },
  { id: "q11", bloco: "Bem-estar", texto: "Mudanca no corpo", tipo: "opcao", opcoes: ["Melhora visivel", "Pouca diferenca", "Nenhuma", "Piorei"] },
  // Bloco Feedback
  { id: "q12", bloco: "Feedback", texto: "O que fez bem nos ultimos 15 dias?", tipo: "livre" },
  { id: "q13", bloco: "Feedback", texto: "Qual foi o maior desafio?", tipo: "livre" },
  { id: "q14", bloco: "Feedback", texto: "Duvida ou recado para o nutricionista?", tipo: "livre" },
];

export const BLOCOS = [...new Set(PERGUNTAS.map((p) => p.bloco))];
