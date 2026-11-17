# প্রজেক্ট সেটআপ ও রান করার সম্পূর্ণ নির্দেশিকা (Setup Guide in Bangla)

এই ফাইলটিতে **Smart Workforce & Task Allocation System** (Express + SQLite API এবং React Frontend) প্রজেক্টটি লোকাল পিসিতে CMD (Command Prompt) বা PowerShell দিয়ে সেটআপ এবং রান করার ধাপগুলো সহজ বাংলায় তুলে ধরা হলো।

---

## ১ম ধাপ: ডিপেন্ডেন্সি ইন্সটল করা (Setup)

Command Prompt (CMD) ওপেন করে প্রজেক্ট ফোল্ডারে যান:

```cmd
cd "C:\Users\DEll\OneDrive\Desktop\smart_workflow-master"
```

রুট, ব্যাকএন্ড ও ফ্রন্টএন্ডের সব প্রয়োজনীয় প্যাকেজ একসাথে ইন্সটল করতে নিচের কমান্ডটি রান করুন:

```cmd
npm run setup
```

*(অথবা আলাদা আলাদা ফোল্ডারে গিয়ে `npm install` করতে পারেন)*

---

## ২য় ধাপ: প্রজেক্ট রান করা (Run Project)

### সহজ পদ্ধতি (এক সাথে ব্যাকএন্ড ও ফ্রন্টএন্ড রান):
প্রজেক্টের রুট ফোল্ডার থেকেই কমান্ড দিন:

```cmd
npm run dev
```

এতে স্বয়ংক্রিয়ভাবে:
- **Backend API Server:** `http://localhost:5000` এ চালু হবে
- **Frontend Web App:** `http://localhost:5173` এ চালু হবে

---

### বিকল্প পদ্ধতি (আলাদা আলাদা টার্মিনালে রান):

**১. ব্যাকএন্ড (Backend Server):**
একটি CMD উইন্ডোতে লিখুন:
```cmd
cd "C:\Users\DEll\OneDrive\Desktop\smart_workflow-master\backend"
npm run dev
```

**২. ফ্রন্টএন্ড (Frontend React App):**
আরেকটি নতুন CMD উইন্ডোতে লিখুন:
```cmd
cd "C:\Users\DEll\OneDrive\Desktop\smart_workflow-master\frontend"
npm run dev
```

---

## ৩য় ধাপ: ব্রাউজারে দেখা ও লগইন করা

ব্রাউজার (Chrome / Edge) ওপেন করে এই লিঙ্কে যান:
👉 **`http://localhost:5173`**

### টেস্ট অ্যাকাউন্টসমূহ (Login Credentials):

- **Super Administrator Login:**
  - Email: `admin@smartworkflow.org`
  - Password: `password123`

- **Employee Login:**
  - Email: `john.doe@smartworkflow.org`
  - Password: `password123`

---

## প্রয়োজনীয় অন্যান্য কমান্ড (দরকার হলে):

- ডেটাবেজ রিসেট করতে চাইলে:
  ```cmd
  npm run db:reset
  ```
- ব্যাকএন্ড টেস্ট রান করতে চাইলে:
  ```cmd
  npm test
  ```
