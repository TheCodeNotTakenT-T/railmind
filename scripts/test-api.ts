import { config } from "dotenv";
config({ path: ".env.local" });
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

async function run() {
  console.log("Testing Groq API with model llama-3.3-70b-versatile...");
  try {
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: "Say hello!",
    });
    console.log("Success! Response:", text);
  } catch (err: any) {
    console.error("Error calling Groq llama-3.3-70b-versatile:", err.message);
  }
}

run().catch(console.error);
