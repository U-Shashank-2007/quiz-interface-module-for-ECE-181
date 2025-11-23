// ====== Storage Keys ======
const KEY_STUDENTS = "quiz_students";
const KEY_TEACHERS = "quiz_teachers";
const KEY_QUIZZES = "quiz_quizzes";
const KEY_ATTEMPTS = "quiz_attempts";
const KEY_CURRENT_STUDENT = "quiz_current_student";
const KEY_CURRENT_TEACHER = "quiz_current_teacher";
const KEY_QUIZ_ID_COUNTER = "quiz_id_counter";
const KEY_ATTEMPT_ID_COUNTER = "quiz_attempt_id_counter";

// In-memory state for teacher creating quiz
let newQuizQuestions = [];

// In-memory state for exam
let currentExamQuiz = null;
let currentExamAnswers = [];
let examTimerInterval = null;
let examTimeLeftSeconds = 0;

// ====== Utility: Storage helpers ======
function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ====== Utility: Sections ======
function showSection(id) {
  const sections = document.querySelectorAll("[data-section]");
  sections.forEach((sec) => {
    if (sec.id === id) sec.classList.remove("hidden");
    else sec.classList.add("hidden");
  });

  // When opening dashboards, refresh data
  if (id === "student-dashboard") {
    renderStudentDashboard();
  }
  if (id === "teacher-dashboard") {
    renderTeacherDashboard();
  }
}

window.showSection = showSection; // expose to HTML buttons

// ====== Student login / logout ======
function handleStudentLogin() {
  const reg = document.getElementById("student-reg").value.trim();
  const name = document.getElementById("student-name").value.trim();

  if (!reg || !name) {
    alert("Please enter registration number and name.");
    return;
  }

  let students = loadJSON(KEY_STUDENTS, []);
  let existing = students.find((s) => s.regNo === reg);

  if (!existing) {
    existing = { regNo: reg, name };
    students.push(existing);
    saveJSON(KEY_STUDENTS, students);
  } else {
    // Optionally update name
    existing.name = name;
    saveJSON(KEY_STUDENTS, students);
  }

  saveJSON(KEY_CURRENT_STUDENT, existing);
  showSection("student-dashboard");
}

window.handleStudentLogin = handleStudentLogin;

function getCurrentStudent() {
  return loadJSON(KEY_CURRENT_STUDENT, null);
}

function studentLogout() {
  localStorage.removeItem(KEY_CURRENT_STUDENT);
  showSection("home");
}

window.studentLogout = studentLogout;

// ====== Teacher login / logout ======
function handleTeacherLogin() {
  const id = document.getElementById("teacher-id").value.trim();
  const name = document.getElementById("teacher-name").value.trim();

  if (!id || !name) {
    alert("Please enter teacher ID and name.");
    return;
  }

  let teachers = loadJSON(KEY_TEACHERS, []);
  let existing = teachers.find((t) => t.teacherId === id);

  if (!existing) {
    existing = { teacherId: id, name };
    teachers.push(existing);
    saveJSON(KEY_TEACHERS, teachers);
  } else {
    existing.name = name;
    saveJSON(KEY_TEACHERS, teachers);
  }

  saveJSON(KEY_CURRENT_TEACHER, existing);
  showSection("teacher-dashboard");
}

window.handleTeacherLogin = handleTeacherLogin;

function getCurrentTeacher() {
  return loadJSON(KEY_CURRENT_TEACHER, null);
}

function teacherLogout() {
  localStorage.removeItem(KEY_CURRENT_TEACHER);
  showSection("home");
}

window.teacherLogout = teacherLogout;

// ====== ID generators ======
function nextQuizId() {
  let v = parseInt(localStorage.getItem(KEY_QUIZ_ID_COUNTER) || "1", 10);
  localStorage.setItem(KEY_QUIZ_ID_COUNTER, String(v + 1));
  return v;
}

function nextAttemptId() {
  let v = parseInt(localStorage.getItem(KEY_ATTEMPT_ID_COUNTER) || "1", 10);
  localStorage.setItem(KEY_ATTEMPT_ID_COUNTER, String(v + 1));
  return v;
}

