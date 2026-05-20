// Seed data: Completo e estruturado de acordo com a incidência do ENEM
const seedData = [
  // ==========================================
  // 1. ELETRODINÂMICA (~21%)
  // ==========================================
  // 🔥 Prioridade máxima
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Corrente elétrica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Tensão (DDP)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Potência elétrica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Energia elétrica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Lei de Ohm', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Potência no resistor', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Associação de resistores em série', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Associação de resistores in paralelo', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Associação mista de resistores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Revisão de eletrodinâmica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // 🔥 Estude depois
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Média', title: 'Carga elétrica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Média', title: 'Segunda Lei de Ohm (resistividade)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Média', title: 'Amperímetro e voltímetro', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Média', title: 'Leis de Kirchhoff (básico)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ✅ Só ver superficialmente
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Geradores elétricos', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Associação de geradores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Circuito gerador-resistor', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Receptores elétricos', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Geradores + receptores + resistores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ❌ Só estudar se sobrar MUITO tempo
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Ponte de Wheatstone', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Capacitores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Associação de capacitores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Demonstração de fórmulas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Exercícios avançados de Kirchhoff', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },

  // ==========================================
  // 2. TERMOLOGIA + CALORIMETRIA (~16%)
  // ==========================================
  // 🔥 Prioridade máxima
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Conceitos fundamentais', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Escalas térmicas (Celsius, Fahrenheit, Kelvin)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Quantidade de calor e calor específico', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Calor latente', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Trocas de calor sem mudança de fase', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Trocas de calor com mudança de fase', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Mudanças de estado', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Propagação de calor — condução', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Propagação de calor — convecção e irradiação', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // 🔥 Estude depois
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Dilatação térmica dos sólidos', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Dilatação térmica dos líquidos', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Transformações gasosas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Equação geral dos gases', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: '1ª Lei da Termodinâmica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Máquinas térmicas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ✅ Só ver superficialmente
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Baixa', title: 'Energia interna dos gases', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Baixa', title: 'Trabalho nas transformações gasosas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Baixa', title: 'Equação de Clapeyron', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Baixa', title: 'Transformações adiabáticas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ❌ Só estudar se sobrar MUITO tempo
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Muito Baixa', title: 'Ciclo de Carnot', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Muito Baixa', title: '2ª Lei da Termodinâmica avançada', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Muito Baixa', title: 'Entropia', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },

  // ==========================================
  // 3. ONDULATÓRIA (~14%)
  // ==========================================
  // 🔥 Prioridade máxima
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Conceitos iniciais', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Equação fundamental (v = fλ)', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Reflexão e refração de ondas', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Som no cotidiano / interpretação', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Acústica — conceitos fundamentais', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Timbre, altura e nível sonoro', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Efeito Doppler (ambulância/sirene)', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // 🔥 Estude depois
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Média', title: 'Ondas eletromagnéticas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Média', title: 'Tsunami / aplicações do som', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Média', title: 'Interferência', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Média', title: 'Ressonância', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ✅ Só ver superficialmente
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Baixa', title: 'Cordas sonoras', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Baixa', title: 'Tubos sonoros', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Baixa', title: 'Difração', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ❌ Só estudar se sobrar MUITO tempo
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Muito Baixa', title: 'Polarização', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Muito Baixa', title: 'Experimento de Young', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Muito Baixa', title: 'MHS (Movimento Harmônico Simples)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Muito Baixa', title: 'Equação de Taylor em cordas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null }
];

export default seedData;