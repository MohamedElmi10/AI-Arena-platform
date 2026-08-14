# Tile: Function-Calling Agent

The Function-Calling Agent is one step up from the baseline chat agent: it can
call tools. When a question needs a precise answer, the model does not guess — it
asks the server to run a custom tool, gets the result back, and finishes its
reply using that result. It uses the same `gpt-5-mini` deployment as the Foundry
Chat Agent, now with function calling and an async pattern.

A visitor might ask "What time is it right now, and what is 128 × 47?", or
"What's 15% of 340?", or "What time is it in Sweden right now?" The playground
shows a 🔧 line for each tool the model called and what that tool returned, and
the final answer is built from the tool result rather than a guess. Ask
something that needs no tool and it simply answers directly.

Under the hood the answer comes in two steps: the model asks for a tool, the
server runs it, then the model replies using the result. Both the tools and the
secret Azure key run on the server, never in the browser, so the key stays
private. The calculator tool accepts only numbers and math symbols, so it can
never run anything but arithmetic — a small but deliberate safety boundary.