// ====== Teacher: create quiz ======
function addQuestionToNewQuiz() {
  const text = document.getElementById("q-text").value.trim();
  const a = document.getElementById("q-a").value.trim();
  const b = document.getElementById("q-b").value.trim();
  const c = document.getElementById("q-c").value.trim();
  const d = document.getElementById("q-d").value.trim();
  const correct = parseInt(
    document.getElementById("q-correct").value || "0",
    10
  );
  const expl = document.getElementById("q-expl").value.trim();

  if (!text || !a || !b || !c || !d) {
    alert("Please fill question and all four options.");
    return;
  }

  newQuizQuestions.push({
    id: newQuizQuestions.length + 1,
    text,
    options: [a, b, c, d],
    correctIndex: correct,
    explanation: expl,
  });

  // Clear form
  document.getElementById("q-text").value = "";
  document.getElementById("q-a").value = "";
  document.getElementById("q-b").value = "";
  document.getElementById("q-c").value = "";
  document.getElementById("q-d").value = "";
  document.getElementById("q-expl").value = "";
  document.getElementById("q-correct").value = "0";

  renderNewQuizQuestions();
}

window.addQuestionToNewQuiz = addQuestionToNewQuiz;

function renderNewQuizQuestions() {
  const container = document.getElementById("new-quiz-questions-list");
  if (!container) return;

  if (newQuizQuestions.length === 0) {
    container.innerHTML = "<p class='muted'>No questions added yet.</p>";
    return;
  }

  container.innerHTML = "";
  newQuizQuestions.forEach((q, idx) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>Q${idx + 1}.</strong> ${q.text}<br>
      <span class="muted">
        A: ${q.options[0]} | B: ${q.options[1]} | C: ${q.options[2]} | D: ${
      q.options[3]
    }
      </span><br>
      <span class="muted">Correct: ${
        ["A", "B", "C", "D"][q.correctIndex]
      }</span>
    `;
    container.appendChild(div);
  });
}

function clearNewQuiz() {
  if (!confirm("Clear all questions in this new quiz?")) return;
  newQuizQuestions = [];
  renderNewQuizQuestions();
}

window.clearNewQuiz = clearNewQuiz;

function saveNewQuiz() {
  const title = document.getElementById("quiz-title").value.trim();
  const topic = document.getElementById("quiz-topic").value.trim();
  const duration = parseInt(
    document.getElementById("quiz-duration").value || "17",
    10
  );
  const teacher = getCurrentTeacher();

  if (!teacher) {
    alert("No teacher logged in.");
    showSection("teacher-login");
    return;
  }

  if (!title) {
    alert("Please enter a quiz title.");
    return;
  }
  if (newQuizQuestions.length === 0) {
    alert("Please add at least one question.");
    return;
  }

  const quiz = {
    id: nextQuizId(),
    title,
    topic,
    durationMinutes: duration,
    isLive: false,
    createdBy: teacher.teacherId,
    createdAt: new Date().toISOString(),
    questions: newQuizQuestions.slice(), // copy
  };

  const quizzes = loadJSON(KEY_QUIZZES, []);
  quizzes.push(quiz);
  saveJSON(KEY_QUIZZES, quizzes);

  // Reset new quiz form
  newQuizQuestions = [];
  renderNewQuizQuestions();
  document.getElementById("quiz-title").value = "";
  document.getElementById("quiz-topic").value = "";
  document.getElementById("quiz-duration").value = "17";

  alert("Quiz saved as draft. You can publish it from Dashboard.");
  showSection("teacher-dashboard");
}

window.saveNewQuiz = saveNewQuiz;

// ====== Teacher Dashboard ======
function renderTeacherDashboard() {
  const teacher = getCurrentTeacher();
  const titleEl = document.getElementById("teacher-dashboard-title");
  const listEl = document.getElementById("teacher-quizzes-list");

  if (!teacher) {
    showSection("teacher-login");
    return;
  }

  if (titleEl) {
    titleEl.textContent = `Teacher Dashboard - ${teacher.name}`;
  }

  if (!listEl) return;

  const quizzes = loadJSON(KEY_QUIZZES, []);
  const mine = quizzes.filter((q) => q.createdBy === teacher.teacherId);

  if (mine.length === 0) {
    listEl.innerHTML = "<p class='muted'>No quizzes created yet.</p>";
    return;
  }

  listEl.innerHTML = "";
  mine.forEach((q) => {
    const div = document.createElement("div");
    div.className = "card";
    const badgeClass = q.isLive ? "live" : "draft";
    const badgeText = q.isLive ? "Live" : "Draft";

    div.innerHTML = `
      <div class="row space-between">
        <div>
          <strong>${q.title}</strong><br>
          <span class="muted">${q.topic || "No topic"}</span><br>
          <span class="muted">Duration: ${q.durationMinutes} minutes</span>
        </div>
        <div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
      </div>
      <div class="row">
        <button class="btn secondary" onclick="toggleQuizLive(${q.id})">
          ${q.isLive ? "Close Quiz" : "Make Live"}
        </button>
        <button class="btn" onclick="viewQuizPerformance(${q.id})">
          View Performance
        </button>
      </div>
    `;
    listEl.appendChild(div);
  });
}

function toggleQuizLive(quizId) {
  const quizzes = loadJSON(KEY_QUIZZES, []);
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) return;

  quiz.isLive = !quiz.isLive;
  saveJSON(KEY_QUIZZES, quizzes);

  renderTeacherDashboard();
}

window.toggleQuizLive = toggleQuizLive;

function viewQuizPerformance(quizId) {
  const attempts = loadJSON(KEY_ATTEMPTS, []);
  const quizzes = loadJSON(KEY_QUIZZES, []);
  const students = loadJSON(KEY_STUDENTS, []);

  const quiz = quizzes.find((q) => q.id === quizId);
  const relevant = attempts.filter((a) => a.quizId === quizId);

  if (!quiz) {
    alert("Quiz not found.");
    return;
  }

  if (relevant.length === 0) {
    alert("No attempts yet for this quiz.");
    return;
  }

  // Build a simple summary string
  let msg = `Performance for quiz: ${quiz.title}\n\n`;
  relevant.forEach((a) => {
    const student = students.find((s) => s.regNo === a.studentReg);
    const sName = student ? student.name : a.studentReg;
    msg += `${sName} (${a.studentReg}) - ${a.score}/${a.total} at ${new Date(
      a.submittedAt
    ).toLocaleString()}\n`;
  });

  alert(msg);
}

window.viewQuizPerformance = viewQuizPerformance;

// ====== Student Dashboard ======
function renderStudentDashboard() {
  const student = getCurrentStudent();
  const titleEl = document.getElementById("student-dashboard-title");
  const liveEl = document.getElementById("live-exams-list");
  const pastEl = document.getElementById("past-exams-list");

  if (!student) {
    showSection("student-login");
    return;
  }

  if (titleEl) {
    titleEl.textContent = `Student Dashboard - ${student.name}`;
  }

  const quizzes = loadJSON(KEY_QUIZZES, []);
  const live = quizzes.filter((q) => q.isLive);
  const attempts = loadJSON(KEY_ATTEMPTS, []);
  const mineAttempts = attempts.filter((a) => a.studentReg === student.regNo);

  // Live exams
  if (liveEl) {
    if (live.length === 0) {
      liveEl.innerHTML = "<p class='muted'>No live exams available.</p>";
    } else {
      liveEl.innerHTML = "";
      live.forEach((q) => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
          <strong>${q.title}</strong><span class="badge live">Live</span><br>
          <span class="muted">${q.topic || "No topic"}</span><br>
          <span class="muted">Duration: ${q.durationMinutes} minutes</span>
          <div class="row">
            <button class="btn primary" onclick="startExam(${q.id})">Start Exam</button>
          </div>
        `;
        liveEl.appendChild(div);
      });
    }
  }

  // Past exams
  if (pastEl) {
    if (mineAttempts.length === 0) {
      pastEl.innerHTML = "<p class='muted'>No past exams found.</p>";
    } else {
      pastEl.innerHTML = "";
      mineAttempts
        .sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        )
        .forEach((a) => {
          const quiz = quizzes.find((q) => q.id === a.quizId);
          const div = document.createElement("div");
          div.className = "card";
          div.innerHTML = `
            <strong>${quiz ? quiz.title : "Unknown quiz"}</strong><br>
            <span class="muted">Score: ${a.score}/${a.total}</span><br>
            <span class="muted">${new Date(a.submittedAt).toLocaleString()}</span>
            <div class="row">
              <button class="btn" onclick="viewPastAttempt(${a.id})">View</button>
            </div>
          `;
          pastEl.appendChild(div);
        });
    }
  }
}

