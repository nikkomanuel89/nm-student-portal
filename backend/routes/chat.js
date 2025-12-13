// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use the current stable model (gemini-2.5-flash)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const prompt = `You are a friendly and helpful assistant for the NM Student Portal.
You help students and instructors understand how to use the portal.
Be clear, concise, and professional.
Only answer questions related to using the portal.

User question: "${message}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (err) {
    console.error('Gemini error:', err.message || err);
    res.status(500).json({ 
      error: 'AI is temporarily unavailable. Please try again later.' 
    });
  }
});

module.exports = router;