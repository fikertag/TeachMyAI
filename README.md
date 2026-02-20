# teachMyAI 🧠⚒️

**teachMyAI** is a full-stack AI platform that allows service providers to train a domain-specific assistant using their own content.
Providers can create shareable chat pages or integrate the assistant into their own products via API or widget script.

The system uses Retrieval-Augmented Generation (RAG) to ensure responses are grounded in provider-supplied knowledge rather than generic model output.

---

## ✨ Features

### Core

- Create service-specific AI assistants
- Input or upload knowledge content
- Automatic indexing & embedding
- Public shareable chat pages
  `/{slug}`
- Context-grounded responses
- customize the apperance of ai chat
- add a system prompt
- react components to integrate ai quickly to react website and to see clear example on how to integrate

### Developer Integration

- API access for external apps/websites
- Scoped assistant access via slug
- JSON-based chat responses
- Embeddable chat widget

---

## 🏗️ Architecture Overview

User Content → Chunking → Embeddings → Vector Store
↓
User Question → Retrieval → Prompt Assembly → LLM → Response

---

## 🧰 Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- gemini

**Database**

- MongoDB

## 🚀 Getting Started

### 1️⃣ Clone

```bash
git clone https://github.com/fikertag/TeachMyAI
cd teachMyAI
```

### 2️⃣ Install

```bash
npm install
```

### 3️⃣ Environment

Create `.env.local`

```
MONGODB_URI=mongodb+srv://
BETTER_AUTH_SECRET=06N...
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=...
GEMINI_API_KEY=AIz...

```

### 4️⃣ Run

```bash
npm run dev
```

## 👨‍💻 Author

Built by Fiker Yilkal
Full-Stack Developer

---

## 📜 License

MIT