function goToStudentDashboard() {
  showSection("student-dashboard");
}

window.goToStudentDashboard = goToStudentDashboard;

// ====== Student: start exam ======
function startExam(quizId) {
  const student = getCurrentStudent();
  if (!student) {
    alert("Please login as student first.");
    showSection("student-login");
    return;
  }

  const quizzes = loadJSON(KEY_QUIZZES, []);
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz || !quiz.isLive) {
    alert("Quiz not available.");
    return;
  }

  currentExamQuiz = quiz;
  currentExamAnswers = new Array(quiz.questions.length).fill(null);

  // Fill exam header
  document.getElementById("exam-title").textContent = quiz.title;
  document.getElementById("exam-topic").textContent =
    quiz.topic || "No topic";

  // Render questions
  const container = document.getElementById("exam-questions");
  container.innerHTML = "";
  quiz.questions.forEach((q, idx) => {
    const div = document.createElement("div");
    div.className = "card exam-question";
    div.innerHTML = `
      <h4>Q${idx + 1}. ${q.text}</h4>
      ${q.options
        .map(
          (opt, optIndex) => `
        <div class="option-row">
          <label>
            <input type="radio" name="q_${idx}" value="${optIndex}" 
              onchange="selectExamAnswer(${idx}, ${optIndex})">
            ${["A", "B", "C", "D"][optIndex]}. ${opt}
          </label>
        </div>
      `
        )
        .join("")}
    `;
    container.appendChild(div);
  });

  // Start timer
  if (examTimerInterval) clearInterval(examTimerInterval);
  examTimeLeftSeconds = quiz.durationMinutes * 60;
  updateTimerDisplay();

  examTimerInterval = setInterval(() => {
    examTimeLeftSeconds--;
    if (examTimeLeftSeconds <= 0) {
      clearInterval(examTimerInterval);
      examTimeLeftSeconds = 0;
      updateTimerDisplay();
      alert("Time is up. Auto-submitting your exam.");
      submitCurrentExam();
    } else {
      updateTimerDisplay();
    }
  }, 1000);

  showSection("student-exam");
}

