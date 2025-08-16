const quizData = [
  {
    card: "La CPU es el 'cerebro' de la computadora. Ejecuta instrucciones y coordina todos los componentes.",
    question: "¿Cuál es el papel principal de la CPU en la computadora?",
    options: ["Almacenar datos permanentemente", "Ejecutar instrucciones y coordinar procesos", "Producir energía eléctrica", "Mostrar imágenes en la pantalla"],
    correct: 1
  },
  {
    card: "La RAM almacena datos temporales que el procesador necesita de inmediato. Es volátil: se borra al apagar.",
    question: "¿Qué característica define a la memoria RAM?",
    options: ["Es permanente", "Se borra al apagar la computadora", "Es solo para guardar fotos", "Se conecta a Internet"],
    correct: 1
  },
  {
    card: "Los dispositivos de almacenamiento como SSD y HDD guardan información permanentemente.",
    question: "¿Cuál es la diferencia clave entre SSD y HDD?",
    options: ["El SSD usa memoria flash, el HDD discos giratorios", "El HDD es más rápido que el SSD", "El SSD necesita electricidad para guardar datos", "El HDD no tiene partes mecánicas"],
    correct: 0
  }
];

let current = 0;
const cardEl = document.getElementById("card");
const questionEl = document.getElementById("question-container");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");

function loadQuestion() {
  feedbackEl.textContent = "";
  const q = quizData[current];
  cardEl.textContent = q.card;
  questionEl.textContent = q.question;
  optionsEl.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(i);
    optionsEl.appendChild(btn);
  });
}

function checkAnswer(selected) {
  const q = quizData[current];
  if (selected === q.correct) {
    feedbackEl.textContent = "✅ Correcto: " + q.options[q.correct];
  } else {
    feedbackEl.textContent = "❌ Incorrecto. La respuesta era: " + q.options[q.correct];
  }
  current++;
  if (current < quizData.length) {
    setTimeout(loadQuestion, 1500);
  } else {
    setTimeout(() => {
      cardEl.textContent = "🎉 ¡Has completado el quiz!";
      questionEl.textContent = "";
      optionsEl.innerHTML = "";
    }, 1500);
  }
}

loadQuestion();