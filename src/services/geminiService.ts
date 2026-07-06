import { GoogleGenAI } from "@google/genai";
import { BARBERS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getBarberAssistantResponse(userMessage: string, history: any[]) {
  const barberDataString = BARBERS.map((b, i) => 
    `${i + 1}. ${b.name} — ${b.specialty} — ${b.experience} ans d'expérience — Note : ${b.rating}/5 — ${b.clients} clients — Prix : ${b.price} DH — Localisation : ${['Maarif', 'Anfa', 'Gauthier', 'Bourgogne'][i]}`
  ).join('\n');

  const systemInstruction = `Tu es l'assistant IA de BarberGo, une plateforme de mise en relation avec des coiffeurs au Maroc (principalement Casablanca).
Réponds en français, de manière élégante, concise et utile (3 phrases maximum).
Tu dois recommander un ou plusieurs coiffeurs de la liste ci-dessous selon les besoins exprimés par l'utilisateur (type de coupe, budget, genre, expertise).

Voici les coiffeurs disponibles actuellement :
${barberDataString}

CONSIGNES :
1. Sois chaleureux mais professionnel.
2. Si un utilisateur demande une coupe spécifique (ex: dégradé), oriente-le vers le spécialiste (ex: Karim).
3. Si un utilisateur a un petit budget, suggère le moins cher (ex: Yassine).
4. Mets les noms des coiffeurs en **gras**.
5. Ne cite que les coiffeurs pertinents.
`;

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: systemInstruction,
    },
    history: history
  });

  const result = await chat.sendMessage({ message: userMessage });
  return result.text;
}