window.startExam = startExam;

function selectExamAnswer(qIndex, optIndex) {
  currentExamAnswers[qIndex] = optIndex;
}

window.selectExamAnswer = selectExamAnswer;

function updateTimerDisplay() {
  const el = document.getElementById("exam-timer");
  if (!el) return;
  const m = Math.floor(examTimeLeftSeconds / 60);
  const s = examTimeLeftSeconds % 60;
  el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ====== Student: submit exam ======
function submitCurrentExam() {
  if (!currentExamQuiz) {
    alert("No exam in progress.");
    return;
  }

  if (examTimerInterval) {
    clearInterval(examTimerInterval);
    examTimerInterval = null;
  }

  const student = getCurrentStudent();
  if (!student) {
    alert("No student logged in.");
    showSection("student-login");
    return;
  }

  const quiz = currentExamQuiz;
  let score = 0;
  const total = quiz.questions.length;

  quiz.questions.forEach((q, idx) => {
    if (currentExamAnswers[idx] === q.correctIndex) score++;
  });

  // Save attempt
  const attempts = loadJSON(KEY_ATTEMPTS, []);
  const attempt = {
    id: nextAttemptId(),
    quizId: quiz.id,
    studentReg: student.regNo,
    answers: currentExamAnswers.slice(),
    score,
    total,
    submittedAt: new Date().toISOString(),
  };
  attempts.push(attempt);
  saveJSON(KEY_ATTEMPTS, attempts);

  // Show result + solutions
  renderResultScreen(quiz, attempt);

  // Clear current exam
  currentExamQuiz = null;
  currentExamAnswers = [];
}

window.submitCurrentExam = submitCurrentExam;

function renderResultScreen(quiz, attempt) {
  const summaryEl = document.getElementById("result-summary");
  const detailsEl = document.getElementById("result-details");

  if (summaryEl) {
    summaryEl.textContent = `You scored ${attempt.score} out of ${attempt.total}.`;
  }

  if (detailsEl) {
    detailsEl.innerHTML = "";
    quiz.questions.forEach((q, idx) => {
      const div = document.createElement("div");
      div.className = "card";
      const studentAns = attempt.answers[idx];
      const correctAns = q.correctIndex;
      const isCorrect = studentAns === correctAns;

      const studentAnsLabel =
        studentAns === null
          ? "Not answered"
          : `${["A", "B", "C", "D"][studentAns]}. ${q.options[studentAns]}`;
      const correctAnsLabel = `${["A", "B", "C", "D"][correctAns]}. ${
        q.options[correctAns]
      }`;

      div.innerHTML = `
        <strong>Q${idx + 1}.</strong> ${q.text}<br>
        <span class="${
          isCorrect ? "result-correct" : "result-wrong"
        }"><strong>Your answer:</strong> ${studentAnsLabel}</span><br>
        <span class="result-correct"><strong>Correct answer:</strong> ${correctAnsLabel}</span><br>
        <span class="muted"><strong>Explanation:</strong> ${
          q.explanation || "No explanation provided."
        }</span>
      `;
      detailsEl.appendChild(div);
    });
  }

  showSection("student-result");
}

// ====== Student: view past attempt ======
function viewPastAttempt(attemptId) {
  const attempts = loadJSON(KEY_ATTEMPTS, []);
  const quizzes = loadJSON(KEY_QUIZZES, []);
  const attempt = attempts.find((a) => a.id === attemptId);
  if (!attempt) {
    alert("Attempt not found.");
    return;
  }
  const quiz = quizzes.find((q) => q.id === attempt.quizId);
  if (!quiz) {
    alert("Quiz not found.");
    return;
  }

  const container = document.getElementById("past-attempt-details");
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <strong>${quiz.title}</strong><br>
      <span class="muted">Score: ${attempt.score}/${attempt.total}</span><br>
      <span class="muted">Submitted at: ${new Date(
        attempt.submittedAt
      ).toLocaleString()}</span>
    </div>
  `;

  quiz.questions.forEach((q, idx) => {
    const div = document.createElement("div");
    div.className = "card";
    const studentAns = attempt.answers[idx];
    const correctAns = q.correctIndex;

    const studentAnsLabel =
      studentAns === null
        ? "Not answered"
        : `${["A", "B", "C", "D"][studentAns]}. ${q.options[studentAns]}`;
    const correctAnsLabel = `${["A", "B", "C", "D"][correctAns]}. ${
      q.options[correctAns]
    }`;
    const isCorrect = studentAns === correctAns;

    div.innerHTML = `
      <strong>Q${idx + 1}.</strong> ${q.text}<br>
      <span class="${
        isCorrect ? "result-correct" : "result-wrong"
      }"><strong>Your answer:</strong> ${studentAnsLabel}</span><br>
      <span class="result-correct"><strong>Correct answer:</strong> ${correctAnsLabel}</span><br>
      <span class="muted"><strong>Explanation:</strong> ${
        q.explanation || "No explanation provided."
      }</span>
    `;
    container.appendChild(div);
  });

  showSection("student-past");
}

window.viewPastAttempt = viewPastAttempt;

// ====== Initial load ======
document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  const teacher = getCurrentTeacher();

  if (student) {
    showSection("student-dashboard");
  } else if (teacher) {
    showSection("teacher-dashboard");
  } else {
    showSection("home");
  }
});
