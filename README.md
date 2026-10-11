# Adaptive Learning Platform

A modern, full-stack web application built to deliver intelligent, personalized student assessments. The platform features hidden adaptive difficulty tiers, dynamic difficulty-based timers, automated quiz progression, and curated study resource recommendations tailored to real-time performance.

---

## Key Features

* **Adaptive Assessment Engine**: Automatically evaluates student performance and shifts learning paths under the hood without explicitly exposing difficulty tiers to the user.
* **Difficulty-Based Timers**: Intelligent countdown timers that scale dynamically based on question complexity:
  * **5 Minutes** for Remedial / Easy questions
  * **3 Minutes** for Intermediate / Medium questions
  * **1 Minute** for Advanced / Hard questions
  * *Includes auto-advance functionality when the timer expires.*
* **Curated & Verified Resource Links**: Delivers targeted study links (such as GeeksforGeeks and W3Schools) matching the student's performance tier upon quiz completion.
* **Modern UI/UX**: Clean, responsive interface styled with a professional cool-indigo (`#eef2f6`) theme, structured cards, and smooth navigation.

---

## Tech Stack

* **Frontend**: HTML5, CSS3, Vanilla JavaScript (Single-Page Layouts)
* **Backend**: Node.js, Express.js
* **Database**: MySQL

---

## Project Structure

```text
active-learning-platform/
├── public/
│   ├── dashboard.html
│   ├── quiz.html
│   ├── select-topic.html
│   └── index.html
├── routes/
│   └── quizroutes.js
├── server.js
├── package.json
└── README.md
