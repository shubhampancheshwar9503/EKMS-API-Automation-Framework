# 🚀 EKMS API Automation Framework

## 📌 Overview

This project is an API Automation Framework built for testing EKMS services using modern tools and best practices.

It is designed to be scalable, maintainable, and CI/CD ready.

---

## 🛠️ Tech Stack

* JavaScript / Node.js
* Playwright (API Testing)
* Allure Reports
* GitHub Actions (CI/CD)

---

## 📂 Project Structure

* `src/tests` → Test cases
* `src/utils` → Reusable utilities
* `src/config` → Configuration files
* `src/data` → Test data

---

## ▶️ How to Run Tests

```bash
npm install
npx playwright test
```

---

## 📊 Generate Allure Report

```bash
npx allure generate ./allure-results --clean -o ./allure-report
npx allure open ./allure-report
```

---

## 🔄 CI/CD Integration

This project uses GitHub Actions to:

* Run tests automatically
* Ensure build stability
* Maintain code quality

---

## ✅ Best Practices Followed

* Clean folder structure
* Environment-based config
* Reusable utilities
* Report isolation (ignored in Git)

---

## 👨‍💻 Author

Shubham Pancheshwar
