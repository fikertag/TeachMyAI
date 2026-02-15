# teachMyAI 🧠⚒️

**teachMyAI** is a full-stack AI platform that allows service providers to train a domain-specific assistant using their own content.
Providers can create shareable chat pages or integrate the assistant into their own products via API.

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

### Developer Integration

- API access for external apps/websites
- Scoped assistant access via slug
- JSON-based chat responses

### Optional / Future Enhancements

- File uploads (PDF, Markdown)
- Citations & source highlighting
- Streaming responses
- Embeddable chat widget
- Analytics dashboard
- Usage limits & rate limiting

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
- langchain
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
OPENAI_API_KEY=
VECTOR_DB_KEY=
DATABASE_URL=
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
