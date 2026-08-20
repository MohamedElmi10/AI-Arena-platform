"""
build.py — Text Analysis Agent (AI Arena · Natural Language module)

Dev-time artifact. NOT run by the Next.js app — an interactive terminal client
that proves the Foundry-hosted "text-analysis-agent" (Azure Language tool:
sentiment, entities, key phrases) works end to end.

ENV (.env)
  PROJECT_ENDPOINT="YOUR_PROJECT_ENDPOINT"
  TEXT_ANALYSIS_AGENT_NAME= "YOUR_AGENT_NAME"

RUN
  az login
  python src/app/nl/text-analysis-agent/build.py
"""

# --- imports -----------------------------------------------------------------
# TODO: import what you need (os, dotenv.load_dotenv, openai.OpenAI,
#       azure.identity.DefaultAzureCredential / get_bearer_token_provider).
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
import os
from openai import OpenAI

# --- config ------------------------------------------------------------------
# TODO: load_dotenv(); read PROJECT_ENDPOINT + TEXT_ANALYSIS_AGENT_NAME;
#       build the agent BASE_URL (see the rag build.py for the exact shape).


# --- client ------------------------------------------------------------------
# TODO: construct the keyless OpenAI client pointed at the Foundry agent
#       endpoint (bearer token from DefaultAzureCredential, api-version query).

load_dotenv()
PROJECT_ENDPOINT = os.getenv("PROJECT_ENDPOINT")
TEXT_ANALYSIS_AGENT_NAME = os.getenv("TEXT_ANALYSIS_AGENT_NAME")

client= OpenAI(
    api_key=DefaultAzureCredential().get_token("https://ai.azure.com/.default").token,
    base_url=f"{PROJECT_ENDPOINT.rstrip('/')}/agents/{TEXT_ANALYSIS_AGENT_NAME}/endpoint/protocols/openai",
    default_query={"api-version": "2025-11-15-preview"},
)


history = []                                              # holds the whole conversation
while True:                                               # loop until you quit
    text = input("you> ")                                 # read what you type
    history.append({"role": "user", "content": text})     # save your message
    resp = client.responses.create(input=history[-12:])   # send last 12 turns, get reply
    print(resp.output_text)                               # show the reply
    history.append({"role": "assistant", "content": resp.output_text})  # save the reply


# print(response.model_dump_json(indent=2))