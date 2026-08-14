"""
build.py — RAG Agent with Grounding & Memory (AI Arena tile #3)
==============================================================

Dev-time artifact, portfolio surface. NOT called by the running Next.js app —
it's an interactive terminal chat that proves the tile works end to end.

WHAT IT TALKS TO
  A Foundry-hosted agent ("rag-agent", gpt-4.1-nano) with an Azure AI Search tool
  attached, pointing at the `ai-arena-rag` index (built once via the portal's
  "Import and vectorize data" wizard over corpus/). Retrieval, grounding, and
  citations happen INSIDE the agent — this script just streams the chat.

  Model note: the agent runs on gpt-4.1-nano, not gpt-5-mini, because the Azure AI
  Search tool doesn't support gpt-5.

MEMORY
  Client-side: the full conversation is resent each turn and trimmed to the last
  ~12 messages (bounded history — the same idea the Next.js route uses).

AUTH (keyless)
  az login -> DefaultAzureCredential -> a short-lived Entra token. No keys in repo.

ENV (.env, never committed)
  PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
  AGENT_NAME="{agent_name}"

RUN
  pip install openai azure-identity python-dotenv
  az login
  python src/app/agents/rag-agent-with-grounding-memory/build.py
"""



import os
from dotenv import load_dotenv
from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
import time

load_dotenv()




BASE_URL = f"{os.environ['PROJECT_ENDPOINT'].rstrip('/')}/agents/{os.environ['RAG_AGENT_NAME']}/endpoint/protocols/openai"

client = OpenAI(
      api_key=get_bearer_token_provider(DefaultAzureCredential(), "https://ai.azure.com/.default"),
      base_url=BASE_URL,
      default_query={"api-version": "2025-11-15-preview"},
    )




def chat():
      history = []
      print("Ask about AI Arena. 'exit' to quit.\n")
      while True:
          q = input("you › ").strip()
          if q.lower() in {"exit", "quit", "q"}:
              break
          if not q:
              continue
          history.append({"role": "user", "content": q})
          stream = client.responses.create(input=history,stream=True)
          answer = ""
          print("rag › ", end="", flush=True)
          for event in stream:
              if event.type == "response.output_text.delta":
                  answer += event.delta
                  print(event.delta, end="", flush=True)
                  time.sleep(0.06) 
          print("\n")
          history.append({"role": "assistant", "content": answer})
          history[:] = history[-12:]   # bound memory

if __name__ == "__main__":
    
    chat()
