import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import "dotenv/config";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const MODEL = "deepseek-flash";
const OUTPUT_DIR = "guide";

// Start with 3 chapters to test the setup.
// You can expand this list to all 95 later!
const CHAPTERS = [
  {
    slug: "chapter-01-tcguard",
    title: "TCGuard — The 0.0ms Handshake Analysis Engine",
    context: "TCGuard is an all-in-one security plugin. Its anti-bot feature measures packet timestamp intervals at the Netty level to detect bots before login. It also has subnet limiting and dynamic attack mode.",
  },
  {
    slug: "chapter-02-exploit-shield",
    title: "ExploitShield — The Hamster Engine",
    context: "ExploitShield uses a custom Netty handler per player, real-time behavioral monitoring, burst packet detection, and abnormal packet rate analysis.",
  },
  {
    slug: "chapter-03-novaac",
    title: "NovaAC — Hybrid Packet & Physics Simulation",
    context: "NovaAC combines packet analysis with server-side physics simulation for movement validation, using PacketEvents for timing and order checks.",
  },
];

async function generateChapter(chapter) {
  console.log(`Generating: ${chapter.title}`);
  
  const prompt = `Write a deeply technical, code-level chapter for an engineering guide on Minecraft anti-bot systems.
Chapter title: ${chapter.title}
Background context you must use: ${chapter.context}
Requirements:
- Minimum 3500 words.
- Include real Java or relevant code examples, explained line by line.
- Include file structures, class diagrams in ASCII, and configuration examples.
- Explain the exact mechanism, not just what it does.
- Cover edge cases, failure modes, and how the system is bypassed.
- Use Markdown headings, code blocks, and tables.
- Do not include a generic introduction to anti-bots. Assume the reader already read Volumes 1 and 2 on Sonar and LimboFilter.`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a senior systems engineer writing an in-depth technical reference on Minecraft server security. Your output is precise, code-heavy, and exhaustive. You never summarize when you can elaborate." },
        { role: "user", content: prompt }
      ],
      max_tokens: 8192,
      temperature: 0.4,
    });

    const content = response.choices[0].message.content;
    const filePath = path.join(OUTPUT_DIR, `${chapter.slug}.md`);
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(filePath, `# ${chapter.title}\n\n${content}\n`, "utf-8");
    console.log(`✓ Wrote ${filePath}`);
  } catch (err) {
    console.error(`Failed ${chapter.slug}:`, err.message);
  }
}

async function main() {
  for (const chapter of CHAPTERS) {
    await generateChapter(chapter);
    // Wait 2 seconds between chapters to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("All chapters written. Pushing to GitHub...");
  try {
    execSync("git add .", { stdio: "inherit" });
    execSync(`git commit -m "Generate anti-bot guide chapters"`, { stdio: "inherit" });
    execSync("git push", { stdio: "inherit" });
    console.log("--- GUIDE GENERATION COMPLETE ---");
  } catch (err) {
    console.error("Git push failed:", err.message);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
