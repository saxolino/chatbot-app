
{\rtf1\ansi\ansicpg1252\cocoartf2821
\cocoatextscaling0\cocoaplatform0{\fonttbl}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
}
                                  
onst express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const { Configuration, OpenAIApi } = require("openai"); // Importa OpenAI

const app = express();
const port = process.env.PORT || 5000;

// Serve i file statici della build di React
app.use(express.static(path.join(__dirname, 'build')));
app.use(express.json()); // Middleware per解析 JSON nel body delle richieste

// Sostituisci con la tua stringa di connessione MongoDB Atlas
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

// Connessione al database all'avvio del server
connectToDatabase().catch(() => {
  console.error("Server startup aborted due to DB connection error.");
  process.exit(1);
});

// Configura OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Usa la variabile d'ambiente
  // Oppure, MAI CONSIGLIATO: apiKey: "YOUR_API_KEY",
});
const openai = new OpenAIApi(configuration);

// Funzione per ottenere una risposta da OpenAI
async function getOpenAIResponse(prompt) {
  try {
    const completion = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct", // o un altro modello
      prompt: prompt,
      max_tokens: 200,
      temperature: 0.7,
    });
    return completion.data.choices[0].text.trim();
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return "Si è verificato un errore durante la comunicazione con OpenAI.";
  }
}

// Endpoint per ottenere i prodotti
app.get('/api/products', async (req, res) => {
  try {
    const db = client.db("chatbotDB");
    const products = db.collection("products");
    const allProducts = await products.find().toArray();
    res.json(allProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Endpoint per ottenere una risposta da OpenAI
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const prompt = `User: ${message}\nBot: `;
  const response = await getOpenAIResponse(prompt);
  res.json({ response });
});

// Gestisci tutte le altre richieste reindirizzandole all'index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
